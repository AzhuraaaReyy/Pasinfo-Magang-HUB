package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

const (
	visitorA = "11111111-1111-4111-8111-111111111111"
	visitorB = "22222222-2222-4222-8222-222222222222"
)

// testChatDB opens an in-memory SQLite database private to the calling test.
func testChatDB(t *testing.T) *gorm.DB {
	t.Helper()
	name := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	db, err := gorm.Open(sqlite.Open("file:"+name+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.ChatSession{}, &models.ChatMessage{}); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestSessionMessagesRejectsDifferentVisitor(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Get("/sessions/:id/messages", h.Messages)
	request := httptest.NewRequest("GET", "/sessions/"+fmt.Sprint(s.ID)+"/messages", nil)
	request.AddCookie(&http.Cookie{Name: "pasinfo_visitor", Value: visitorB})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestPostMessageRejectsDifferentVisitor(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	request := httptest.NewRequest("POST", "/sessions/"+fmt.Sprint(s.ID)+"/messages", strings.NewReader(`{"message":"unauthorized"}`))
	request.Header.Set("Content-Type", "application/json")
	request.AddCookie(&http.Cookie{Name: "pasinfo_visitor", Value: visitorB})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var messages []models.ChatMessage
	if err := db.Find(&messages).Error; err != nil {
		t.Fatal(err)
	}
	if len(messages) != 0 {
		t.Fatalf("messages = %d, want 0", len(messages))
	}
}

func TestSessionMessagesAllowsOwner(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Get("/sessions/:id/messages", h.Messages)
	request := httptest.NewRequest("GET", "/sessions/"+fmt.Sprint(s.ID)+"/messages", nil)
	request.AddCookie(&http.Cookie{Name: "pasinfo_visitor", Value: visitorA})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestValidSemanticCategory(t *testing.T) {
	for _, category := range []string{"wisata", "berita", "kuliner", "budaya", "acara", "umum", "layanan"} {
		if !validSemanticCategory(category) {
			t.Fatalf("kategori valid ditolak: %s", category)
		}
	}
	if validSemanticCategory("kategori-tidak-ada") {
		t.Fatal("kategori invalid diterima")
	}
}

func TestPostMessageValidationUsesErrorCodes(t *testing.T) {
	h := &ChatHandler{DB: testChatDB(t)}
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	cases := []struct {
		name, body, code string
		status           int
	}{
		{"invalid json", `{"message":`, "INVALID_JSON", fiber.StatusBadRequest},
		{"empty", `{"message":"   "}`, "MESSAGE_REQUIRED", fiber.StatusBadRequest},
		{"missing field", `{}`, "MESSAGE_REQUIRED", fiber.StatusBadRequest},
		{"too long", `{"message":"` + strings.Repeat("a", 2001) + `"}`, "MESSAGE_TOO_LONG", fiber.StatusRequestEntityTooLarge},
		{"latitude out of range", `{"message":"wisata dekat sini","location":{"latitude":95,"longitude":112.9}}`, "INVALID_LOCATION", fiber.StatusBadRequest},
		{"longitude missing", `{"message":"wisata dekat sini","location":{"latitude":-7.6}}`, "INVALID_LOCATION", fiber.StatusBadRequest},
		{"zero point", `{"message":"wisata dekat sini","location":{"latitude":0,"longitude":0}}`, "INVALID_LOCATION", fiber.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest("POST", "/sessions/1/messages", strings.NewReader(tc.body))
			request.Header.Set("Content-Type", "application/json")
			response, err := app.Test(request)
			if err != nil {
				t.Fatal(err)
			}
			body := decodeJSONBody(t, response)
			errBody, _ := body["error"].(map[string]any)
			if response.StatusCode != tc.status || errBody["code"] != tc.code {
				t.Fatalf("status=%d body=%v", response.StatusCode, body)
			}
		})
	}
}

func decodeJSONBody(t *testing.T, response *http.Response) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	return body
}

type failingChatProvider struct {
	err error
}

func (p failingChatProvider) Name() string { return "test" }
func (p failingChatProvider) Chat(context.Context, []services.ChatMessage) (string, error) {
	return "", p.err
}
func (p failingChatProvider) Embed(context.Context, string) (*services.EmbeddingResponse, error) {
	return nil, p.err
}

func TestPostMessagePersistsFailedAssistantAndKeepsAPIAlive(t *testing.T) {
	db := testChatDB(t)
	session := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&session).Error; err != nil {
		t.Fatal(err)
	}
	providerErr := &services.ProviderError{Provider: "test", Kind: "upstream", Status: http.StatusInternalServerError}
	h := NewChatHandler(db, failingChatProvider{err: providerErr})
	h.Chat.Timeout = time.Second
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	app.Get("/alive", func(c *fiber.Ctx) error { return c.SendStatus(http.StatusOK) })

	request := httptest.NewRequest("POST", "/sessions/"+fmt.Sprint(session.ID)+"/messages", strings.NewReader(`{"message":"halo"}`))
	request.Header.Set("Content-Type", "application/json")
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusServiceUnavailable)
	}
	body := decodeJSONBody(t, response)
	if errBody, _ := body["error"].(map[string]any); errBody["code"] != "AI_UNAVAILABLE" {
		t.Fatalf("error code = %v", body)
	}
	if _, leaked := body["assistant"]; leaked {
		t.Fatalf("failed response must not include assistant: %v", body)
	}

	var messages []models.ChatMessage
	if err := db.Where("session_id = ?", session.ID).Order("id").Find(&messages).Error; err != nil {
		t.Fatal(err)
	}
	if len(messages) != 2 || messages[1].Role != "assistant" || messages[1].Status != "failed" {
		t.Fatalf("messages = %#v, want failed assistant persistence", messages)
	}
	alive, err := app.Test(httptest.NewRequest("GET", "/alive", nil))
	if err != nil || alive.StatusCode != http.StatusOK {
		t.Fatalf("API alive status = %d, err = %v", alive.StatusCode, err)
	}
}

