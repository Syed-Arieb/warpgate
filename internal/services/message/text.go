package message

import (
	"context"
	"fmt"
	"time"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

func (s *Service) SendText(ctx context.Context, userID, sessionID uint, to, text string) (*models.Message, error) {
	cl, err := s.getClient(sessionID, userID)
	if err != nil {
		return nil, err
	}

	jid, err := parseJID(to)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient: %w", err)
	}

	msg := &waE2E.Message{
		Conversation: proto.String(text),
	}

	resp, err := cl.SendMessage(ctx, jid, msg)
	if err != nil {
		dbMsg := &models.Message{
			SessionID:   sessionID,
			UserID:      userID,
			Direction:   models.MessageDirectionOut,
			FromJID:     cl.Store.ID.String(),
			ToJID:       jid.String(),
			MessageType: models.MessageTypeText,
			Content:     &text,
			Status:      models.MessageStatusFailed,
			ErrorCode:   strPtr(err.Error()),
		}
		s.db.Create(dbMsg)
		return nil, fmt.Errorf("send message: %w", err)
	}

	now := time.Now()
	dbMsg := &models.Message{
		SessionID:   sessionID,
		UserID:      userID,
		Direction:   models.MessageDirectionOut,
		FromJID:     cl.Store.ID.String(),
		ToJID:       jid.String(),
		MessageType: models.MessageTypeText,
		Content:     &text,
		WAID:        &resp.ID,
		Status:      models.MessageStatusSent,
		SentAt:      &now,
	}
	s.db.Create(dbMsg)
	s.manager.PublishEvent(engine.Event{Type: engine.EventMessage, SessionID: sessionID, Data: "sent"})
	return dbMsg, nil
}

func strPtr(s string) *string {
	return &s
}
