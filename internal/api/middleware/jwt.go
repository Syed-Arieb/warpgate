package middleware

import (
	"strings"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

func JWTAuth(authService *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := ""

		if auth := c.Get("Authorization"); auth != "" {
			if strings.HasPrefix(auth, "Bearer ") {
				tokenStr = strings.TrimPrefix(auth, "Bearer ")
			}
		}

		if tokenStr == "" {
			tokenStr = c.Cookies("access_token")
		}

		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization token",
			})
		}

		claims, err := authService.ValidateToken(tokenStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}
