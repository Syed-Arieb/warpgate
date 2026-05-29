package services

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"

	"github.com/arieb/warpgate/internal/models"
	"gorm.io/gorm"
)

type WebhookService struct {
	db *gorm.DB
}

func NewWebhookService(db *gorm.DB) *WebhookService {
	return &WebhookService{db: db}
}

type CreateWebhookInput struct {
	Name   string   `json:"name"`
	URL    string   `json:"url"`
	Secret string   `json:"secret"`
	Events []string `json:"events"`
}

type UpdateWebhookInput struct {
	Name   *string   `json:"name,omitempty"`
	URL    *string   `json:"url,omitempty"`
	Secret *string   `json:"secret,omitempty"`
	Events *[]string `json:"events,omitempty"`
	Active *bool     `json:"active,omitempty"`
}

func generateSecret() string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 32)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		b[i] = chars[n.Int64()]
	}
	return string(b)
}

func validateEvents(events []string) error {
	valid := make(map[string]bool)
	for _, e := range models.AllWebhookEvents {
		valid[e] = true
	}
	for _, e := range events {
		if !valid[e] {
			return fmt.Errorf("invalid event: %s", e)
		}
	}
	return nil
}

func (s *WebhookService) Create(userID, sessionID uint, input CreateWebhookInput) (*models.Webhook, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}

	var user models.User
	if err := s.db.Preload("Plan").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	var count int64
	s.db.Model(&models.Webhook{}).Where("user_id = ?", userID).Count(&count)
	if count >= int64(user.Plan.MaxWebhooks) {
		return nil, fmt.Errorf("%w: max %d webhooks", ErrPlanLimitExceeded, user.Plan.MaxWebhooks)
	}

	if input.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if input.URL == "" {
		return nil, fmt.Errorf("url is required")
	}
	if len(input.Events) == 0 {
		return nil, fmt.Errorf("at least one event is required")
	}
	if err := validateEvents(input.Events); err != nil {
		return nil, err
	}

	secret := input.Secret
	if secret == "" {
		secret = generateSecret()
	}

	eventsJSON, _ := json.Marshal(input.Events)

	webhook := models.Webhook{
		SessionID: sessionID,
		UserID:    userID,
		Name:      input.Name,
		URL:       input.URL,
		Secret:    secret,
		Events:    string(eventsJSON),
		Active:    true,
	}

	if err := s.db.Create(&webhook).Error; err != nil {
		return nil, fmt.Errorf("create webhook: %w", err)
	}

	return &webhook, nil
}

func (s *WebhookService) List(userID, sessionID uint) ([]models.Webhook, error) {
	var webhooks []models.Webhook
	if err := s.db.Where("user_id = ? AND session_id = ?", userID, sessionID).
		Order("created_at desc").Find(&webhooks).Error; err != nil {
		return nil, fmt.Errorf("list webhooks: %w", err)
	}
	return webhooks, nil
}

func (s *WebhookService) Get(userID, sessionID, webhookID uint) (*models.Webhook, error) {
	var wh models.Webhook
	if err := s.db.Where("id = ? AND user_id = ? AND session_id = ?", webhookID, userID, sessionID).
		First(&wh).Error; err != nil {
		return nil, fmt.Errorf("webhook not found")
	}
	return &wh, nil
}

func (s *WebhookService) Update(userID, sessionID, webhookID uint, input UpdateWebhookInput) (*models.Webhook, error) {
	wh, err := s.Get(userID, sessionID, webhookID)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		wh.Name = *input.Name
	}
	if input.URL != nil {
		wh.URL = *input.URL
	}
	if input.Secret != nil {
		wh.Secret = *input.Secret
	}
	if input.Active != nil {
		wh.Active = *input.Active
	}
	if input.Events != nil {
		if err := validateEvents(*input.Events); err != nil {
			return nil, err
		}
		eventsJSON, _ := json.Marshal(*input.Events)
		wh.Events = string(eventsJSON)
	}

	if err := s.db.Save(&wh).Error; err != nil {
		return nil, fmt.Errorf("update webhook: %w", err)
	}

	return wh, nil
}

func (s *WebhookService) Delete(userID, sessionID, webhookID uint) error {
	result := s.db.Where("id = ? AND user_id = ? AND session_id = ?", webhookID, userID, sessionID).
		Delete(&models.Webhook{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("webhook not found")
	}
	return result.Error
}

type PaginatedWebhookLogs struct {
	Logs  []models.WebhookLog `json:"logs"`
	Total int64               `json:"total"`
	Page  int                 `json:"page"`
	Limit int                 `json:"limit"`
}

func (s *WebhookService) GetLogs(userID, sessionID, webhookID uint, page, limit int) (*PaginatedWebhookLogs, error) {
	if _, err := s.Get(userID, sessionID, webhookID); err != nil {
		return nil, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var total int64
	s.db.Model(&models.WebhookLog{}).Where("webhook_id = ?", webhookID).Count(&total)

	var logs []models.WebhookLog
	offset := (page - 1) * limit
	if err := s.db.Where("webhook_id = ?", webhookID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("list logs: %w", err)
	}

	if logs == nil {
		logs = []models.WebhookLog{}
	}

	return &PaginatedWebhookLogs{
		Logs:  logs,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *WebhookService) GetActiveBySession(sessionID uint) ([]models.Webhook, error) {
	var webhooks []models.Webhook
	if err := s.db.Where("session_id = ? AND active = ?", sessionID, true).
		Find(&webhooks).Error; err != nil {
		return nil, fmt.Errorf("get active webhooks: %w", err)
	}
	return webhooks, nil
}

func (s *WebhookService) SubscribesTo(wh *models.Webhook, event string) bool {
	var events []string
	if err := json.Unmarshal([]byte(wh.Events), &events); err != nil {
		return false
	}
	for _, e := range events {
		if e == event || strings.HasPrefix(event, e) {
			return true
		}
	}
	return false
}
