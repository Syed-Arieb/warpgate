package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/arieb/warpgate/internal/config"
	"github.com/arieb/warpgate/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.JWTConfig
}

func NewAuthService(db *gorm.DB, cfg *config.JWTConfig) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
}

func (s *AuthService) Register(input RegisterInput) (*AuthResponse, error) {
	if err := ValidateEmail(input.Email); err != nil {
		return nil, err
	}
	if err := ValidatePassword(input.Password); err != nil {
		return nil, err
	}
	if err := ValidateName(input.Name); err != nil {
		return nil, err
	}

	var existing models.User
	if err := s.db.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		return nil, errors.New("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := models.User{
		Email:        input.Email,
		PasswordHash: string(hash),
		Name:         input.Name,
		PlanID:       1,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	s.db.Preload("Plan").First(&user, user.ID)

	accessToken, err := s.generateToken(user.ID, user.Email, s.cfg.JWTAccessExpiry)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateToken(user.ID, user.Email, s.cfg.JWTRefreshExpiry)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         &user,
	}, nil
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *AuthService) Login(input LoginInput) (*AuthResponse, error) {
	var user models.User
	if err := s.db.Preload("Plan").Where("email = ?", input.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid email or password")
		}
		return nil, fmt.Errorf("find user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	accessToken, err := s.generateToken(user.ID, user.Email, s.cfg.JWTAccessExpiry)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateToken(user.ID, user.Email, s.cfg.JWTRefreshExpiry)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         &user,
	}, nil
}

type TokenInput struct {
	RefreshToken string `json:"refresh_token"`
}

func (s *AuthService) Refresh(input TokenInput) (*AuthResponse, error) {
	claims, err := s.validateToken(input.RefreshToken)
	if err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	var user models.User
	if err := s.db.Preload("Plan").First(&user, claims.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	accessToken, err := s.generateToken(user.ID, user.Email, s.cfg.JWTAccessExpiry)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateToken(user.ID, user.Email, s.cfg.JWTRefreshExpiry)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         &user,
	}, nil
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (s *AuthService) generateToken(userID uint, email, expiryStr string) (string, error) {
	duration, err := time.ParseDuration(expiryStr)
	if err != nil {
		return "", fmt.Errorf("parse expiry: %w", err)
	}

	role := "user"
	var u models.User
	if err := s.db.Select("role").First(&u, userID).Error; err == nil {
		role = u.Role
	}

	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) validateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func (s *AuthService) ValidateToken(tokenStr string) (*Claims, error) {
	return s.validateToken(tokenStr)
}
