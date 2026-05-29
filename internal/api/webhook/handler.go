package webhook

import (
	"fmt"
	"strconv"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *services.WebhookService
}

func NewHandler(service *services.WebhookService) *Handler {
	return &Handler{service: service}
}

func getUserID(c *fiber.Ctx) (uint, error) {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return 0, fmt.Errorf("unauthorized")
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		return 0, fmt.Errorf("invalid user context")
	}
	return userID, nil
}

func parseWebhookID(c *fiber.Ctx) (sessionID, webhookID uint, err error) {
	sid, e := strconv.ParseUint(	c.Params("id"), 10, 64)
	if e != nil {
		return 0, 0, fiber.NewError(fiber.StatusBadRequest, "invalid session_id")
	}
	wid, e := strconv.ParseUint(c.Params("webhook_id"), 10, 64)
	if e != nil {
		return 0, 0, fiber.NewError(fiber.StatusBadRequest, "invalid webhook_id")
	}
	return uint(sid), uint(wid), nil
}

func (h *Handler) Create(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID, err := strconv.ParseUint(	c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	var input services.CreateWebhookInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	webhook, err := h.service.Create(userID, uint(sessionID), input)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not found" {
			status = fiber.StatusNotFound
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(webhook)
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID, err := strconv.ParseUint(	c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	webhooks, err := h.service.List(userID, uint(sessionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(webhooks)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID, webhookID, err := parseWebhookID(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	webhook, err := h.service.Get(userID, sessionID, webhookID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(webhook)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID, webhookID, err := parseWebhookID(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var input services.UpdateWebhookInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	webhook, err := h.service.Update(userID, sessionID, webhookID, input)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(webhook)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID, webhookID, err := parseWebhookID(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.service.Delete(userID, sessionID, webhookID); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) GetLogs(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID, webhookID, err := parseWebhookID(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	result, err := h.service.GetLogs(userID, sessionID, webhookID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}
