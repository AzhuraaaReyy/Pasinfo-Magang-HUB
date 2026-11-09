package main

import (
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/handlers"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/routes"
	"wildan-news-backend/internal/services"
)

func main() {
	// Load .env — only fatal if explicitly required; in containers the .env
	// is provided by the host and godotenv failing is acceptable.
	if err := godotenv.Load(); err != nil {
		log.Println("[Info] No .env file found — using environment variables from OS/container")
	}

	// Guard: refuse to start without critical secrets
	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("[FATAL] JWT_SECRET is not set. Refusing to start.")
	}
	if err := config.CheckJWTSecret(os.Getenv("APP_ENV"), os.Getenv("JWT_SECRET")); err != nil {
		log.Fatal("[FATAL] ", err, ". Refusing to start.")
	}

	// Connect to database
	database.ConnectDB()

	// Purge anonymous AI chat history older than the retention window
	services.StartChatRetentionJob(database.DB, config.ChatRetentionDays())

	// Keep the AI knowledge corpus in sync with the domain tables: embeds only new or changed documents
	// once the embedding provider is reachable, then every 15 minutes (no manual embed-faq run needed). It has its
	// own provider with one slot, so it adds at most one embedding call next to the chat traffic.
	if llm, err := services.NewLLMFromEnv(); err != nil {
		// The API still starts; chat answers 503 ai_unavailable and the corpus is not refreshed until the
		// provider env is fixed (the error names the missing variable, e.g. GEMINI_API_KEY).
		log.Printf("[AI] provider not configured, AI chat and corpus refresh are off: %v", err)
	} else {
		services.StartKnowledgeRefreshJob(database.DB, services.NewConcurrencyLimitedProvider(llm, 1), filepath.Join("cmd", "seed", "data"))
	}

	// Fetch new articles every 12 hours (first run 5 minutes after startup); no manual POST /news/fetch.
	services.StartNewsFetchJob()

	if os.Getenv("RUN_STARTUP_NEWS_FETCH") == "true" {
		var newsCount int64
		database.DB.Model(&models.News{}).Count(&newsCount)
		if newsCount == 0 {
			log.Println("[Seed] News table is empty — fetching initial articles...")
			go func() {
				result, err := services.FetchAndSaveNews()
				if err != nil {
					log.Printf("[Seed] Failed: %v", err)
					return
				}
				log.Printf("[Seed] Done — saved=%d skipped=%d errors=%d",
					result.Saved, result.Skipped, result.Errors)
			}()
		}
	} else {
		log.Println("[Seed] Startup news fetch disabled; use POST /api/v1/news/fetch or RUN_STARTUP_NEWS_FETCH=true")
	}

	// Parse body limit from env (default 50 MB; upload is gated separately)
	bodyLimitMB := 50
	if v := os.Getenv("BODY_LIMIT_MB"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			bodyLimitMB = n
		}
	}

	// Client IP behind a reverse proxy — disabled unless both env vars are set
	proxyHeader, trustedProxies, proxyEnabled := config.ProxyConfig()
	if !proxyEnabled && (proxyHeader != "" || len(trustedProxies) > 0) {
		log.Println("[WARN] PROXY_HEADER and TRUSTED_PROXIES must both be set; proxy header support disabled")
	}
	if !proxyEnabled {
		proxyHeader, trustedProxies = "", nil
	}

	app := fiber.New(fiber.Config{
		ProxyHeader:             proxyHeader,
		EnableTrustedProxyCheck: proxyEnabled,
		TrustedProxies:          trustedProxies,

		// Never expose Fiber version or Go runtime details
		ServerHeader: "",
		AppName:      "",

		// Strict body size limit (DoS protection)
		BodyLimit: bodyLimitMB * 1024 * 1024,

		// Read/Write timeouts to prevent slowloris attacks
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,

		// Disable X-Powered-By equivalent
		DisableDefaultDate: false,

		// Central error handler — never leak internal error details to client
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			msg := "An internal error occurred"

			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
				// Only expose user-safe messages for 4xx errors
				if code < 500 {
					msg = e.Message
				}
			}

			requestID, _ := c.Locals("request_id").(string)
			log.Printf("[ERROR] request_id=%s status=%d error=%v", requestID, code, err)

			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"message": msg,
			})
		},
	})

	// Recovery middleware — prevents panics from crashing the whole server
	app.Use(recover.New(recover.Config{
		EnableStackTrace: false, // Never expose stack traces in production
	}))

	// Structured request logging
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} latency=${latency} ip=${ip} reqid=${locals:request_id}\n",
		// Do NOT log request bodies — may contain passwords/tokens
	}))

	// Serve uploaded images from the same directory UploadImage saves to
	app.Static(handlers.UploadPublicPrefix, handlers.UploadRootPath(os.Getenv("UPLOAD_DIR")))

	// Register all routes (security middleware applied inside)
	routes.SetupRoutes(app)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("[Info] Pasinfo API starting on :%s (env=%s)", port, os.Getenv("APP_ENV"))
	for _, warning := range modeWarnings(os.Getenv("APP_ENV"), os.Getenv("HTTPS")) {
		log.Print(warning)
	}
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("[FATAL] Server failed to start: %v", err)
	}
}

// modeWarnings tells the operator at start what the current mode leaves open (T05, audit 2026-11-08): the mode comes
// from .env, whose example is set for local development, so a server started from a copied example would run with
// development settings without notice. Development stays allowed; nothing is refused.
func modeWarnings(appEnv, https string) []string {
	if appEnv != "production" {
		return []string{"[WARN] APP_ENV=" + strconv.Quote(appEnv) + " runs in development mode: SQL log at Info level (chat text included), " +
			"/api/v1/search/semantic open, CORS allows localhost, DB_PASSWORD and the example JWT_SECRET are not enforced. " +
			"On a server set APP_ENV=production."}
	}
	if https != "true" {
		return []string{"[WARN] APP_ENV=production with HTTPS not \"true\": the visitor cookie is sent without Secure and no HSTS header is set. " +
			"Set HTTPS=true when the API is served over TLS."}
	}
	return nil
}