type answeringProvider struct{ answer string }

func (p answeringProvider) Name() string { return "test:chat" }
func (p answeringProvider) Chat(context.Context, []services.ChatMessage) (string, error) {
	return p.answer, nil
}
func (p answeringProvider) Embed(context.Context, string) (*services.EmbeddingResponse, error) {
	return &services.EmbeddingResponse{Vector: make([]float32, services.EmbeddingDimensions)}, nil
}

type stubRetriever struct{ results []services.SemanticResult }

func (r stubRetriever) SemanticSearch(context.Context, services.LLMProvider, string, string, int) ([]services.SemanticResult, error) {
	return r.results, nil
}

func TestPostMessageReturnsSessionUserAndAssistant(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db, Chat: services.NewChatService(db, answeringProvider{answer: "Informasi belum tersedia."}, time.Second, stubRetriever{})}
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	request := httptest.NewRequest("POST", "/sessions/"+fmt.Sprint(s.ID)+"/messages", strings.NewReader(`{"message":"  Ada event apa?  "}`))
	request.Header.Set("Content-Type", "application/json")
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	body := decodeJSONBody(t, response)
	if _, legacy := body["assistant"]; legacy {
		t.Fatalf("legacy assistant key present: %v", body)
	}
	session := body["session"].(map[string]any)
	user := body["user_message"].(map[string]any)
	assistant := body["assistant_message"].(map[string]any)
	if session["id"] != float64(s.ID) || session["last_message_at"] == nil {
		t.Fatalf("session = %v", session)
	}
	if user["role"] != "user" || user["content"] != "Ada event apa?" || user["metadata"] != nil || user["session_id"] != float64(s.ID) {
		t.Fatalf("user_message = %v", user)
	}
	metadata := assistant["metadata"].(map[string]any)
	if assistant["role"] != "assistant" || assistant["status"] != "complete" || metadata["retrieval_status"] != "no_source" || assistant["id"].(float64) <= user["id"].(float64) {
		t.Fatalf("assistant_message = %v", assistant)
	}
	var count int64
	db.Model(&models.ChatMessage{}).Where("session_id = ?", s.ID).Count(&count)
	if count != 2 {
		t.Fatalf("stored messages = %d", count)
	}
}

func TestCreateSessionReplacesInvalidVisitorCookie(t *testing.T) {
	db := testChatDB(t)
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Post("/sessions", h.CreateSession)
	request := httptest.NewRequest("POST", "/sessions", nil)
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: "pilihan-klien"})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	cookie := response.Header.Get("Set-Cookie")
	if !strings.Contains(cookie, VisitorCookieName+"=") || strings.Contains(cookie, "pilihan-klien") {
		t.Fatalf("Set-Cookie = %q", cookie)
	}
	var session models.ChatSession
	if err := db.First(&session).Error; err != nil {
		t.Fatal(err)
	}
	if !validVisitorID(session.VisitorID) {
		t.Fatalf("stored visitor_id = %q", session.VisitorID)
	}
}

