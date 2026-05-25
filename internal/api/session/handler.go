package session

import (
	"errors"
	"strconv"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	sessionService *services.SessionService
}

func NewHandler(sessionService *services.SessionService) *Handler {
	return &Handler{sessionService: sessionService}
}

func (h *Handler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var input services.CreateSessionInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if input.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "name is required",
		})
	}

	session, err := h.sessionService.Create(userID, input)
	if err != nil {
		status := fiber.StatusInternalServerError
		if errors.Is(err, services.ErrPlanLimitExceeded) {
			status = fiber.StatusForbidden
		}
		return c.Status(status).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(session)
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	sessions, err := h.sessionService.List(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(sessions)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid id",
		})
	}

	session, err := h.sessionService.Get(userID, uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(session)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid id",
		})
	}

	var input services.UpdateSessionInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	session, err := h.sessionService.Update(userID, uint(id), input)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(session)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid id",
		})
	}

	if err := h.sessionService.Delete(userID, uint(id)); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
