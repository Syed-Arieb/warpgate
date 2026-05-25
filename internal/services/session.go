package services

import (
	"fmt"

	"github.com/arieb/warpgate/internal/models"
	"gorm.io/gorm"
)

type SessionService struct {
	db *gorm.DB
}

func NewSessionService(db *gorm.DB) *SessionService {
	return &SessionService{db: db}
}

type CreateSessionInput struct {
	Name string `json:"name"`
}

type UpdateSessionInput struct {
	Name        *string `json:"name"`
	PhoneNumber *string `json:"phone_number"`
	ProxyConfig *string `json:"proxy_config"`
}

func (s *SessionService) Create(userID uint, input CreateSessionInput) (*models.Session, error) {
	if err := ValidateName(input.Name); err != nil {
		return nil, err
	}

	var user models.User
	if err := s.db.Preload("Plan").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	var count int64
	s.db.Model(&models.Session{}).Where("user_id = ?", userID).Count(&count)
	if count >= int64(user.Plan.MaxSessions) {
		return nil, fmt.Errorf("%w: max %d sessions", ErrPlanLimitExceeded, user.Plan.MaxSessions)
	}

	session := models.Session{
		UserID: userID,
		Name:   input.Name,
		Status: models.SessionStatusDisconnected,
	}

	if err := s.db.Create(&session).Error; err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	return &session, nil
}

func (s *SessionService) List(userID uint) ([]models.Session, error) {
	var sessions []models.Session
	if err := s.db.Where("user_id = ?", userID).Order("created_at desc").Find(&sessions).Error; err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	return sessions, nil
}

func (s *SessionService) Get(userID, sessionID uint) (*models.Session, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}
	return &session, nil
}

func (s *SessionService) Update(userID, sessionID uint, input UpdateSessionInput) (*models.Session, error) {
	session, err := s.Get(userID, sessionID)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		if err := ValidateName(*input.Name); err != nil {
			return nil, err
		}
		session.Name = *input.Name
	}
	if input.PhoneNumber != nil {
		session.PhoneNumber = input.PhoneNumber
	}
	if input.ProxyConfig != nil {
		session.ProxyConfig = input.ProxyConfig
	}

	if err := s.db.Save(&session).Error; err != nil {
		return nil, fmt.Errorf("update session: %w", err)
	}

	return session, nil
}

func (s *SessionService) Delete(userID, sessionID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", sessionID, userID).Delete(&models.Session{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("session not found")
	}
	return result.Error
}
