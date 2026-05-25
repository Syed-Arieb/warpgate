package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/arieb/warpgate/internal/models"
	"gorm.io/gorm"
)

type APIKeyService struct {
	db *gorm.DB
}

func NewAPIKeyService(db *gorm.DB) *APIKeyService {
	return &APIKeyService{db: db}
}

type CreateAPIKeyInput struct {
	Name       string `json:"name"`
	AllowedIPs string `json:"allowed_ips,omitempty"`
	DailyLimit int    `json:"daily_limit,omitempty"`
}

type CreateAPIKeyResponse struct {
	*models.APIKey
	PlainKey string `json:"plain_key"`
}

func (s *APIKeyService) Create(userID uint, input CreateAPIKeyInput) (*CreateAPIKeyResponse, error) {
	user, err := s.getUserWithPlan(userID)
	if err != nil {
		return nil, err
	}

	var count int64
	s.db.Model(&models.APIKey{}).Where("user_id = ?", userID).Count(&count)
	if count >= int64(user.Plan.MaxAPIKeys) {
		return nil, fmt.Errorf("%w: max %d api keys", ErrPlanLimitExceeded, user.Plan.MaxAPIKeys)
	}

	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}

	plainKey := "wg_" + hex.EncodeToString(keyBytes)
	hash := sha256.Sum256([]byte(plainKey))
	prefix := plainKey[:12]

	dl := input.DailyLimit
	if dl <= 0 {
		dl = user.Plan.RateLimit
	}

	apiKey := models.APIKey{
		UserID:     userID,
		Name:       input.Name,
		KeyPrefix:  prefix,
		KeyHash:    hex.EncodeToString(hash[:]),
		AllowedIPs: input.AllowedIPs,
		DailyLimit: dl,
	}

	if err := s.db.Create(&apiKey).Error; err != nil {
		return nil, fmt.Errorf("create api key: %w", err)
	}

	return &CreateAPIKeyResponse{
		APIKey:   &apiKey,
		PlainKey: plainKey,
	}, nil
}

func (s *APIKeyService) getUserWithPlan(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("Plan").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}
	return &user, nil
}

func (s *APIKeyService) List(userID uint) ([]models.APIKey, error) {
	var keys []models.APIKey
	if err := s.db.Where("user_id = ?", userID).Order("created_at desc").Find(&keys).Error; err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	return keys, nil
}

func (s *APIKeyService) Update(userID, keyID uint, input CreateAPIKeyInput) (*models.APIKey, error) {
	var key models.APIKey
	if err := s.db.Where("id = ? AND user_id = ?", keyID, userID).First(&key).Error; err != nil {
		return nil, fmt.Errorf("api key not found")
	}
	if input.Name != "" {
		key.Name = input.Name
	}
	key.AllowedIPs = input.AllowedIPs
	if input.DailyLimit > 0 {
		key.DailyLimit = input.DailyLimit
	}
	if err := s.db.Save(&key).Error; err != nil {
		return nil, fmt.Errorf("update api key: %w", err)
	}
	return &key, nil
}

func (s *APIKeyService) Delete(userID, keyID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", keyID, userID).Delete(&models.APIKey{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("api key not found")
	}
	return result.Error
}

type APIKeyLookup struct {
	User   *models.User
	APIKey *models.APIKey
}

func (s *APIKeyService) FindByKey(plainKey string) (*APIKeyLookup, error) {
	hash := sha256.Sum256([]byte(plainKey))
	hashStr := hex.EncodeToString(hash[:])

	var key models.APIKey
	if err := s.db.Where("key_hash = ?", hashStr).First(&key).Error; err != nil {
		return nil, fmt.Errorf("invalid api key")
	}

	var user models.User
	if err := s.db.First(&user, key.UserID).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	return &APIKeyLookup{User: &user, APIKey: &key}, nil
}
