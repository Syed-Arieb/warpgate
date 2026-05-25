package middleware

import (
	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

func APIKeyAuth(apiKeyService *services.APIKeyService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := c.Get("X-API-Key")
		if key == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing X-API-Key header",
			})
		}

		lookup, err := apiKeyService.FindByKey(key)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid API key",
			})
		}

		c.Locals("user_id", lookup.User.ID)
		c.Locals("email", lookup.User.Email)
		c.Locals("role", lookup.User.Role)
		c.Locals("auth_method", "api_key")
		c.Locals("api_key_id", lookup.APIKey.ID)
		c.Locals("api_key", lookup.APIKey)
		return c.Next()
	}
}
