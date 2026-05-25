package middleware

import (
	"strings"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

func Auth(authService *services.AuthService, apiKeyService *services.APIKeyService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if tokenStr := extractBearerToken(c); tokenStr != "" {
			claims, err := authService.ValidateToken(tokenStr)
			if err == nil {
				c.Locals("user_id", claims.UserID)
				c.Locals("email", claims.Email)
				c.Locals("role", claims.Role)
				c.Locals("auth_method", "jwt")
				return c.Next()
			}
		}

		if key := c.Get("X-API-Key"); key != "" {
			lookup, err := apiKeyService.FindByKey(key)
			if err == nil {
				c.Locals("user_id", lookup.User.ID)
				c.Locals("email", lookup.User.Email)
				c.Locals("role", lookup.User.Role)
				c.Locals("auth_method", "api_key")
				c.Locals("api_key_id", lookup.APIKey.ID)
				c.Locals("api_key", lookup.APIKey)
				return c.Next()
			}
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "missing or invalid authorization",
		})
	}
}

func extractBearerToken(c *fiber.Ctx) string {
	if auth := c.Get("Authorization"); auth != "" {
		if strings.HasPrefix(auth, "Bearer ") {
			return strings.TrimPrefix(auth, "Bearer ")
		}
	}
	return c.Cookies("access_token")
}
