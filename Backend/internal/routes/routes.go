package routes

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/handlers"
	"wildan-news-backend/internal/middleware"
	"wildan-news-backend/internal/services"
)

// semanticSearchEnabled keeps the internal evaluation endpoint off in production (K5-01).
func semanticSearchEnabled(appEnv string) bool { return appEnv != "production" }

const readyTimeout = 2 * time.Second

// readyHandler reports whether the database answers a ping within readyTimeout (P3-1, jobdesk 30 Okt).
// /api/v1/health stays the liveness check used by the container healthcheck.
func readyHandler(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if db == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "not_ready"})
		}
		sqlDB, err := db.DB()
		if err == nil {
			ctx, cancel := context.WithTimeout(c.UserContext(), readyTimeout)
			defer cancel()
			err = sqlDB.PingContext(ctx)
		}
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "not_ready"})
		}
		return c.JSON(fiber.Map{"status": "ready"})
	}
}

// SetupRoutes registers all API routes for the application.
// Security layers applied:
//   - SecurityHeaders: applied globally on every response
//   - CORSConfig: strict allowlist (pasuruaninfo.com only in production)
//   - RequestID: unique ID attached to every request for traceability
//   - RateLimiter: per-IP rate limiting on auth endpoints
func SetupRoutes(app *fiber.App) {
	// ── Global middleware ────────────────────────────────────────────────────
	app.Use(middleware.RequestID())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORSConfig())

	// ── Root endpoint (welcome message) ──────────────────────────────────────
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Pasuruaninfo API is running",
		})
	})

	// ── Health check (unauthenticated, no rate limit) ────────────────────────
	app.Get("/api/v1/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Get("/api/v1/health/ready", readyHandler(database.DB))

	api := app.Group("/api/v1")
	llm, llmErr := services.NewLLMFromEnv()
	if llmErr != nil {
		llm = services.NewUnavailableProvider(llmErr)
	}
	llm = services.NewConcurrencyLimitedProvider(llm, config.LoadLLM().Concurrency)
	chatHandler := handlers.NewChatHandler(database.DB, llm)
	chat := api.Group("/chat", middleware.RateLimiterWithHandler(20, 60, handlers.ChatRateLimited), middleware.MaxBodyBytes(handlers.ChatBodyLimitBytes, handlers.ChatBodyTooLarge))
	chat.Post("/sessions", chatHandler.CreateSession)
	chat.Get("/sessions/:id/messages", chatHandler.Messages)
	chat.Post("/sessions/:id/messages", chatHandler.PostMessage)
	chat.Get("/health", chatHandler.Health)
	if semanticSearchEnabled(config.Env("APP_ENV")) {
		api.Post("/search/semantic", middleware.RateLimiterWithHandler(20, 60, handlers.ChatRateLimited), middleware.MaxBodyBytes(handlers.ChatBodyLimitBytes, handlers.ChatBodyTooLarge), chatHandler.Semantic)
	}
	domainHandler := handlers.NewDomainHandler(database.DB)
	domainHandler.Register(api)
	liveWisataHandler := handlers.NewWisataLiveHandler(database.DB, services.NewOpenWeatherClient(config.Env("WEATHER_API_KEY")), services.NewGoogleMapsClient(config.Env("GOOGLE_MAPS_SERVER_KEY")))
	liveWisataHandler.Register(api)
	wisataHandler := handlers.NewWisataHandler(database.DB)
	wisataHandler.Register(api)
	recommendationHandler := handlers.NewRecommendationHandler(services.NewRecommender(database.DB))
	// GET /recommendations/travel?q=… searches with the chat provider (jobdesk 9 Nov; path of jobdesk 10 Nov, Owner).
	recommendationHandler.Search, recommendationHandler.LLM = chatHandler.Retriever, llm
	recommendationHandler.Register(api)
	// /articles and /article-categories were removed (Owner 2026-11-09): the tables were empty and news is served by /news.

	// ── Auth endpoints (rate-limited: 10 req / 60s per IP) ───────────────────
	auth := api.Group("/auth", middleware.RateLimiter(10, 60))
	auth.Post("/register", handlers.Register)
	auth.Post("/send-register-otp", handlers.SendRegisterOTP)
	auth.Post("/login", handlers.Login)
	auth.Post("/forgot-password", handlers.ForgotPassword)
	auth.Post("/verify-otp", handlers.VerifyOTP)
	auth.Post("/reset-password", handlers.ResetPassword)

	// ── File upload (authenticated, rate-limited) ─────────────────────────────
	upload := api.Group("/upload", middleware.Protected(), middleware.RateLimiter(20, 60))
	upload.Post("/image", handlers.UploadImage)

	// ── Categories ────────────────────────────────────────────────────────────
	api.Get("/categories", handlers.GetCategories)
	api.Post("/categories",
		middleware.Protected(),
		middleware.RoleMiddleware("admin"),
		handlers.CreateCategory)
	api.Put("/categories/:id",
		middleware.Protected(),
		middleware.RoleMiddleware("admin"),
		handlers.UpdateCategory)
	api.Delete("/categories/:id",
		middleware.Protected(),
		middleware.RoleMiddleware("admin"),
		handlers.DeleteCategory)

	// ── Users (all protected) ─────────────────────────────────────────────────
	users := api.Group("/users", middleware.Protected())
	users.Get("/", middleware.RoleMiddleware("admin", "editor"), handlers.GetUsers)
	users.Get("/:id", handlers.GetUserDetail)
	users.Post("/", middleware.RoleMiddleware("admin"), handlers.CreateUser)
	// UpdateUser: users can only update themselves (enforced inside handler)
	users.Put("/:id", handlers.UpdateUser)
	users.Delete("/:id", middleware.RoleMiddleware("admin"), handlers.DeleteUser)

	// ── News — public reads ───────────────────────────────────────────────────
	api.Get("/news", handlers.GetNews)
	api.Get("/news/category/:category", handlers.GetNewsByCategory)

	// ── News — protected writes ───────────────────────────────────────────────
	// NOTE: specific sub-routes MUST be declared BEFORE :id wildcard
	api.Post("/news",
		middleware.Protected(),
		middleware.RoleMiddleware("penulis"),
		handlers.CreateNews)
	api.Get("/news/mine",
		middleware.Protected(),
		middleware.RoleMiddleware("penulis"),
		handlers.GetMyNews)
	api.Get("/news/pending",
		middleware.Protected(),
		middleware.RoleMiddleware("editor", "admin"),
		handlers.GetPendingNews)
	api.Put("/news/:id/status",
		middleware.Protected(),
		middleware.RoleMiddleware("penulis", "editor", "admin"),
		handlers.UpdateNewsStatus)
	api.Put("/news/:id",
		middleware.Protected(),
		middleware.RoleMiddleware("penulis", "editor", "admin"),
		handlers.UpdateNews)
	api.Delete("/news/all",
		middleware.Protected(),
		middleware.RoleMiddleware("admin"),
		handlers.DeleteAllNews)
	api.Delete("/news/:id",
		middleware.Protected(),
		middleware.RoleMiddleware("admin"),
		handlers.DeleteNews)

	// Wildcard MUST be last
	api.Get("/news/:id", handlers.GetNewsDetail)

	// ── Internal fetch trigger (admin only) ───────────────────────────────────
	api.Post("/news/fetch",
		middleware.Protected(),
		middleware.RoleMiddleware("admin"),
		handlers.FetchNewsFromAPI)

	// ── Notifications ─────────────────────────────────────────────────────────
	notifications := api.Group("/notifications", middleware.Protected())
	notifications.Get("/", handlers.GetNotifications)
	notifications.Put("/:id/read", handlers.MarkNotificationRead)

	// ── Wilayah (public, no auth needed) ─────────────────────────────────────
	wilayah := api.Group("/wilayah")
	wilayah.Get("/provinces", handlers.GetProvinces)
	wilayah.Get("/regencies/:province_code", handlers.GetRegencies)
	wilayah.Get("/districts/:regency_code", handlers.GetDistricts)
	wilayah.Get("/villages/:district_code", handlers.GetVillages)

	// ── Reading history ───────────────────────────────────────────────────────
	histories := api.Group("/histories", middleware.Protected())
	histories.Post("/", handlers.CreateHistory)
	histories.Get("/", handlers.GetMyHistories)
	histories.Delete("/", handlers.DeleteHistory)

	// ── Ads ───────────────────────────────────────────────────────────────────
	api.Get("/ads", handlers.GetAds)
	api.Get("/ads/slot/:slot", handlers.GetActiveAdBySlot)
	api.Post("/ads", middleware.Protected(), middleware.RoleMiddleware("admin"), handlers.CreateAd)
	api.Put("/ads/:id", middleware.Protected(), middleware.RoleMiddleware("admin"), handlers.UpdateAd)
	api.Delete("/ads/:id", middleware.Protected(), middleware.RoleMiddleware("admin"), handlers.DeleteAd)
}
