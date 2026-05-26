package api

import (
	"time"

	"github.com/arieb/warpgate/internal/api/admin"
	"github.com/arieb/warpgate/internal/api/auth"
	auditapi "github.com/arieb/warpgate/internal/api/audit"
	contactapi "github.com/arieb/warpgate/internal/api/contact"
	engineapi "github.com/arieb/warpgate/internal/api/engine"
	groupapi "github.com/arieb/warpgate/internal/api/group"
	msgapi "github.com/arieb/warpgate/internal/api/message"
	"github.com/arieb/warpgate/internal/api/middleware"
	"github.com/arieb/warpgate/internal/api/session"
	"github.com/arieb/warpgate/internal/api/user"
	webhookapi "github.com/arieb/warpgate/internal/api/webhook"
	"github.com/arieb/warpgate/internal/config"
	wengine "github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/logger"
	"github.com/arieb/warpgate/internal/services"
	msgService "github.com/arieb/warpgate/internal/services/message"
	"github.com/arieb/warpgate/internal/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func New(cfg *config.Config, db *gorm.DB, rdb *redis.Client, waManager *wengine.Manager, store storage.Adapter) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName: "warpgate",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173",
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-API-Key",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
	}))

	app.Use(structuredLogging)

	authService := services.NewAuthService(db, &cfg.JWT)
	userService := services.NewUserService(db)
	apiKeyService := services.NewAPIKeyService(db)
	sessionService := services.NewSessionService(db)
	msgSvc := msgService.NewService(db, waManager, store)
	contactSvc := services.NewContactService(db, waManager)
	groupSvc := services.NewGroupService(db, waManager)
	webhookSvc := services.NewWebhookService(db)
	auditSvc := services.NewAuditService(db)

	authHandler := auth.NewHandler(authService)
	userHandler := user.NewHandler(userService, apiKeyService)
	sessionHandler := session.NewHandler(sessionService)
	engineHandler := engineapi.NewHandler(waManager, db)
	msgHandler := msgapi.NewHandler(msgSvc)
	contactHandler := contactapi.NewHandler(contactSvc)
	groupHandler := groupapi.NewHandler(groupSvc)
	webhookHandler := webhookapi.NewHandler(webhookSvc)
	auditHandler := auditapi.NewHandler(auditSvc)
	adminHandler := admin.NewHandler(db, waManager)

	apiGroup := app.Group("/api")
	apiGroup.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "timestamp": time.Now().UTC()})
	})
	apiGroup.Get("/ready", readyHandler(db, rdb, waManager))
	apiGroup.Get("/metrics", metricsHandler(db, waManager))

	authGroup := apiGroup.Group("/auth")
	authGroup.Post("/register", middleware.RateLimit(rdb, 5, 1*time.Minute), authHandler.Register)
	authGroup.Post("/login", middleware.RateLimit(rdb, 10, 1*time.Minute), authHandler.Login)
	authGroup.Post("/refresh", authHandler.Refresh)

	authMw := middleware.Auth(authService, apiKeyService)
	apiKeyRL := middleware.APIKeyRateLimit(rdb)
	cidrMw := middleware.CIDRAllowlist()

	protectedMw := func(c *fiber.Ctx) error {
		if err := authMw(c); err != nil {
			return err
		}
		if err := apiKeyRL(c); err != nil {
			return err
		}
		if err := cidrMw(c); err != nil {
			return err
		}
		return nil
	}

	usersGroup := apiGroup.Group("/users", protectedMw)
	usersGroup.Get("/me", userHandler.GetMe)
	usersGroup.Put("/me", userHandler.UpdateMe)
	usersGroup.Get("/me/audit", auditHandler.List)

	apiKeysGroup := usersGroup.Group("/me/api-keys")
	apiKeysGroup.Post("/", userHandler.CreateAPIKey)
	apiKeysGroup.Get("/", userHandler.ListAPIKeys)
	apiKeysGroup.Put("/:id", userHandler.UpdateAPIKey)
	apiKeysGroup.Delete("/:id", userHandler.DeleteAPIKey)

	sessionsGroup := apiGroup.Group("/sessions", protectedMw)
	sessionsGroup.Post("", sessionHandler.Create)
	sessionsGroup.Get("", sessionHandler.List)
	sessionsGroup.Get("/:id", sessionHandler.Get)
	sessionsGroup.Put("/:id", sessionHandler.Update)
	sessionsGroup.Delete("/:id", sessionHandler.Delete)
	sessionsGroup.Post("/:id/start", engineHandler.Start)
	sessionsGroup.Post("/:id/stop", engineHandler.Stop)
	sessionsGroup.Post("/:id/logout", engineHandler.Logout)
	sessionsGroup.Get("/:id/qr", engineHandler.QR)
	sessionsGroup.Get("/:id/status", engineHandler.Status)

	msgGroup := apiGroup.Group("/messages", protectedMw)
	msgGroup.Post("/text", msgHandler.SendText)
	msgGroup.Post("/media", msgHandler.SendMedia)
	msgGroup.Post("/reaction", msgHandler.SendReaction)
	msgGroup.Post("/bulk", msgHandler.SendBulk)
	msgGroup.Get("/:session_id", msgHandler.GetHistory)

	contactsGroup := apiGroup.Group("/sessions/:session_id/contacts", protectedMw)
	contactsGroup.Get("", contactHandler.List)

	groupsGroup := apiGroup.Group("/sessions/:session_id/groups", protectedMw)
	groupsGroup.Get("", groupHandler.List)
	groupsGroup.Post("", groupHandler.Create)
	groupsGroup.Get("/:group_id", groupHandler.Get)
	groupsGroup.Delete("/:group_id", groupHandler.Delete)

	webhookGroup := apiGroup.Group("/sessions/:session_id/webhooks", protectedMw)
	webhookGroup.Post("", webhookHandler.Create)
	webhookGroup.Get("", webhookHandler.List)
	webhookGroup.Get("/:webhook_id", webhookHandler.Get)
	webhookGroup.Put("/:webhook_id", webhookHandler.Update)
	webhookGroup.Delete("/:webhook_id", webhookHandler.Delete)
	webhookGroup.Get("/:webhook_id/logs", webhookHandler.GetLogs)

	adminGroup := apiGroup.Group("/admin", protectedMw, middleware.AdminOnly())
	adminGroup.Get("/users", adminHandler.ListUsers)
	adminGroup.Get("/sessions", adminHandler.ListSessions)
	adminGroup.Get("/stats", adminHandler.Stats)
	adminGroup.Delete("/sessions/:id", adminHandler.DeleteSession)

	return app
}

