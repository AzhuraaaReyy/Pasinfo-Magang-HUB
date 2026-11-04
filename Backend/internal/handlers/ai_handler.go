package handlers

import (
	"context"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

const VisitorCookieName = "pasinfo_visitor"

type ChatHandler struct {
	DB        *gorm.DB
	Chat      *services.ChatService
	Retriever *services.Retriever
}

const maxMessageChars = 2000

// parseSessionID accepts only a positive base-10 integer (chat_sessions.id).
func parseSessionID(raw string) (int64, bool) {
	id, err := strconv.ParseInt(raw, 10, 64)
	return id, err == nil && id >= 1
}

func (h *ChatHandler) sessionForVisitor(c *fiber.Ctx, id int64) (*models.ChatSession, error) {
	visitorID := c.Cookies(VisitorCookieName)
	if !validVisitorID(visitorID) {
		return nil, gorm.ErrRecordNotFound
	}
	var session models.ChatSession
	if err := h.DB.Where("id = ? AND visitor_id = ?", id, visitorID).First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

// validVisitorID accepts only the canonical UUID form the server issues (K5-02).
func validVisitorID(value string) bool {
	parsed, err := uuid.Parse(value)
	return err == nil && parsed.String() == value
}

func setVisitorCookie(c *fiber.Ctx, id string) {
	// Secure follows the HTTPS env that also enables HSTS (SEC-02).
	c.Cookie(&fiber.Cookie{Name: VisitorCookieName, Value: id, HTTPOnly: true, Secure: os.Getenv("HTTPS") == "true", SameSite: "Lax", Path: "/", Expires: time.Now().Add(90 * 24 * time.Hour)})
}

func NewChatHandler(db *gorm.DB, llm services.LLMProvider) *ChatHandler {
	retriever := services.NewRetriever(db)
	chat := services.NewChatService(db, llm, 120*time.Second, retriever)
	chat.Judge = services.LLMRelevanceJudge{LLM: llm}
	chat.Rewriter = services.LLMQueryRewriter{LLM: llm}
	chat.Recommender = services.NewRecommender(db)
	return &ChatHandler{db, chat, retriever}
}
func (h *ChatHandler) CreateSession(c *fiber.Ctx) error {
	id := c.Cookies(VisitorCookieName)
	if !validVisitorID(id) {
		id = uuid.NewString()
		setVisitorCookie(c, id)
	}
	s := models.ChatSession{VisitorID: id, Status: "active"}
	if e := h.DB.Create(&s).Error; e != nil {
		logChatError(c, e)
		return chatError(c, fiber.StatusInternalServerError, codeInternalError)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "session": toSessionDTO(s)})
}
func (h *ChatHandler) Messages(c *fiber.Ctx) error {
	id, ok := parseSessionID(c.Params("id"))
	if !ok {
		return chatError(c, fiber.StatusBadRequest, codeInvalidSessionID)
	}
	s, err := h.sessionForVisitor(c, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return chatError(c, fiber.StatusNotFound, codeSessionNotFound)
	}
	if err != nil {
		logChatError(c, err)
		return chatError(c, fiber.StatusInternalServerError, codeInternalError)
	}
	var rows []models.ChatMessage
	if e := h.DB.Where("session_id=?", s.ID).Order("id").Find(&rows).Error; e != nil {
		logChatError(c, e)
		return chatError(c, fiber.StatusInternalServerError, codeInternalError)
	}
	return c.JSON(fiber.Map{"success": true, "session": toSessionDTO(*s), "messages": toMessageDTOs(rows, h.sourceCards(c.UserContext(), rows))})
}
func (h *ChatHandler) PostMessage(c *fiber.Ctx) error {
	// Validation order follows the contract: session_id, JSON, empty, length, ownership.
	id, ok := parseSessionID(c.Params("id"))
	if !ok {
		return chatError(c, fiber.StatusBadRequest, codeInvalidSessionID)
	}
	var in struct {
		Message string `json:"message"`
	}
	if e := c.BodyParser(&in); e != nil {
		return chatError(c, fiber.StatusBadRequest, codeInvalidJSON)
	}
	message := strings.TrimSpace(in.Message)
	if message == "" {
		return chatError(c, fiber.StatusBadRequest, codeMessageRequired)
	}
	if utf8.RuneCountInString(message) > maxMessageChars {
		return chatError(c, fiber.StatusRequestEntityTooLarge, codeMessageTooLong)
	}
	s, e := h.sessionForVisitor(c, id)
	if errors.Is(e, gorm.ErrRecordNotFound) {
		return chatError(c, fiber.StatusNotFound, codeSessionNotFound)
	}
	if e != nil {
		logChatError(c, e)
		return chatError(c, fiber.StatusInternalServerError, codeInternalError)
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), h.Chat.Timeout)
	defer cancel()
	result, e := h.Chat.Ask(ctx, s, message)
	if e != nil {
		logChatError(c, e)
		status, code := chatErrorStatus(e)
		return chatError(c, status, code)
	}
	assistant := *result.Assistant
	// Cards use the request context, not the chat context that may be close to its deadline.
	return c.JSON(fiber.Map{
		"success":           true,
		"session":           toSessionDTO(*s),
		"user_message":      toMessageDTO(result.User, nil),
		"assistant_message": toMessageDTO(assistant, h.sourceCards(c.UserContext(), []models.ChatMessage{assistant})),
	})
}

const chatHealthTimeout = 3 * time.Second

// Health reports only whether the AI provider is reachable (K2-02: no provider name).
func (h *ChatHandler) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), chatHealthTimeout)
	defer cancel()
	return c.JSON(fiber.Map{"success": true, "available": services.ProviderHealth(ctx, h.Chat.LLM) == nil})
}

func validSemanticCategory(category string) bool {
	switch category {
	case "wisata", "berita", "kuliner", "budaya", "acara", "umum", "layanan":
		return true
	default:
		return false
	}
}

func (h *ChatHandler) Semantic(c *fiber.Ctx) error {
	var in struct {
		Query    string `json:"query"`
		Category string `json:"category"`
		Limit    int    `json:"limit"`
	}
	if e := c.BodyParser(&in); e != nil {
		return chatError(c, fiber.StatusBadRequest, codeInvalidJSON)
	}
	if strings.TrimSpace(in.Query) == "" {
		return chatError(c, fiber.StatusBadRequest, codeInvalidQuery)
	}
	if in.Limit > 50 {
		return chatError(c, fiber.StatusBadRequest, codeInvalidLimit)
	}
	if in.Category != "" && !validSemanticCategory(in.Category) {
		return chatError(c, fiber.StatusBadRequest, codeInvalidCategory)
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), h.Chat.Timeout)
	defer cancel()
	// Shares the chat provider so the concurrency limit (SEC-07) also covers search.
	out, e := h.Retriever.SemanticSearch(ctx, h.Chat.LLM, in.Query, in.Category, in.Limit)
	if e != nil {
		logChatError(c, e)
		status, code := chatErrorStatus(e)
		return chatError(c, status, code)
	}
	return c.JSON(fiber.Map{"success": true, "results": out})
}
