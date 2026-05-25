package api

import (
	"strconv"

	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func metricsHandler(db *gorm.DB, waManager *engine.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var totalUsers, totalSessions, connectedSessions, totalMessages int64
		db.Model(&models.User{}).Count(&totalUsers)
		db.Model(&models.Session{}).Count(&totalSessions)
		db.Model(&models.Session{}).Where("status = ?", models.SessionStatusConnected).Count(&connectedSessions)
		db.Model(&models.Message{}).Count(&totalMessages)

		activeEngines := waManager.ActiveCount()

		lines := []string{
			"# HELP warpgate_users_total Total users",
			"# TYPE warpgate_users_total gauge",
			"warpgate_users_total " + strconv.FormatInt(totalUsers, 10),
			"# HELP warpgate_sessions_total Total sessions",
			"# TYPE warpgate_sessions_total gauge",
			"warpgate_sessions_total " + strconv.FormatInt(totalSessions, 10),
			"# HELP warpgate_sessions_connected Connected sessions",
			"# TYPE warpgate_sessions_connected gauge",
			"warpgate_sessions_connected " + strconv.FormatInt(connectedSessions, 10),
			"# HELP warpgate_messages_total Total messages",
			"# TYPE warpgate_messages_total gauge",
			"warpgate_messages_total " + strconv.FormatInt(totalMessages, 10),
			"# HELP warpgate_engine_clients Active engine clients",
			"# TYPE warpgate_engine_clients gauge",
			"warpgate_engine_clients " + strconv.FormatInt(int64(activeEngines), 10),
		}

		metrics := ""
		for _, l := range lines {
			metrics += l + "\n"
		}

		c.Set("Content-Type", "text/plain; version=0.0.4")
		return c.SendString(metrics)
	}
}
