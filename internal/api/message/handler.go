package message

import (
	"strconv"

	msgService "github.com/arieb/warpgate/internal/services/message"
	"github.com/gofiber/fiber/v2"
	"go.mau.fi/whatsmeow"
)

type Handler struct {
	service *msgService.Service
}

func NewHandler(service *msgService.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) SendText(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var input struct {
		SessionID uint   `json:"session_id"`
		To        string `json:"to"`
		Text      string `json:"text"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	if input.To == "" || input.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "to and text are required"})
	}

	msg, err := h.service.SendText(c.Context(), userID, input.SessionID, input.To, input.Text)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(msg)
}

func (h *Handler) SendMedia(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	sessionIDStr := c.FormValue("session_id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	to := c.FormValue("to")
	msgType := c.FormValue("message_type")
	caption := c.FormValue("caption")

	if to == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "to is required"})
	}
	if msgType == "" {
		msgType = "document"
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is required"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "open file"})
	}
	defer f.Close()

	mediaType, err := resolveMediaType(msgType)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	input := &msgService.MediaInput{
		Data:        f,
		FileName:    file.Filename,
		MimeType:    file.Header.Get("Content-Type"),
		Caption:     caption,
		MediaType:   mediaType,
		MessageType: msgType,
	}

	msg, err := h.service.SendMedia(c.Context(), userID, uint(sessionID), to, input)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "session not connected" || err.Error() == "session not found" {
			status = fiber.StatusBadRequest
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(msg)
}

func (h *Handler) SendReaction(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var input struct {
		SessionID   uint   `json:"session_id"`
		To          string `json:"to"`
		MessageID   string `json:"message_id"`
		Emoji       string `json:"emoji"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	if input.To == "" || input.MessageID == "" || input.Emoji == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "to, message_id, and emoji are required"})
	}

	msg, err := h.service.SendReaction(c.Context(), userID, input.SessionID, input.To, input.MessageID, input.Emoji)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(msg)
}

func (h *Handler) SendBulk(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var input struct {
		SessionID  uint     `json:"session_id"`
		Recipients []string `json:"recipients"`
		Text       string   `json:"text"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	if len(input.Recipients) == 0 || input.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "recipients and text are required"})
	}

	results, err := h.service.SendBulk(c.Context(), userID, input.SessionID, input.Recipients, input.Text)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"results": results})
}

func (h *Handler) GetHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	sessionIDStr := c.Params("session_id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	result, err := h.service.GetHistory(c.Context(), userID, uint(sessionID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

func resolveMediaType(msgType string) (whatsmeow.MediaType, error) {
	switch msgType {
	case "image":
		return whatsmeow.MediaImage, nil
	case "video":
		return whatsmeow.MediaVideo, nil
	case "audio":
		return whatsmeow.MediaAudio, nil
	case "document":
		return whatsmeow.MediaDocument, nil
	default:
		return "", fiber.NewError(fiber.StatusBadRequest, "invalid message_type: must be image, video, audio, or document")
	}
}