func TestCreateSessionKeepsValidVisitorCookie(t *testing.T) {
	db := testChatDB(t)
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Post("/sessions", h.CreateSession)
	request := httptest.NewRequest("POST", "/sessions", nil)
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.Header.Get("Set-Cookie") != "" {
		t.Fatal("valid cookie must not be replaced")
	}
	var session models.ChatSession
	if err := db.First(&session).Error; err != nil || session.VisitorID != visitorA {
		t.Fatalf("visitor_id = %q err = %v", session.VisitorID, err)
	}
}

func TestMessagesRejectsNonUUIDVisitorCookie(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: "bukan-uuid", Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Get("/sessions/:id/messages", h.Messages)
	request := httptest.NewRequest("GET", "/sessions/"+fmt.Sprint(s.ID)+"/messages", nil)
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: "bukan-uuid"})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestValidVisitorID(t *testing.T) {
	const hexVisitor = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
	for value, want := range map[string]bool{visitorA: true, hexVisitor: true, "": false, "bukan-uuid": false, strings.ToUpper(hexVisitor): false, "{" + visitorA + "}": false, "urn:uuid:" + visitorA: false} {
		if got := validVisitorID(value); got != want {
			t.Fatalf("validVisitorID(%q) = %v", value, got)
		}
	}
}

