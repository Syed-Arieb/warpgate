package message

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

type MediaInput struct {
	Data        io.Reader
	FileName    string
	MimeType    string
	Caption     string
	MediaType   whatsmeow.MediaType
	MessageType string
}

func (s *Service) SendMedia(ctx context.Context, userID, sessionID uint, to string, input *MediaInput) (*models.Message, error) {
	cl, err := s.getClient(sessionID, userID)
	if err != nil {
		return nil, err
	}

	jid, err := parseJID(to)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient: %w", err)
	}

	data, err := io.ReadAll(input.Data)
	if err != nil {
		return nil, fmt.Errorf("read data: %w", err)
	}

	uploaded, err := cl.Upload(ctx, data, input.MediaType)
	if err != nil {
		return nil, fmt.Errorf("upload media: %w", err)
	}

	msg := buildMediaMessage(input, &uploaded, data)

	resp, err := cl.SendMessage(ctx, jid, msg)
	if err != nil {
		dbMsg := &models.Message{
			SessionID:     sessionID,
			UserID:        userID,
			Direction:     models.MessageDirectionOut,
			FromJID:       cl.Store.ID.String(),
			ToJID:         jid.String(),
			MessageType:   input.MessageType,
			Status:        models.MessageStatusFailed,
			ErrorCode:     strPtr(err.Error()),
			MediaMimeType: &input.MimeType,
			MediaSize:     int64Ptr(int64(len(data))),
		}
		if input.Caption != "" {
			dbMsg.Content = &input.Caption
		}
		s.db.Create(dbMsg)
		return nil, fmt.Errorf("send media: %w", err)
	}

	now := time.Now()
	dbMsg := &models.Message{
		SessionID:     sessionID,
		UserID:        userID,
		Direction:     models.MessageDirectionOut,
		FromJID:       cl.Store.ID.String(),
		ToJID:         jid.String(),
		MessageType:   input.MessageType,
		WAID:          &resp.ID,
		Status:        models.MessageStatusSent,
		SentAt:        &now,
		MediaMimeType: &input.MimeType,
		MediaSize:     int64Ptr(int64(len(data))),
	}
	if input.Caption != "" {
		dbMsg.Content = &input.Caption
	}

	if err := s.store.Upload(fmt.Sprintf("%d/%s", sessionID, resp.ID), input.Data); err == nil {
		url, _ := s.store.URL(fmt.Sprintf("%d/%s", sessionID, resp.ID))
		dbMsg.MediaURL = &url
	}

	s.db.Create(dbMsg)
	s.manager.PublishEvent(engine.Event{Type: engine.EventMessage, SessionID: sessionID, Data: "sent"})
	return dbMsg, nil
}

func buildMediaMessage(input *MediaInput, uploaded *whatsmeow.UploadResponse, data []byte) *waE2E.Message {
	switch input.MessageType {
	case models.MessageTypeImage:
		return &waE2E.Message{
			ImageMessage: &waE2E.ImageMessage{
				URL:           &uploaded.URL,
				DirectPath:    &uploaded.DirectPath,
				MediaKey:      uploaded.MediaKey,
				Mimetype:      &input.MimeType,
				FileEncSHA256: uploaded.FileEncSHA256,
				FileSHA256:    uploaded.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
				Caption:       &input.Caption,
			},
		}
	case models.MessageTypeVideo:
		return &waE2E.Message{
			VideoMessage: &waE2E.VideoMessage{
				URL:           &uploaded.URL,
				DirectPath:    &uploaded.DirectPath,
				MediaKey:      uploaded.MediaKey,
				Mimetype:      &input.MimeType,
				FileEncSHA256: uploaded.FileEncSHA256,
				FileSHA256:    uploaded.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
				Caption:       &input.Caption,
			},
		}
	case models.MessageTypeAudio:
		return &waE2E.Message{
			AudioMessage: &waE2E.AudioMessage{
				URL:           &uploaded.URL,
				DirectPath:    &uploaded.DirectPath,
				MediaKey:      uploaded.MediaKey,
				Mimetype:      &input.MimeType,
				FileEncSHA256: uploaded.FileEncSHA256,
				FileSHA256:    uploaded.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
			},
		}
	default:
		return &waE2E.Message{
			DocumentMessage: &waE2E.DocumentMessage{
				URL:           &uploaded.URL,
				DirectPath:    &uploaded.DirectPath,
				MediaKey:      uploaded.MediaKey,
				Mimetype:      &input.MimeType,
				FileEncSHA256: uploaded.FileEncSHA256,
				FileSHA256:    uploaded.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
				Title:         &input.FileName,
				FileName:      &input.FileName,
			},
		}
	}
}

func int64Ptr(i int64) *int64 {
	return &i
}
