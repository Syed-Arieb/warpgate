package message

import (
	"context"
	"fmt"

	"github.com/arieb/warpgate/internal/models"
)

type PaginatedMessages struct {
	Messages []models.Message `json:"messages"`
	Total    int64            `json:"total"`
	Page     int              `json:"page"`
	Limit    int              `json:"limit"`
}

func (s *Service) GetHistory(ctx context.Context, userID, sessionID uint, page, limit int) (*PaginatedMessages, error) {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found")
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var total int64
	s.db.Model(&models.Message{}).Where("session_id = ?", sessionID).Count(&total)

	var messages []models.Message
	offset := (page - 1) * limit
	if err := s.db.Where("session_id = ?", sessionID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&messages).Error; err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}

	return &PaginatedMessages{
		Messages: messages,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}
