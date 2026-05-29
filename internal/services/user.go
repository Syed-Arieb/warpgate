package services

import (
	"errors"
	"fmt"

	"github.com/arieb/warpgate/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

type UpdateProfileInput struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (s *UserService) GetMe(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("Plan").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	return &user, nil
}

func (s *UserService) UpdateProfile(userID uint, input UpdateProfileInput) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	if input.Email != "" && input.Email != user.Email {
		if err := ValidateEmail(input.Email); err != nil {
			return nil, err
		}
	
		var existing models.User
		if err := s.db.Where("email = ?", input.Email).First(&existing).Error; err == nil {
			return nil, errors.New("email already in use")
		}
		user.Email = input.Email
	}

	if input.Name != "" {
		user.Name = input.Name
	}

	if err := s.db.Save(&user).Error; err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}

	s.db.Preload("Plan").First(&user, user.ID)
	return &user, nil
}

func (s *UserService) ChangePassword(userID uint, oldPassword, newPassword string) error {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return fmt.Errorf("find user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	if err := ValidatePassword(newPassword); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	user.PasswordHash = string(hash)
	return s.db.Save(&user).Error
}
