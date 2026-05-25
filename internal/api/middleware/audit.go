package middleware

import (
	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

func AuditLogger(auditService *services.AuditService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()

		userID, ok := c.Locals("user_id").(uint)
		if !ok {
			return err
		}

		action := c.Method() + " " + c.Path()
		auditService.Log(userID, services.AuditInput{
			Action:     action,
			Resource:   c.Path(),
			IP:         c.IP(),
			UserAgent:  c.Get("User-Agent"),
		})

		return err
	}
}
