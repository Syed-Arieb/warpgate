package models

import "time"

type APIKey struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	UserID        uint       `gorm:"not null;index" json:"user_id"`
	Name          string     `gorm:"not null" json:"name"`
	KeyPrefix     string     `gorm:"not null" json:"key_prefix"`
	KeyHash       string     `gorm:"not null" json:"-"`
	AllowedIPs    string     `gorm:"type:text" json:"allowed_ips,omitempty"`
	DailyLimit    int        `gorm:"not null;default:0" json:"daily_limit"`
	LastUsedAt    *time.Time `json:"last_used_at"`
	CreatedAt     time.Time  `json:"created_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}
