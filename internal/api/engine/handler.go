package engine

import (
	"bufio"
	"fmt"
	"strconv"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type Handler struct {
	manager *engine.Manager
	db      *gorm.DB
}

func NewHandler(manager *engine.Manager, db *gorm.DB) *Handler {
	return &Handler{manager: manager, db: db}
}

func (h *Handler) verifyOwnership(c *fiber.Ctx, sessionID uint) error {
	userID := c.Locals("user_id").(uint)
	var session models.Session
	if err := h.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return fmt.Errorf("session not found")
	}
	return nil
}

func (h *Handler) Start(c *fiber.Ctx) error {
	id, err := parseID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.verifyOwnership(c, id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.manager.Start(id); err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "connecting"})
}

func (h *Handler) Stop(c *fiber.Ctx) error {
	id, err := parseID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.verifyOwnership(c, id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.manager.Stop(id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "disconnected"})
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	id, err := parseID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.verifyOwnership(c, id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.manager.Logout(id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "logged_out"})
}

func (h *Handler) QR(c *fiber.Ctx) error {
	id, err := parseID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.verifyOwnership(c, id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	qrCh := h.manager.SubscribeQR(id)
	defer h.manager.UnsubscribeQR(id, qrCh)

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		for {
			select {
			case code := <-qrCh:
				fmt.Fprintf(w, "data: %s\n\n", code)
				w.Flush()
			case <-c.Context().Done():
				return
			}
		}
	})

	return nil
}

func (h *Handler) Status(c *fiber.Ctx) error {
	id, err := parseID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.verifyOwnership(c, id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	var session models.Session
	if err := h.db.Select("status", "phone_number").First(&session, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "session not found"})
	}

	return c.JSON(fiber.Map{
		"status":       session.Status,
		"phone_number": session.PhoneNumber,
	})
}

func parseID(s string) (uint, error) {
	id, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid id")
	}
	return uint(id), nil
}
