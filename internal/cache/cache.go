package cache

import (
	"context"
	"fmt"

	"github.com/arieb/warpgate/internal/config"
	"github.com/arieb/warpgate/internal/logger"
	"github.com/redis/go-redis/v9"
)

var rdb *redis.Client

func Connect(cfg *config.RedisConfig) (*redis.Client, error) {
	rdb = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}

	logger.Log.Info().Msg("redis connected")
	return rdb, nil
}

func Client() *redis.Client {
	return rdb
}
