package middleware

import (
	"context"
	"fmt"

	"github.com/arieb/warpgate/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

func APIKeyRateLimit(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if rdb == nil {
			return c.Next()
		}

		apiKeyID, ok := c.Locals("api_key_id").(uint)
		if !ok {
			return c.Next()
		}

		ctx := context.Background()
		key := fmt.Sprintf("apikey:daily:%d", apiKeyID)

		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			return c.Next()
		}

		if count == 1 {
			rdb.Expire(ctx, key, 86400)
		}

		ak, ok := c.Locals("api_key").(*models.APIKey)
		if ok && ak.DailyLimit > 0 && count > int64(ak.DailyLimit) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "daily API key rate limit exceeded",
			})
		}

		return c.Next()
	}
}
