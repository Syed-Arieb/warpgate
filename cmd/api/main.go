package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/arieb/warpgate/internal/api"
	"github.com/arieb/warpgate/internal/cache"
	"github.com/arieb/warpgate/internal/config"
	"github.com/arieb/warpgate/internal/db"
	"github.com/arieb/warpgate/internal/engine"
	"github.com/arieb/warpgate/internal/jobs"
	"github.com/arieb/warpgate/internal/logger"
	"github.com/arieb/warpgate/internal/models"
	"github.com/arieb/warpgate/internal/storage"
	_ "github.com/lib/pq"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"gorm.io/gorm"
)

func main() {
	migrateOnly := flag.Bool("migrate", false, "run migrations and exit")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	logger.Init(cfg.LogLevel)

	database, err := db.Connect(&cfg.Database)
	if err != nil {
		logger.Log.Fatal().Err(err).Msg("failed to connect to database")
	}

	if err := runMigrations(database, cfg.Database.DSN()); err != nil {
		logger.Log.Fatal().Err(err).Msg("migration failed")
	}

	if *migrateOnly {
		logger.Log.Info().Msg("migrations complete")
		os.Exit(0)
	}
	if cfg.JWT.JWTSecret == "change-me-in-production" {
		logger.Log.Warn().Msg("JWT_SECRET is set to default value, change it in production")
	}

	rdb, err := cache.Connect(&cfg.Redis)
	if err != nil {
		logger.Log.Warn().Err(err).Msg("redis not available, continuing without cache")
	}

	waContainer, err := sqlstore.New(context.Background(), "postgres", cfg.Database.DSN(), nil)
	if err != nil {
		logger.Log.Warn().Err(err).Msg("whatsmeow store not available, engine will be disabled")
		waContainer = nil
	}

	waManager := engine.NewManager(database, waContainer)

	if waContainer != nil {
		waManager.ReconnectAll()
	}

	var store storage.Adapter
	store, err = storage.NewLocalAdapter(cfg.UploadDir, cfg.UploadURL)
	if err != nil {
		logger.Log.Warn().Err(err).Msg("local storage not available, media uploads will fail")
		store = storage.NewNoopAdapter()
	}

	dispatcher := jobs.NewDispatcher(database, waManager)
	dispatcher.Start()

	app := api.New(cfg, database, rdb, waManager, store)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Log.Info().Str("port", cfg.Port).Msg("server starting")
		if err := app.Listen(":" + cfg.Port); err != nil {
			logger.Log.Fatal().Err(err).Msg("server error")
		}
	}()

	<-quit
	logger.Log.Info().Msg("shutting down...")

	dispatcher.Stop()

	waManager.DisconnectAll()

	if err := app.Shutdown(); err != nil {
		logger.Log.Error().Err(err).Msg("server shutdown error")
	}

	logger.Log.Info().Msg("server stopped")
}

func runMigrations(db *gorm.DB, dsn string) error {
	if err := db.AutoMigrate(
		&models.User{},
		&models.Plan{},
		&models.APIKey{},
		&models.Session{},
		&models.Message{},
		&models.Contact{},
		&models.Group{},
		&models.Webhook{},
		&models.WebhookLog{},
		&models.AuditLog{},
	); err != nil {
		return fmt.Errorf("auto migrate failed: %w", err)
	}
	models.SeedPlans(db)
	return nil
}
