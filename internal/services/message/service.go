package message

import (
	"fmt"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"github.com/arieb/warpgate/internal/storage"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"gorm.io/gorm"
)

type Service struct {
	db      *gorm.DB
	manager *engine.Manager
	store   storage.Adapter
}

func NewService(db *gorm.DB, manager *engine.Manager, store storage.Adapter) *Service {
	return &Service{db: db, manager: manager, store: store}
}

func (s *Service) getClient(sessionID, userID uint) (*whatsmeow.Client, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}
	cl := s.manager.GetClient(sessionID)
	if cl == nil {
		return nil, fmt.Errorf("session not connected")
	}
	return cl, nil
}

func parseJID(raw string) (types.JID, error) {
	return types.ParseJID(raw)
}
