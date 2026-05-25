package message

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

type BulkResult struct {
	Recipient string           `json:"recipient"`
	Message   *models.Message  `json:"message,omitempty"`
	Error     string           `json:"error,omitempty"`
}

const bulkRateLimit = 5

func (s *Service) SendBulk(ctx context.Context, userID, sessionID uint, recipients []string, text string) ([]BulkResult, error) {
	cl, err := s.getClient(sessionID, userID)
	if err != nil {
		return nil, err
	}

	results := make([]BulkResult, 0, len(recipients))
	var mu sync.Mutex
	sem := make(chan struct{}, bulkRateLimit)
	var wg sync.WaitGroup

	for _, recipient := range recipients {
		wg.Add(1)
		sem <- struct{}{}

		go func(to string) {
			defer wg.Done()
			defer func() { <-sem }()

			jid, err := parseJID(to)
			if err != nil {
				mu.Lock()
				results = append(results, BulkResult{Recipient: to, Error: fmt.Sprintf("invalid jid: %v", err)})
				mu.Unlock()
				return
			}

			msg := &models.Message{
				SessionID:   sessionID,
				UserID:      userID,
				Direction:   models.MessageDirectionOut,
				FromJID:     cl.Store.ID.String(),
				ToJID:       jid.String(),
				MessageType: models.MessageTypeText,
				Content:     &text,
			}

			waMsg := buildTextMessage(text)
			resp, err := cl.SendMessage(ctx, jid, waMsg)
			if err != nil {
				msg.Status = models.MessageStatusFailed
				msg.ErrorCode = strPtr(err.Error())
				s.db.Create(msg)
				mu.Lock()
				results = append(results, BulkResult{Recipient: to, Error: err.Error()})
				mu.Unlock()
				return
			}

			now := time.Now()
			msg.WAID = &resp.ID
			msg.Status = models.MessageStatusSent
			msg.SentAt = &now
			s.db.Create(msg)
			s.manager.PublishEvent(engine.Event{Type: engine.EventMessage, SessionID: sessionID, Data: "sent"})

			mu.Lock()
			results = append(results, BulkResult{Recipient: to, Message: msg})
			mu.Unlock()
		}(recipient)
	}

	wg.Wait()
	return results, nil
}

func buildTextMessage(text string) *waE2E.Message {
	return &waE2E.Message{
		Conversation: proto.String(text),
	}
}