func structuredLogging(c *fiber.Ctx) error {
	start := time.Now()
	err := c.Next()
	latency := time.Since(start)

	userID, _ := c.Locals("user_id").(uint)
	authMethod, _ := c.Locals("auth_method").(string)
	sessionID := c.Params("id")
	if sessionID == "" {
		sessionID = c.Params("session_id")
	}

	logger.Log.Info().
		Str("method", c.Method()).
		Str("path", c.Path()).
		Int("status", c.Response().StatusCode()).
		Dur("latency", latency).
		Uint("user_id", userID).
		Str("auth_method", authMethod).
		Str("session_id", sessionID).
		Str("ip", c.IP()).
		Msg("request")
	return err
}

func readyHandler(db *gorm.DB, rdb *redis.Client, waManager *wengine.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		sqlDB, err := db.DB()
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "unavailable", "error": "db connection failed",
			})
		}
		if err := sqlDB.Ping(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "unavailable", "error": "db ping failed",
			})
		}

		if rdb != nil {
			if _, err := rdb.Ping(c.Context()).Result(); err != nil {
				return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
					"status": "degraded", "error": "redis ping failed",
				})
			}
		}

		return c.JSON(fiber.Map{
			"status":    "ready",
			"timestamp": time.Now().UTC(),
		})
	}
}
