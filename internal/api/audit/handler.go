package audit

import (
	"strconv"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc *services.AuditService
}

func NewHandler(svc *services.AuditService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	result, err := h.svc.List(userID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}
