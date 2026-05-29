package jobs

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/logger"
	"github.com/arieb/warpgate/internal/models"
	"github.com/arieb/warpgate/internal/services"
	"gorm.io/gorm"
)

type Dispatcher struct {
	db      *gorm.DB
	manager *engine.Manager
	svc     *services.WebhookService
	client  *http.Client
	ctx     context.Context
	cancel  context.CancelFunc
}

func NewDispatcher(db *gorm.DB, manager *engine.Manager) *Dispatcher {
	ctx, cancel := context.WithCancel(context.Background())
	return &Dispatcher{
		db:      db,
		manager: manager,
		svc:     services.NewWebhookService(db),
		client: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:    20,
				IdleConnTimeout: 30 * time.Second,
			},
		},
		ctx:    ctx,
		cancel: cancel,
	}
}

func (d *Dispatcher) Start() {
	go d.loop()
	logger.Log.Info().Msg("webhook dispatcher started")
}

func (d *Dispatcher) Stop() {
	d.cancel()
	logger.Log.Info().Msg("webhook dispatcher stopped")
}

func (d *Dispatcher) loop() {
	ch := d.manager.Events()
	for {
		select {
		case <-d.ctx.Done():
			return
		case evt, ok := <-ch:
			if !ok {
				return
			}
			d.processEvent(evt)
		}
	}
}

func (d *Dispatcher) processEvent(evt engine.Event) {
	webhookEvent := engineEventToWebhook(evt)
	if webhookEvent == "" {
		return
	}

	var session models.Session
	if err := d.db.First(&session, evt.SessionID).Error; err != nil {
		return
	}

	var user models.User
	if err := d.db.Preload("Plan").First(&user, session.UserID).Error; err != nil {
		return
	}

	var todayDeliveries int64
	todayStart := time.Now().Truncate(24 * time.Hour)
	d.db.Model(&models.WebhookLog{}).
		Joins("JOIN webhooks ON webhooks.id = webhook_logs.webhook_id").
		Where("webhooks.user_id = ? AND webhook_logs.created_at >= ?", user.ID, todayStart).
		Count(&todayDeliveries)
	if todayDeliveries >= int64(user.Plan.MaxWebhookDeliveries) {
		logger.Log.Warn().
			Uint("user_id", user.ID).
			Int64("limit", int64(user.Plan.MaxWebhookDeliveries)).
			Msg("webhook delivery quota exceeded, skipping")
		return
	}

	webhooks, err := d.svc.GetActiveBySession(evt.SessionID)
	if err != nil || len(webhooks) == 0 {
		return
	}

	for _, wh := range webhooks {
		if !d.svc.SubscribesTo(&wh, webhookEvent) {
			continue
		}
		go d.dispatchWithRetry(&wh, webhookEvent, evt)
	}
}

type webhookPayload struct {
	Event     string      `json:"event"`
	SessionID uint        `json:"session_id"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

func (d *Dispatcher) dispatchWithRetry(wh *models.Webhook, eventName string, evt engine.Event) {
	evtCopy := evt
	payload := webhookPayload{
		Event:     eventName,
		SessionID: evtCopy.SessionID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data:      evtCopy.Data,
	}

	payloadBytes, _ := json.Marshal(payload)
	maxAttempts := 5

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		statusCode, respBody, err := d.send(wh, payloadBytes)
		success := err == nil && statusCode >= 200 && statusCode < 300

		whLog := models.WebhookLog{
			WebhookID:      wh.ID,
			EventType:      eventName,
			Payload:        string(payloadBytes),
			ResponseStatus: statusCode,
			ResponseBody:   respBody,
			Attempt:        attempt,
			MaxAttempts:    maxAttempts,
			Success:        success,
		}
		if err != nil {
			whLog.Error = err.Error()
		}
		d.db.Create(&whLog)

		if success {
			return
		}

		if attempt < maxAttempts {
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second
			logger.Log.Warn().Str("event", eventName).Uint("webhook_id", wh.ID).
				Int("attempt", attempt).Dur("backoff", backoff).Msg("webhook delivery failed, retrying")

			select {
			case <-d.ctx.Done():
				return
			case <-time.After(backoff):
			}
		} else {
			logger.Log.Error().Str("event", eventName).Uint("webhook_id", wh.ID).
				Int("attempt", attempt).Msg("webhook delivery failed, max attempts reached")
		}
	}
}

func (d *Dispatcher) send(wh *models.Webhook, payload []byte) (int, string, error) {
	sig := signPayload(payload, wh.Secret)

	req, err := http.NewRequestWithContext(d.ctx, http.MethodPost, wh.URL, bytes.NewReader(payload))
	if err != nil {
		return 0, "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Warpgate-Signature-256", sig)
	req.Header.Set("User-Agent", "Warpgate-Webhook/1.0")

	resp, err := d.client.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 65536))
	return resp.StatusCode, string(body), nil
}

func signPayload(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func engineEventToWebhook(evt engine.Event) string {
	switch evt.Type {
	case engine.EventConnected:
		return models.WebhookEventSessionConnected
	case engine.EventDisconnected:
		return models.WebhookEventSessionDisconnected
	case engine.EventLoggedOut:
		return models.WebhookEventSessionDisconnected
	case engine.EventQR:
		return models.WebhookEventSessionQR
	case engine.EventMessage:
		if data, ok := evt.Data.(string); ok {
			if data == "sent" {
				return models.WebhookEventMessageSent
			}
		}
		return models.WebhookEventMessageReceived
	case engine.EventReceipt:
		if data, ok := evt.Data.(string); ok {
			switch data {
			case models.MessageStatusDelivered:
				return models.WebhookEventMessageDelivered
			case models.MessageStatusRead:
				return models.WebhookEventMessageRead
			}
		}
		return ""
	default:
		return ""
	}
}
