package admin

import (
	"strconv"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type Handler struct {
	db        *gorm.DB
	waManager *engine.Manager
}

func NewHandler(db *gorm.DB, waManager *engine.Manager) *Handler {
	return &Handler{db: db, waManager: waManager}
}

func (h *Handler) ListUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var total int64
	h.db.Model(&models.User{}).Count(&total)

	var users []models.User
	offset := (page - 1) * limit
	if err := h.db.Preload("Plan").Order("created_at desc").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if users == nil {
		users = []models.User{}
	}

	return c.JSON(fiber.Map{
		"users": users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *Handler) ListSessions(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	userIDStr := c.Query("user_id")
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var total int64
	query := h.db.Model(&models.Session{})
	if userIDStr != "" {
		query = query.Where("user_id = ?", userIDStr)
	}
	query.Count(&total)

	var sessions []models.Session
	offset := (page - 1) * limit
	q := h.db.Order("created_at desc").Limit(limit).Offset(offset)
	if userIDStr != "" {
		q = q.Where("user_id = ?", userIDStr)
	}
	if err := q.Find(&sessions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if sessions == nil {
		sessions = []models.Session{}
	}

	return c.JSON(fiber.Map{
		"sessions": sessions,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

type systemStats struct {
	TotalUsers       int64 `json:"total_users"`
	TotalSessions    int64 `json:"total_sessions"`
	ConnectedSessions int64 `json:"connected_sessions"`
	TotalMessages    int64 `json:"total_messages"`
	TotalWebhooks    int64 `json:"total_webhooks"`
	ActiveEngines    int   `json:"active_engines"`
}

func (h *Handler) Stats(c *fiber.Ctx) error {
	var stats systemStats
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	h.db.Model(&models.Session{}).Count(&stats.TotalSessions)
	h.db.Model(&models.Session{}).Where("status = ?", models.SessionStatusConnected).Count(&stats.ConnectedSessions)
	h.db.Model(&models.Message{}).Count(&stats.TotalMessages)
	h.db.Model(&models.Webhook{}).Count(&stats.TotalWebhooks)

	stats.ActiveEngines = h.waManager.ActiveCount()

	return c.JSON(stats)
}

func (h *Handler) DeleteSession(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	h.waManager.Stop(uint(id))

	result := h.db.Delete(&models.Session{}, id)
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "session not found"})
	}

	return c.JSON(fiber.Map{"status": "deleted"})
}
