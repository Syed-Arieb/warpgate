package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Port        string `mapstructure:"PORT"`
	LogLevel    string `mapstructure:"LOG_LEVEL"`
	UploadDir   string `mapstructure:"UPLOAD_DIR"`
	UploadURL   string `mapstructure:"UPLOAD_URL"`
	CORSOrigin  string `mapstructure:"CORS_ORIGIN"`
	CookieSecure bool  `mapstructure:"COOKIE_SECURE"`

	Database DatabaseConfig `mapstructure:",squash"`
	Redis    RedisConfig    `mapstructure:",squash"`
	JWT      JWTConfig      `mapstructure:",squash"`
}

type DatabaseConfig struct {
	DBHost     string `mapstructure:"DB_HOST"`
	DBPort     string `mapstructure:"DB_PORT"`
	DBUser     string `mapstructure:"DB_USER"`
	DBPassword string `mapstructure:"DB_PASSWORD"`
	DBName     string `mapstructure:"DB_NAME"`
	DBSSLMode  string `mapstructure:"DB_SSLMODE"`
}

func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.DBHost, d.DBPort, d.DBUser, d.DBPassword, d.DBName, d.DBSSLMode)
}

type RedisConfig struct {
	RedisHost     string `mapstructure:"REDIS_HOST"`
	RedisPort     string `mapstructure:"REDIS_PORT"`
	RedisPassword string `mapstructure:"REDIS_PASSWORD"`
	RedisDB       int    `mapstructure:"REDIS_DB"`
}

type JWTConfig struct {
	JWTSecret       string `mapstructure:"JWT_SECRET"`
	JWTAccessExpiry  string `mapstructure:"JWT_ACCESS_EXPIRY"`
	JWTRefreshExpiry string `mapstructure:"JWT_REFRESH_EXPIRY"`
}

func Load() (*Config, error) {
	v := viper.New()

	v.SetConfigFile(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")

	v.AutomaticEnv()

	v.SetDefault("PORT", "8080")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("DB_HOST", "localhost")
	v.SetDefault("DB_PORT", "5432")
	v.SetDefault("DB_USER", "warpgate")
	v.SetDefault("DB_PASSWORD", "warpgate")
	v.SetDefault("DB_NAME", "warpgate")
	v.SetDefault("DB_SSLMODE", "disable")
	v.SetDefault("REDIS_HOST", "localhost")
	v.SetDefault("REDIS_PORT", "6379")
	v.SetDefault("REDIS_PASSWORD", "")
	v.SetDefault("REDIS_DB", 0)
	v.SetDefault("JWT_SECRET", "change-me-in-production")
	v.SetDefault("JWT_ACCESS_EXPIRY", "15m")
	v.SetDefault("JWT_REFRESH_EXPIRY", "168h")
	v.SetDefault("UPLOAD_DIR", "uploads")
	v.SetDefault("UPLOAD_URL", "/uploads")
	v.SetDefault("CORS_ORIGIN", "http://localhost:5173")
	v.SetDefault("COOKIE_SECURE", false)

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Fprintln(os.Stderr, "warn: .env file not found, using defaults and env vars")
		} else {
			fmt.Fprintf(os.Stderr, "warn: failed to read .env file: %v\n", err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return &cfg, nil
}
