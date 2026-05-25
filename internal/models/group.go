package models

import "time"

type Group struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SessionID   uint      `gorm:"not null;uniqueIndex:idx_group_session_jid" json:"session_id"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	GroupJID    string    `gorm:"not null;uniqueIndex:idx_group_session_jid" json:"group_jid"`
	Name        string    `json:"name"`
	MemberCount int       `json:"member_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
