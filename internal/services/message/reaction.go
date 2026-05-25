package message

import (
	"context"
	"fmt"
	"time"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow/proto/waCommon"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

func (s *Service) SendReaction(ctx context.Context, userID, sessionID uint, to, targetMsgID, emoji string) (*models.Message, error) {
	cl, err := s.getClient(sessionID, userID)
	if err != nil {
		return nil, err
	}

	jid, err := parseJID(to)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient: %w", err)
	}

	msg := &waE2E.Message{
		ReactionMessage: &waE2E.ReactionMessage{
			Key: &waCommon.MessageKey{
				RemoteJID: proto.String(jid.String()),
				FromMe:    proto.Bool(false),
				ID:        proto.String(targetMsgID),
			},
			Text:              proto.String(emoji),
			GroupingKey:       proto.String(emoji),
			SenderTimestampMS: proto.Int64(time.Now().UnixMilli()),
		},
	}

	resp, err := cl.SendMessage(ctx, jid, msg)
	if err != nil {
		return nil, fmt.Errorf("send reaction: %w", err)
	}

	now := time.Now()
	content := fmt.Sprintf("reacted with %s to %s", emoji, targetMsgID)
	dbMsg := &models.Message{
		SessionID:   sessionID,
		UserID:      userID,
		Direction:   models.MessageDirectionOut,
		FromJID:     cl.Store.ID.String(),
		ToJID:       jid.String(),
		MessageType: models.MessageTypeReaction,
		Content:     &content,
		WAID:        &resp.ID,
		Status:      models.MessageStatusSent,
		SentAt:      &now,
	}
	s.db.Create(dbMsg)
	s.manager.PublishEvent(engine.Event{Type: engine.EventMessage, SessionID: sessionID, Data: "sent"})
	return dbMsg, nil
}
