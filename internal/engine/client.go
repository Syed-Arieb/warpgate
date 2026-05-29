package engine

import (
	"context"

	"github.com/arieb/warpgate/internal/logger"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/types/events"
	"gorm.io/gorm"
)

type Client struct {
	client    *whatsmeow.Client
	sessionID uint
	userID    uint
	db        *gorm.DB
	manager   *Manager
}

func newClient(device *store.Device, sessionID, userID uint, db *gorm.DB, manager *Manager) *Client {
	cl := whatsmeow.NewClient(device, nil)
	c := &Client{
		client:    cl,
		sessionID: sessionID,
		userID:    userID,
		db:        db,
		manager:   manager,
	}
	cl.AddEventHandler(c.handleEvent)
	return c
}

func (c *Client) Connect() error {
	if c.client.Store != nil && c.client.Store.ID != nil {
		c.updateStatus(models.SessionStatusConnecting)
	}

	return c.client.Connect()
}

func (c *Client) Disconnect() {
	c.client.Disconnect()
	c.updateStatus(models.SessionStatusDisconnected)
}

func (c *Client) Logout() error {
	c.client.Disconnect()
	if err := c.client.Logout(context.Background()); err != nil {
		return err
	}
	c.updateStatus(models.SessionStatusDisconnected)
	clearDeviceID(c.db, c.sessionID)
	return nil
}

func (c *Client) handleEvent(raw interface{}) {
	switch evt := raw.(type) {
	case *events.QR:
		logger.Log.Info().Uint("session_id", c.sessionID).Msg("QR code received")
		for _, code := range evt.Codes {
			c.manager.broadcastQR(c.sessionID, code)
		}

	case *events.Connected:
		logger.Log.Info().Uint("session_id", c.sessionID).Msg("connected")
		c.updateStatus(models.SessionStatusConnected)

		if jid := c.client.Store.ID; jid != nil {
			saveDeviceID(c.db, c.sessionID, jid.String())
		}
		c.manager.broadcastEvent(Event{Type: EventConnected, SessionID: c.sessionID})

	case *events.Disconnected:
		logger.Log.Info().Uint("session_id", c.sessionID).Msg("disconnected")
		c.updateStatus(models.SessionStatusDisconnected)
		c.manager.broadcastEvent(Event{Type: EventDisconnected, SessionID: c.sessionID})

	case *events.LoggedOut:
		logger.Log.Info().Uint("session_id", c.sessionID).Msg("logged out")
		c.updateStatus(models.SessionStatusDisconnected)
		clearDeviceID(c.db, c.sessionID)
		c.manager.broadcastEvent(Event{Type: EventLoggedOut, SessionID: c.sessionID})

	case *events.Message:
		if evt.Info.IsFromMe {
			return
		}
		if evt.Message == nil {
			return
		}
		msgType := models.MessageTypeText
		var content *string
		if evt.Message.Conversation != nil {
			content = evt.Message.Conversation
		} else if ext := evt.Message.ExtendedTextMessage; ext != nil && ext.Text != nil {
			content = ext.Text
		} else if evt.Message.ImageMessage != nil {
			msgType = models.MessageTypeImage
		} else if evt.Message.VideoMessage != nil {
			msgType = models.MessageTypeVideo
		} else if evt.Message.AudioMessage != nil {
			msgType = models.MessageTypeAudio
		} else if evt.Message.DocumentMessage != nil {
			msgType = models.MessageTypeDocument
		}
		fromJID := evt.Info.Sender.String()
		toJID := evt.Info.Chat.String()
		dbMsg := models.Message{
			SessionID:   c.sessionID,
			UserID:      c.userID,
			Direction:   models.MessageDirectionIn,
			FromJID:     fromJID,
			ToJID:       toJID,
			MessageType: msgType,
			Content:     content,
			Status:      models.MessageStatusDelivered,
		}
		if evt.Info.ID != "" {
			dbMsg.WAID = &evt.Info.ID
		}
		if err := c.db.Create(&dbMsg).Error; err != nil {
			logger.Log.Error().Err(err).Uint("session_id", c.sessionID).Msg("store incoming message")
		}
		dbMsgCopy := dbMsg
		c.manager.PublishEvent(Event{Type: EventMessage, SessionID: c.sessionID, Data: &dbMsgCopy})

	case *events.Receipt:
		var status string
		switch evt.Type {
		case events.ReceiptTypeDelivered:
			status = models.MessageStatusDelivered
		case events.ReceiptTypeRead:
			status = models.MessageStatusRead
		default:
			return
		}
		for _, msgID := range evt.MessageIDs {
			if err := c.db.Model(&models.Message{}).
				Where("session_id = ? AND wa_id = ?", c.sessionID, msgID).
				Update("status", status).Error; err != nil {
				logger.Log.Error().Err(err).Uint("session_id", c.sessionID).Str("wa_id", msgID).Msg("update receipt")
			}
		}
		c.manager.PublishEvent(Event{Type: EventReceipt, SessionID: c.sessionID, Data: status})
	}
}

func (c *Client) updateStatus(status string) {
	c.db.Model(&models.Session{}).Where("id = ?", c.sessionID).Update("status", status)
}

func saveDeviceID(db *gorm.DB, sessionID uint, deviceID string) {
	db.Model(&models.Session{}).Where("id = ?", sessionID).Update("device_id", deviceID)
}

func clearDeviceID(db *gorm.DB, sessionID uint) {
	db.Model(&models.Session{}).Where("id = ?", sessionID).Update("device_id", nil)
}
