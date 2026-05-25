package services

import (
	"context"
	"fmt"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"gorm.io/gorm"
)

type ContactService struct {
	db      *gorm.DB
	manager *engine.Manager
}

func NewContactService(db *gorm.DB, manager *engine.Manager) *ContactService {
	return &ContactService{db: db, manager: manager}
}

func (s *ContactService) List(ctx context.Context, userID, sessionID uint) ([]models.Contact, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}

	cl := s.manager.GetClient(sessionID)
	if cl == nil {
		return nil, fmt.Errorf("session not connected")
	}

	contacts, err := cl.Store.Contacts.GetAllContacts(ctx)
	if err != nil {
		return nil, fmt.Errorf("get contacts: %w", err)
	}

	var result []models.Contact
	for jid, contact := range contacts {
		c := models.Contact{
			SessionID: sessionID,
			UserID:    userID,
			JID:       jid.String(),
			Name:      contact.FullName,
			PushName:  contact.PushName,
		}
		s.db.Where("session_id = ? AND jid = ?", sessionID, jid.String()).
			Assign(c).
			FirstOrCreate(&c)
		result = append(result, c)
	}

	if result == nil {
		result = []models.Contact{}
	}
	return result, nil
}
