package models

import (
	"gorm.io/gorm"
)

type Plan struct {
	ID                uint   `gorm:"primaryKey" json:"id"`
	Name              string `gorm:"uniqueIndex;not null" json:"name"`
	MaxSessions       int    `gorm:"not null;default:1" json:"max_sessions"`
	MaxAPIKeys        int    `gorm:"not null;default:5" json:"max_api_keys"`
	MaxWebhooks       int    `gorm:"not null;default:5" json:"max_webhooks"`
	MaxWebhookDeliveries int `gorm:"not null;default:1000" json:"max_webhook_deliveries"`
	RateLimit         int    `gorm:"not null;default:60" json:"rate_limit"`
}

func SeedPlans(db *gorm.DB) {
	plans := []Plan{
		{Name: "free", MaxSessions: 1, MaxAPIKeys: 5, MaxWebhooks: 5, MaxWebhookDeliveries: 1000, RateLimit: 60},
		{Name: "pro", MaxSessions: 10, MaxAPIKeys: 50, MaxWebhooks: 20, MaxWebhookDeliveries: 10000, RateLimit: 600},
		{Name: "enterprise", MaxSessions: 100, MaxAPIKeys: 500, MaxWebhooks: 100, MaxWebhookDeliveries: 100000, RateLimit: 6000},
	}
	for _, p := range plans {
		db.Where("name = ?", p.Name).FirstOrCreate(&p)
	}
}
