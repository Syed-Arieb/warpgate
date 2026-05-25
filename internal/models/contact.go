package models

import "time"

type Contact struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	SessionID     uint      `gorm:"not null;uniqueIndex:idx_contact_session_jid" json:"session_id"`
	UserID        uint      `gorm:"not null;index" json:"user_id"`
	JID           string    `gorm:"not null;uniqueIndex:idx_contact_session_jid" json:"jid"`
	Name          string    `json:"name"`
	PushName      string    `json:"push_name"`
	ProfilePicURL *string   `json:"profile_pic_url,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
