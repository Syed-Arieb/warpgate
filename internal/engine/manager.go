package engine

import (
	"context"
	"fmt"
	"sync"

	"github.com/arieb/warpgate/internal/logger"
	"github.com/arieb/warpgate/internal/models"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"gorm.io/gorm"
)

type Manager struct {
	clients  sync.Map
	qrSubs   sync.Map
	events   chan Event
	db       *gorm.DB
	store    *sqlstore.Container
}

func NewManager(db *gorm.DB, container *sqlstore.Container) *Manager {
	m := &Manager{
		db:     db,
		store:  container,
		events: make(chan Event, 100),
	}
	return m
}

func (m *Manager) Start(sessionID uint) error {
	if _, loaded := m.clients.LoadOrStore(sessionID, nil); loaded {
		return fmt.Errorf("session already has an active client")
	}

	var session models.Session
	if err := m.db.First(&session, sessionID).Error; err != nil {
		m.clients.Delete(sessionID)
		return fmt.Errorf("session not found")
	}

	device, err := m.getDevice(&session)
	if err != nil {
		m.clients.Delete(sessionID)
		return fmt.Errorf("get device: %w", err)
	}

	cl := newClient(device, sessionID, session.UserID, m.db, m)
	m.clients.Store(sessionID, cl)

	go func() {
		if err := cl.Connect(); err != nil {
			logger.Log.Error().Err(err).Uint("session_id", sessionID).Msg("connect failed")
			cl.updateStatus(models.SessionStatusDisconnected)
			m.clients.Delete(sessionID)
		}
	}()

	return nil
}

func (m *Manager) Stop(sessionID uint) error {
	val, ok := m.clients.Load(sessionID)
	if !ok {
		return fmt.Errorf("no active client for session")
	}
	m.clients.Delete(sessionID)

	if cl, ok := val.(*Client); ok {
		cl.Disconnect()
	}
	return nil
}

func (m *Manager) Logout(sessionID uint) error {
	val, ok := m.clients.Load(sessionID)
	if !ok {
		return fmt.Errorf("no active client for session")
	}
	m.clients.Delete(sessionID)

	if cl, ok := val.(*Client); ok {
		return cl.Logout()
	}
	return nil
}

func (m *Manager) SubscribeQR(sessionID uint) <-chan string {
	ch := make(chan string, QRBufferSize)
	val, _ := m.qrSubs.LoadOrStore(sessionID, &sync.Map{})
	subs := val.(*sync.Map)
	subs.Store(ch, true)
	return ch
}

func (m *Manager) UnsubscribeQR(sessionID uint, ch <-chan string) {
	val, ok := m.qrSubs.Load(sessionID)
	if !ok {
		return
	}
	subs := val.(*sync.Map)
	subs.Delete(ch)
}

func (m *Manager) broadcastQR(sessionID uint, code string) {
	val, ok := m.qrSubs.Load(sessionID)
	if !ok {
		return
	}
	subs, ok := val.(*sync.Map)
	if !ok {
		return
	}
	subs.Range(func(key, _ interface{}) bool {
		ch, ok := key.(chan string)
		if !ok {
			return true
		}
		select {
		case ch <- code:
		default:
		}
		return true
	})
}

func (m *Manager) broadcastEvent(evt Event) {
	select {
	case m.events <- evt:
	default:
	}
}

func (m *Manager) PublishEvent(evt Event) {
	m.broadcastEvent(evt)
}

func (m *Manager) Events() <-chan Event {
	return m.events
}

func (m *Manager) DisconnectAll() {
	m.clients.Range(func(key, val interface{}) bool {
		m.clients.Delete(key)
		if cl, ok := val.(*Client); ok {
			cl.Disconnect()
		}
		return true
	})
}

func (m *Manager) ActiveCount() int {
	count := 0
	m.clients.Range(func(_, _ interface{}) bool {
		count++
		return true
	})
	return count
}

func (m *Manager) GetClient(sessionID uint) *whatsmeow.Client {
	val, ok := m.clients.Load(sessionID)
	if !ok {
		return nil
	}
	cl, ok := val.(*Client)
	if !ok {
		return nil
	}
	return cl.client
}

func (m *Manager) ReconnectAll() {
	var sessions []models.Session
	m.db.Where("status = ?", models.SessionStatusConnected).Find(&sessions)
	for _, s := range sessions {
		logger.Log.Info().Uint("session_id", s.ID).Msg("reconnecting session on boot")
		if err := m.Start(s.ID); err != nil {
			logger.Log.Error().Err(err).Uint("session_id", s.ID).Msg("reconnect failed")
		}
	}
}

func (m *Manager) getDevice(session *models.Session) (*store.Device, error) {
	if session.DeviceID != nil {
		jid, err := types.ParseJID(*session.DeviceID)
		if err == nil {
			device, err := m.store.GetDevice(context.Background(), jid)
			if err == nil && device != nil {
				return device, nil
			}
		}
	}
	device := m.store.NewDevice()
	if device == nil {
		return nil, fmt.Errorf("failed to create new device")
	}
	return device, nil
}
