package services

import (
	"encoding/json"
	"fmt"

	"github.com/arieb/warpgate/internal/models"
	"gorm.io/gorm"
)

type AuditService struct {
	db *gorm.DB
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

type AuditInput struct {
	Action     string
	Resource   string
	ResourceID string
	IP         string
	UserAgent  string
	Metadata   map[string]interface{}
}

func (s *AuditService) Log(userID uint, input AuditInput) {
	metaJSON := ""
	if len(input.Metadata) > 0 {
		b, _ := json.Marshal(input.Metadata)
		metaJSON = string(b)
	}

	entry := models.AuditLog{
		UserID:     userID,
		Action:     input.Action,
		Resource:   input.Resource,
		ResourceID: input.ResourceID,
		IP:         input.IP,
		UserAgent:  input.UserAgent,
		Metadata:   metaJSON,
	}
	s.db.Create(&entry)
}

type PaginatedAuditLogs struct {
	Logs  []models.AuditLog `json:"logs"`
	Total int64              `json:"total"`
	Page  int                `json:"page"`
	Limit int                `json:"limit"`
}

func (s *AuditService) List(userID uint, page, limit int) (*PaginatedAuditLogs, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var total int64
	s.db.Model(&models.AuditLog{}).Where("user_id = ?", userID).Count(&total)

	var logs []models.AuditLog
	offset := (page - 1) * limit
	if err := s.db.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("list audit logs: %w", err)
	}
	if logs == nil {
		logs = []models.AuditLog{}
	}

	return &PaginatedAuditLogs{
		Logs:  logs,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}
