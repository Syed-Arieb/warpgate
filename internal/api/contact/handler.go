package contact

import (
	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *services.ContactService
}

func NewHandler(service *services.ContactService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	sessionID, err := c.ParamsInt("session_id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	contacts, err := h.service.List(c.Context(), userID, uint(sessionID))
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(contacts)
}
