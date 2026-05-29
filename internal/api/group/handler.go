package group

import (
	"fmt"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *services.GroupService
}

func NewHandler(service *services.GroupService) *Handler {
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

func (h *Handler) List(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	sessionID, err := c.ParamsInt("session_id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	groups, err := h.service.List(c.Context(), userID, uint(sessionID))
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(groups)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	sessionID, err := c.ParamsInt("session_id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	groupID := c.Params("group_id")
	if groupID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "group_id is required"})
	}

	group, err := h.service.Get(c.Context(), userID, uint(sessionID), groupID)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(group)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	sessionID, err := c.ParamsInt("session_id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	var input services.CreateGroupInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	if input.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	group, err := h.service.Create(c.Context(), userID, uint(sessionID), input)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(group)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	sessionID, err := c.ParamsInt("session_id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	groupID := c.Params("group_id")
	if groupID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "group_id is required"})
	}

	if err := h.service.Delete(c.Context(), userID, uint(sessionID), groupID); err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
