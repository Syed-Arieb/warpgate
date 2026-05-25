package middleware

import (
	"net"
	"strings"

	"github.com/arieb/warpgate/internal/models"
	"github.com/gofiber/fiber/v2"
)

func CIDRAllowlist() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ak, ok := c.Locals("api_key").(*models.APIKey)
		if !ok {
			return c.Next()
		}

		allowedRaw := ak.AllowedIPs
		if allowedRaw == "" {
			return c.Next()
		}

		clientIP := net.ParseIP(c.IP())
		if clientIP == nil {
			return c.Next()
		}

		allowedCIDRs := strings.Split(allowedRaw, ",")
		for _, cidrStr := range allowedCIDRs {
			cidrStr = strings.TrimSpace(cidrStr)
			if cidrStr == "" {
				continue
			}
			_, cidr, err := net.ParseCIDR(cidrStr)
			if err != nil {
				if ip := net.ParseIP(cidrStr); ip != nil {
					if clientIP.Equal(ip) {
						return c.Next()
					}
				}
				continue
			}
			if cidr.Contains(clientIP) {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "IP not allowed",
		})
	}
}
