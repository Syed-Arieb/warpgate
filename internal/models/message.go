package models

import "time"

type Message struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	SessionID     uint       `gorm:"not null;index" json:"session_id"`
	UserID        uint       `gorm:"not null;index" json:"user_id"`
	Direction     string     `gorm:"not null" json:"direction"`
	FromJID       string     `gorm:"not null" json:"from_jid"`
	ToJID         string     `gorm:"not null" json:"to_jid"`
	MessageType   string     `gorm:"not null" json:"message_type"`
	Content       *string    `json:"content,omitempty"`
	MediaURL      *string    `json:"media_url,omitempty"`
	MediaMimeType *string    `json:"media_mime_type,omitempty"`
	MediaSize     *int64     `json:"media_size,omitempty"`
	WAID          *string    `gorm:"uniqueIndex" json:"wa_id,omitempty"`
	Status        string     `gorm:"not null;default:sent" json:"status"`
	ErrorCode     *string    `json:"error_code,omitempty"`
	SentAt        *time.Time `json:"sent_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

const (
	MessageDirectionIn  = "in"
	MessageDirectionOut = "out"

	MessageTypeText     = "text"
	MessageTypeImage    = "image"
	MessageTypeVideo    = "video"
	MessageTypeAudio    = "audio"
	MessageTypeDocument = "document"
	MessageTypeReaction = "reaction"

	MessageStatusSent     = "sent"
	MessageStatusDelivered = "delivered"
	MessageStatusRead     = "read"
	MessageStatusFailed   = "failed"
)
