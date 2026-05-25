package models

import "time"

type AuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	Action     string    `gorm:"not null" json:"action"`
	Resource   string    `json:"resource,omitempty"`
	ResourceID string    `json:"resource_id,omitempty"`
	IP         string    `json:"ip,omitempty"`
	UserAgent  string    `json:"user_agent,omitempty"`
	Metadata   string    `gorm:"type:text" json:"metadata,omitempty"`
	CreatedAt  time.Time `json:"created_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}
