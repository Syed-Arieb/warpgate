package models

import "time"

type Webhook struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	SessionID uint      `gorm:"not null;index" json:"session_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Name      string    `gorm:"not null" json:"name"`
	URL       string    `gorm:"not null" json:"url"`
	Secret    string    `gorm:"not null" json:"secret"`
	Events    string    `gorm:"not null" json:"events"`
	Active    bool      `gorm:"not null;default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type WebhookLog struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	WebhookID      uint      `gorm:"not null;index" json:"webhook_id"`
	EventType      string    `gorm:"not null" json:"event_type"`
	Payload        string    `gorm:"type:text" json:"payload"`
	ResponseStatus int       `json:"response_status"`
	ResponseBody   string    `gorm:"type:text" json:"response_body"`
	Attempt        int       `gorm:"not null" json:"attempt"`
	MaxAttempts    int       `gorm:"not null" json:"max_attempts"`
	Success        bool      `gorm:"not null" json:"success"`
	Error          string    `gorm:"type:text" json:"error,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

const (
	WebhookEventMessageReceived = "message.received"
	WebhookEventMessageSent     = "message.sent"
	WebhookEventMessageDelivered = "message.delivered"
	WebhookEventMessageRead     = "message.read"
	WebhookEventSessionConnected = "session.connected"
	WebhookEventSessionDisconnected = "session.disconnected"
	WebhookEventSessionQR       = "session.qr"
	WebhookEventGroupJoined     = "group.joined"
	WebhookEventGroupLeft       = "group.left"
)

var AllWebhookEvents = []string{
	WebhookEventMessageReceived,
	WebhookEventMessageSent,
	WebhookEventMessageDelivered,
	WebhookEventMessageRead,
	WebhookEventSessionConnected,
	WebhookEventSessionDisconnected,
	WebhookEventSessionQR,
	WebhookEventGroupJoined,
	WebhookEventGroupLeft,
}