func TestCreateSessionReturnsContractSessionWithoutVisitorID(t *testing.T) {
	h := &ChatHandler{DB: testChatDB(t)}
	app := fiber.New()
	app.Post("/sessions", h.CreateSession)
	response, err := app.Test(httptest.NewRequest("POST", "/sessions", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusCreated {
		t.Fatalf("status = %d", response.StatusCode)
	}
	session, ok := decodeJSONBody(t, response)["session"].(map[string]any)
	if !ok {
		t.Fatal("session missing")
	}
	if _, leaked := session["visitor_id"]; leaked {
		t.Fatalf("visitor_id must not be exposed: %v", session)
	}
	for _, key := range []string{"id", "status", "title", "last_message_at", "created_at"} {
		if _, ok := session[key]; !ok {
			t.Fatalf("key %q missing: %v", key, session)
		}
	}
}

func TestMessagesReturnSnakeCaseMessagesWithMinimalMetadata(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	question, answer := "Di mana Budaya A?", "Jawaban"
	rows := []models.ChatMessage{
		{SessionID: s.ID, Role: "user", Status: "complete", Content: &question},
		{SessionID: s.ID, Role: "assistant", Status: "complete", Content: &answer, Metadata: json.RawMessage(`{"model":"m","retrieval_status":"relevant","context_k":1,"sources":[{"source_type":"culture","source_id":1,"source_label":"Budaya A","similarity":0.61}]}`)},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db}
	app := fiber.New()
	app.Get("/sessions/:id/messages", h.Messages)
	request := httptest.NewRequest("GET", "/sessions/"+fmt.Sprint(s.ID)+"/messages", nil)
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	body := decodeJSONBody(t, response)
	session, ok := body["session"].(map[string]any)
	if !ok || session["id"] != float64(s.ID) {
		t.Fatalf("session missing in history: %v", body)
	}
	messages := body["messages"].([]any)
	assistant := messages[1].(map[string]any)
	metadata := assistant["metadata"].(map[string]any)
	if _, leaked := metadata["model"]; leaked || assistant["session_id"] != float64(s.ID) || assistant["role"] != "assistant" {
		t.Fatalf("assistant = %v", assistant)
	}
	source := metadata["sources"].([]any)[0].(map[string]any)
	if _, ok := source["slug"]; !ok || source["slug"] != nil {
		t.Fatalf("card fields must be present and null without card data: %v", source)
	}
}

func TestHealthReportsAvailabilityOnly(t *testing.T) {
	for name, tc := range map[string]struct {
		provider services.LLMProvider
		want     bool
	}{
		"no health check": {answeringProvider{answer: "x"}, true},
		"not configured":  {services.NewUnavailableProvider(errors.New("missing")), false},
	} {
		t.Run(name, func(t *testing.T) {
			h := &ChatHandler{Chat: services.NewChatService(nil, tc.provider, time.Second)}
			app := fiber.New()
			app.Get("/health", h.Health)
			response, err := app.Test(httptest.NewRequest("GET", "/health", nil))
			if err != nil {
				t.Fatal(err)
			}
			body := decodeJSONBody(t, response)
			if response.StatusCode != fiber.StatusOK || body["success"] != true || body["available"] != tc.want || len(body) != 2 {
				t.Fatalf("status=%d body=%v", response.StatusCode, body)
			}
		})
	}
}

type blockingProvider struct{}

func (blockingProvider) Name() string { return "test:block" }
func (blockingProvider) Chat(ctx context.Context, _ []services.ChatMessage) (string, error) {
	<-ctx.Done()
	return "", ctx.Err()
}
func (blockingProvider) Embed(ctx context.Context, _ string) (*services.EmbeddingResponse, error) {
	<-ctx.Done()
	return nil, ctx.Err()
}

func TestPostMessageChatTimeoutStoresFailedReplyAndReturns504(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	h := &ChatHandler{DB: db, Chat: services.NewChatService(db, blockingProvider{}, 50*time.Millisecond, stubRetriever{})}
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	request := httptest.NewRequest("POST", "/sessions/"+fmt.Sprint(s.ID)+"/messages", strings.NewReader(`{"message":"halo"}`))
	request.Header.Set("Content-Type", "application/json")
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
	response, err := app.Test(request, 5000)
	if err != nil {
		t.Fatal(err)
	}
	errBody, _ := decodeJSONBody(t, response)["error"].(map[string]any)
	if response.StatusCode != fiber.StatusGatewayTimeout || errBody["code"] != "AI_TIMEOUT" {
		t.Fatalf("status=%d error=%v", response.StatusCode, errBody)
	}
	var messages []models.ChatMessage
	db.Where("session_id = ?", s.ID).Order("id").Find(&messages)
	if len(messages) != 2 || messages[1].Status != "failed" {
		t.Fatalf("messages = %+v", messages)
	}
}

func TestVisitorCookieAttributes(t *testing.T) {
	for _, tc := range []struct {
		https      string
		wantSecure bool
	}{{"true", true}, {"", false}} {
		t.Run("HTTPS="+tc.https, func(t *testing.T) {
			t.Setenv("HTTPS", tc.https)
			h := &ChatHandler{DB: testChatDB(t)}
			app := fiber.New()
			app.Post("/sessions", h.CreateSession)
			response, err := app.Test(httptest.NewRequest("POST", "/sessions", nil))
			if err != nil {
				t.Fatal(err)
			}
			cookie := strings.ToLower(response.Header.Get("Set-Cookie"))
			if !strings.Contains(cookie, "httponly") || !strings.Contains(cookie, "samesite=lax") || strings.Contains(cookie, "secure") != tc.wantSecure {
				t.Fatalf("Set-Cookie = %q", cookie)
			}
		})
	}
}

type rateLimitedProvider struct{ answeringProvider }

func (rateLimitedProvider) Embed(context.Context, string) (*services.EmbeddingResponse, error) {
	return nil, &services.ProviderError{Provider: "test", Kind: "rate_limit"}
}

// The handler provider answers 429; a provider built from env (closed port) would answer 503.
func TestSemanticUsesSharedProvider(t *testing.T) {
	db := testChatDB(t)
	h := &ChatHandler{DB: db, Chat: services.NewChatService(db, rateLimitedProvider{}, time.Second), Retriever: services.NewRetriever(db)}
	t.Setenv("LLM_PROVIDER", "ollama")
	t.Setenv("OLLAMA_BASE_URL", "http://127.0.0.1:9")
	app := fiber.New()
	app.Post("/search/semantic", h.Semantic)
	request := httptest.NewRequest("POST", "/search/semantic", strings.NewReader(`{"query":"Candi"}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request, 5000)
	if err != nil {
		t.Fatal(err)
	}
	errBody, _ := decodeJSONBody(t, response)["error"].(map[string]any)
	if response.StatusCode != fiber.StatusTooManyRequests || errBody["code"] != "AI_RATE_LIMITED" {
		t.Fatalf("status=%d error=%v", response.StatusCode, errBody)
	}
}

func TestInvalidSessionIDReturns400(t *testing.T) {
	h := &ChatHandler{DB: testChatDB(t)}
	app := fiber.New()
	app.Get("/sessions/:id/messages", h.Messages)
	app.Post("/sessions/:id/messages", h.PostMessage)
	for _, id := range []string{"abc", "0", "-1", "1.5"} {
		for _, method := range []string{"GET", "POST"} {
			request := httptest.NewRequest(method, "/sessions/"+id+"/messages", strings.NewReader(`{"message":"halo"}`))
			request.Header.Set("Content-Type", "application/json")
			response, err := app.Test(request)
			if err != nil {
				t.Fatal(err)
			}
			errBody, _ := decodeJSONBody(t, response)["error"].(map[string]any)
			if response.StatusCode != fiber.StatusBadRequest || errBody["code"] != "INVALID_SESSION_ID" {
				t.Fatalf("%s %s: status=%d error=%v", method, id, response.StatusCode, errBody)
			}
		}
	}
}

func TestMessageLengthCountsCharacters(t *testing.T) {
	h := &ChatHandler{DB: testChatDB(t)}
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	cases := map[int]int{2000: fiber.StatusNotFound, 2001: fiber.StatusRequestEntityTooLarge}
	for runes, want := range cases {
		body := `{"message":"` + strings.Repeat("é", runes) + `"}`
		request := httptest.NewRequest("POST", "/sessions/999/messages", strings.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
		response, err := app.Test(request)
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != want {
			t.Fatalf("%d runes (%d bytes): status %d, want %d", runes, len(strings.Repeat("é", runes)), response.StatusCode, want)
		}
	}
}

func closedChatDB(t *testing.T) (*gorm.DB, models.ChatSession) {
	t.Helper()
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	_ = sqlDB.Close()
	return db, s
}

func TestDatabaseFailureReturns500NotSessionNotFound(t *testing.T) {
	db, s := closedChatDB(t)
	h := &ChatHandler{DB: db, Chat: services.NewChatService(db, answeringProvider{answer: "x"}, time.Second, stubRetriever{})}
	app := fiber.New()
	app.Get("/sessions/:id/messages", h.Messages)
	app.Post("/sessions/:id/messages", h.PostMessage)
	app.Post("/sessions", h.CreateSession)
	requests := []*http.Request{
		httptest.NewRequest("GET", "/sessions/"+fmt.Sprint(s.ID)+"/messages", nil),
		httptest.NewRequest("POST", "/sessions/"+fmt.Sprint(s.ID)+"/messages", strings.NewReader(`{"message":"halo"}`)),
		httptest.NewRequest("POST", "/sessions", nil),
	}
	for _, request := range requests {
		request.Header.Set("Content-Type", "application/json")
		request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
		response, err := app.Test(request)
		if err != nil {
			t.Fatal(err)
		}
		body := decodeJSONBody(t, response)
		errBody, _ := body["error"].(map[string]any)
		if response.StatusCode != fiber.StatusInternalServerError || errBody["code"] != "INTERNAL_ERROR" || strings.Contains(fmt.Sprint(body), "sql") {
			t.Fatalf("%s %s: status=%d body=%v", request.Method, request.URL.Path, response.StatusCode, body)
		}
	}
}

func TestPostMessageKeepsAnswerTextAndSourcesInMetadata(t *testing.T) {
	db := testChatDB(t)
	s := models.ChatSession{VisitorID: visitorA, Status: "active"}
	if err := db.Create(&s).Error; err != nil {
		t.Fatal(err)
	}
	sourceType, sourceID, label := "culture", int64(7), "Tari Terbang"
	retrieved := []services.SemanticResult{{SourceType: &sourceType, SourceID: &sourceID, SourceLabel: &label, Answer: "Kesenian khas Pasuruan.", Similarity: 0.7, RelevanceStatus: "relevant"}}
	answer := "Tari Terbang adalah kesenian khas Pasuruan. Ingin tahu hal lain tentang budaya Pasuruan?"
	h := &ChatHandler{DB: db, Chat: services.NewChatService(db, answeringProvider{answer: answer}, time.Second, stubRetriever{results: retrieved})}
	app := fiber.New()
	app.Post("/sessions/:id/messages", h.PostMessage)
	request := httptest.NewRequest("POST", "/sessions/"+fmt.Sprint(s.ID)+"/messages", strings.NewReader(`{"message":"Apa itu Tari Terbang?"}`))
	request.Header.Set("Content-Type", "application/json")
	request.AddCookie(&http.Cookie{Name: VisitorCookieName, Value: visitorA})
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	assistant := decodeJSONBody(t, response)["assistant_message"].(map[string]any)
	// Owner jobdesk 6 option B (2026-11-02): the answer text is kept and ends with the used source names.
	if assistant["content"] != answer+"\n\nSumber: "+label {
		t.Fatalf("answer text changed or source line wrong: %q", assistant["content"])
	}
	metadata := assistant["metadata"].(map[string]any)
	sources := metadata["sources"].([]any)
	if metadata["retrieval_status"] != "relevant" || metadata["context_k"] != float64(1) || len(sources) != 1 || sources[0].(map[string]any)["source_label"] != label {
		t.Fatalf("metadata = %v", metadata)
	}
	for _, internal := range []string{"intent", "requested_count", "available_count", "grounding", "context_truncated", "retrieval_candidates", "model"} {
		if _, leaked := metadata[internal]; leaked {
			t.Fatalf("diagnostic %q exposed to the frontend: %v", internal, metadata)
		}
	}
}
