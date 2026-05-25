package models

import "time"

type User struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Email          string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash   string    `gorm:"not null" json:"-"`
	Name           string    `gorm:"not null" json:"name"`
	Role           string    `gorm:"not null;default:user" json:"role"`
	PlanID         uint      `gorm:"not null;default:1" json:"plan_id"`
	EmailVerified  bool      `gorm:"not null;default:false" json:"email_verified"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	Plan Plan `gorm:"foreignKey:PlanID" json:"plan"`
}
