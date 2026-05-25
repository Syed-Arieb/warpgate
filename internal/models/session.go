package models

import "time"

type Session struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	Name        string    `gorm:"not null" json:"name"`
	Status      string    `gorm:"not null;default:disconnected" json:"status"`
	PhoneNumber *string   `json:"phone_number,omitempty"`
	ProxyConfig *string   `json:"proxy_config,omitempty"`
	DeviceID    *string   `json:"-"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

const (
	SessionStatusDisconnected = "disconnected"
	SessionStatusConnecting   = "connecting"
	SessionStatusConnected    = "connected"
	SessionStatusBanned       = "banned"
)
