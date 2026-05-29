package auth

import (
	"errors"

	"github.com/arieb/warpgate/internal/services"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	authService  *services.AuthService
	cookieSecure bool
}

func NewHandler(authService *services.AuthService, cookieSecure bool) *Handler {
	return &Handler{authService: authService, cookieSecure: cookieSecure}
}

func (h *Handler) Register(c *fiber.Ctx) error {
	var input services.RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	resp, err := h.authService.Register(input)
	if err != nil {
		status := fiber.StatusInternalServerError
		switch {
		case errors.Is(err, services.ErrInvalidEmail),
			errors.Is(err, services.ErrWeakPassword),
			errors.Is(err, services.ErrNameRequired):
			status = fiber.StatusBadRequest
		case err.Error() == "email already registered":
			status = fiber.StatusConflict
		}
		return c.Status(status).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	setAuthCookies(c, resp.AccessToken, resp.RefreshToken, h.cookieSecure)

	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var input services.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	resp, err := h.authService.Login(input)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	setAuthCookies(c, resp.AccessToken, resp.RefreshToken, h.cookieSecure)

	return c.JSON(resp)
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	var input services.TokenInput

	if err := c.BodyParser(&input); err == nil && input.RefreshToken != "" {
	} else if token := c.Cookies("refresh_token"); token != "" {
		input.RefreshToken = token
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "refresh token is required",
		})
	}

	resp, err := h.authService.Refresh(input)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	setAuthCookies(c, resp.AccessToken, resp.RefreshToken, h.cookieSecure)

	return c.JSON(resp)
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	c.ClearCookie("access_token")
	c.ClearCookie("refresh_token")
	return c.JSON(fiber.Map{"status": "logged out"})
}

func setAuthCookies(c *fiber.Ctx, accessToken, refreshToken string, secure bool) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Lax",
		Path:     "/",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Lax",
		Path:     "/",
	})
}
