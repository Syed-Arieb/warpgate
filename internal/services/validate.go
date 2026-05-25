package services

import (
	"errors"
	"net/mail"
	"strings"
)

var (
	ErrInvalidEmail      = errors.New("invalid email format")
	ErrWeakPassword      = errors.New("password must be at least 8 characters")
	ErrNameRequired      = errors.New("name is required")
	ErrNameTooLong       = errors.New("name must be at most 100 characters")
	ErrPlanLimitExceeded = errors.New("plan limit exceeded")
)

func ValidateEmail(email string) error {
	_, err := mail.ParseAddress(email)
	if err != nil {
		return ErrInvalidEmail
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrWeakPassword
	}
	return nil
}

func ValidateName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ErrNameRequired
	}
	if len(trimmed) > 100 {
		return ErrNameTooLong
	}
	return nil
}
