package database

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/utils"
)

var DB *gorm.DB

// Connection pool defaults (E1, jobdesk 2 Nov, 2026-11-03). Without a limit every concurrent request may open its
// own connection until PostgreSQL refuses new clients (max_connections, 100 by default); with it, extra requests
// wait briefly for a free connection instead of failing.
const (
	defaultMaxOpenConns       = 20
	defaultMaxIdleConns       = 10
	defaultConnMaxLifetimeMin = 30
)

// poolSetting reads a positive integer from env, or returns def for an empty or invalid value.
func poolSetting(name string, def int) int {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		log.Printf("[Database] %s=%q is not a positive integer; using %d", name, v, def)
		return def
	}
	return n
}

// configurePool applies DB_MAX_OPEN_CONNS, DB_MAX_IDLE_CONNS, and DB_CONN_MAX_LIFETIME_MIN to the connection pool.
func configurePool(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	sqlDB.SetMaxOpenConns(poolSetting("DB_MAX_OPEN_CONNS", defaultMaxOpenConns))
	sqlDB.SetMaxIdleConns(poolSetting("DB_MAX_IDLE_CONNS", defaultMaxIdleConns))
	sqlDB.SetConnMaxLifetime(time.Duration(poolSetting("DB_CONN_MAX_LIFETIME_MIN", defaultConnMaxLifetimeMin)) * time.Minute)
	return nil
}

// sqlLogLevel logs every SQL statement outside production only. Statements carry chat messages, AI
// answers, and embeddings; production logs keep only slow queries and errors (Warn), so chat content does
// not outlive the chat retention purge in the logs (audit 2026-11-02).
func sqlLogLevel(appEnv string) logger.LogLevel {
	if appEnv == "production" {
		return logger.Warn
	}
	return logger.Info
}

func isPostgres() bool {
	driver := strings.ToLower(os.Getenv("DB_DRIVER"))
	return driver == "postgres" || driver == "postgresql" || os.Getenv("DB_HOST") != ""
}

func ConnectDB() {
	var err error
	dbDriver := strings.ToLower(os.Getenv("DB_DRIVER"))

	if dbDriver == "postgres" || dbDriver == "postgresql" || os.Getenv("DB_HOST") != "" {
		host := os.Getenv("DB_HOST")
		if host == "" {
			host = "localhost"
		}
		port := os.Getenv("DB_PORT")
		if port == "" {
			port = "5432"
		}
		user := os.Getenv("DB_USER")
		if user == "" {
			user = "postgres"
		}
		password := os.Getenv("DB_PASSWORD")
		if password == "" {
			if os.Getenv("APP_ENV") == "production" {
				log.Fatal("[FATAL] DB_PASSWORD environment variable is not set in production mode. Refusing to start.")
			}
			password = "postgres"
		}
		dbname := os.Getenv("DB_NAME")
		if dbname == "" {
			dbname = "pasinfo"
		}
		sslmode := os.Getenv("DB_SSLMODE")
		if sslmode == "" {
			sslmode = "disable"
		}

		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			host, user, password, dbname, port, sslmode)

		log.Printf("[Database] Connecting to PostgreSQL at %s:%s (db=%s)...", utils.SafeLogValue(host), utils.SafeLogValue(port), utils.SafeLogValue(dbname))
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(sqlLogLevel(os.Getenv("APP_ENV"))),
		})
	} else {
		dbPath := os.Getenv("DB_PATH")
		if dbPath == "" {
			dbPath = "./internal/data/wildan-news.db"
		}
		log.Printf("[Database] Connecting to SQLite at %s...", utils.SafeLogValue(dbPath))
		DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
			Logger: logger.Default.LogMode(sqlLogLevel(os.Getenv("APP_ENV"))),
		})
	}

	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}
	if err := configurePool(DB); err != nil {
		log.Fatal("Failed to configure the database connection pool. \n", err)
	}

	log.Println("Connected to Database")

	// Rename password_reset_otps or verifiy_otps to verify_otps if old table exists
	if DB.Migrator().HasTable("password_reset_otps") && !DB.Migrator().HasTable("verify_otps") {
		_ = DB.Migrator().RenameTable("password_reset_otps", "verify_otps")
	}
	if DB.Migrator().HasTable("verifiy_otps") && !DB.Migrator().HasTable("verify_otps") {
		_ = DB.Migrator().RenameTable("verifiy_otps", "verify_otps")
	}
	dropRemovedTables(DB)

	err = DB.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.News{},
		&models.NewsImage{},
		&models.Notification{},
		&models.Province{},
		&models.Regency{},
		&models.District{},
		&models.Village{},
		&models.History{},
		&models.Ad{},
		&models.VerifyOTP{},
		&models.Region{}, &models.TravelCategory{}, &models.Place{}, &models.Destination{},
		&models.DestinationPrice{}, &models.Facility{}, &models.DestinationWeather{}, &models.Media{},
		&models.OpeningHour{}, &models.TravelSource{}, &models.Sourceable{}, &models.Verification{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database. \n", err)
	}

	if isPostgres() {
		if err := DB.Exec("CREATE EXTENSION IF NOT EXISTS vector").Error; err != nil {
			log.Printf("[Database] pgvector unavailable; AI embeddings disabled: %v", err)
		} else {
			if err := DB.AutoMigrate(
				&models.Region{}, &models.TravelCategory{}, &models.Place{}, &models.Destination{},
				&models.Culinary{}, &models.CulinaryMenu{}, &models.Culture{}, &models.Event{},
				&models.EventOccurrence{}, &models.EventTicket{}, &models.TravelSource{},
				&models.Sourceable{}, &models.Verification{}, &models.ChatSession{}, &models.ChatMessage{},
				&models.FAQKnowledgeBase{},
			); err != nil {
				log.Fatalf("Failed to migrate additive travel/AI schema: %v", err)
			}
			// The idx_faq_knowledge_source of 2026-11-03 was not unique; it is dropped once here and created unique by the
			// statement list below (F2). The check is plain Go so the startup SQL needs no PL/pgSQL block.
			var nonUnique int64
			if err := DB.Raw("SELECT count(*) FROM pg_indexes WHERE indexname = 'idx_faq_knowledge_source' AND indexdef NOT LIKE 'CREATE UNIQUE%'").Scan(&nonUnique).Error; err != nil {
				log.Fatalf("Failed to inspect FAQ source index: %v", err)
			}
			if nonUnique > 0 {
				if err := DB.Exec("DROP INDEX idx_faq_knowledge_source").Error; err != nil {
					log.Fatalf("Failed to replace FAQ source index: %v", err)
				}
			}
			for _, statement := range []string{
				"ALTER TABLE faq_knowledge_bases ADD COLUMN IF NOT EXISTS source_type varchar(20)",
				"ALTER TABLE faq_knowledge_bases ADD COLUMN IF NOT EXISTS source_id bigint",
				"ALTER TABLE faq_knowledge_bases ADD COLUMN IF NOT EXISTS source_label text",
				"ALTER TABLE faq_knowledge_bases ADD COLUMN IF NOT EXISTS source_url text",
				"ALTER TABLE faq_knowledge_bases ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz",
				// AutoMigrate never turns an existing nullable column into NOT NULL; the ERD NOT NULL
				// columns of the AI tables are set here (idempotent; the model tags cover new databases).
				"ALTER TABLE faq_knowledge_bases ALTER COLUMN question SET NOT NULL, ALTER COLUMN answer SET NOT NULL, ALTER COLUMN category SET NOT NULL, ALTER COLUMN is_active SET NOT NULL, ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN updated_at SET NOT NULL",
				"ALTER TABLE chat_sessions ALTER COLUMN visitor_id SET NOT NULL, ALTER COLUMN status SET NOT NULL, ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN updated_at SET NOT NULL",
				"ALTER TABLE chat_messages ALTER COLUMN session_id SET NOT NULL, ALTER COLUMN role SET NOT NULL, ALTER COLUMN status SET NOT NULL, ALTER COLUMN created_at SET NOT NULL",
				// Single-column indexes made redundant by the composite ERD indexes (E3, 2026-11-03); AutoMigrate
				// never drops an index, so they are removed here.
				"DROP INDEX IF EXISTS idx_chat_sessions_visitor_id",
				"DROP INDEX IF EXISTS idx_chat_messages_session_id",
				// One corpus row per source (F2, jobdesk 2 Nov p4, 2026-11-03): the 2026-11-03 index was not unique and
				// AutoMigrate never changes an existing index, so it is replaced once; the model tag covers new databases.
				"CREATE UNIQUE INDEX IF NOT EXISTS idx_faq_knowledge_source ON faq_knowledge_bases (source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL",
			} {
				if err := DB.Exec(statement).Error; err != nil {
					log.Fatalf("Failed additive FAQ schema setup: %v", err)
				}
			}
			if err := DB.Exec("CREATE INDEX IF NOT EXISTS idx_faq_knowledge_bases_embedding_hnsw ON faq_knowledge_bases USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL").Error; err != nil {
				log.Fatalf("Failed to create FAQ embedding index: %v", err)
			}
		}
	}

	if !DB.Migrator().HasColumn("news_images", "image_caption") {
		if err := DB.Migrator().AddColumn(&models.NewsImage{}, "image_caption"); err != nil {
			log.Printf("[Database] Failed to add news image caption: %v", err)
		}
	}

	if dbDriver == "postgres" || dbDriver == "postgresql" || os.Getenv("DB_HOST") != "" {
		_ = DB.Exec("SELECT setval(pg_get_serial_sequence('news_images', 'id'), coalesce(max(id), 1)) FROM news_images;").Error
		_ = DB.Exec(sequenceCatchUpSQL("news")).Error
	}

	if os.Getenv("RUN_STARTUP_SEED") == "true" {
		SeedDatabase()
		if os.Getenv("RUN_WILAYAH_SEED") == "true" {
			SeedWilayah()
		}
	} else {
		log.Println("[Seed] Startup seed disabled; use explicit seed commands or RUN_STARTUP_SEED=true")
	}
}

// removedTables were dropped from the models (Owner 2026-11-09: news is served by the news table); listed so that a
// child table goes before its parent (articles references article_categories). AutoMigrate never drops a table.
var removedTables = []string{"articles", "article_categories"}

// dropRemovedTables drops each removed table that still exists and is empty, so staging and production lose them at the
// next start without a manual step. A table that holds rows is kept and reported: no data is deleted automatically.
func dropRemovedTables(db *gorm.DB) {
	for _, table := range removedTables {
		if !db.Migrator().HasTable(table) {
			continue
		}
		var rows int64
		if err := db.Table(table).Count(&rows).Error; err != nil {
			log.Printf("[Database] %s not dropped: %v", table, err)
			continue
		}
		if rows > 0 {
			log.Printf("[Database] %s holds %d rows; kept, drop it by hand after a backup", table, rows)
			continue
		}
		if err := db.Migrator().DropTable(table); err != nil {
			log.Printf("[Database] %s not dropped: %v", table, err)
			continue
		}
		log.Printf("[Database] dropped empty removed table %s", table)
	}
}

// sequenceCatchUpSQL moves the id sequence of a table up to its highest id (rows may have been copied in with explicit
// ids) and never back: setting it to max(id) on every process start gave the id of a deleted newest news item to the next
// fetched one, so old links and chat sources pointed at another article (W1, jobdesk 6 Nov, 2026-11-06).
func sequenceCatchUpSQL(table string) string {
	sequence := fmt.Sprintf("pg_get_serial_sequence('%s', 'id')", table)
	return fmt.Sprintf("SELECT setval(%s, GREATEST(coalesce(max(id), 1), coalesce(pg_sequence_last_value(%s::regclass), 1))) FROM %s;", sequence, sequence, table)
}

func SeedDatabase() {
	log.Println("Checking database seed users...")
	seedPassword := os.Getenv("SEED_USER_PASSWORD")
	if seedPassword == "" {
		// No built-in default password in any environment
		log.Println("[WARN] SEED_USER_PASSWORD is not set — skipping seed users")
		return
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(seedPassword), bcrypt.DefaultCost)

	users := []models.User{
		{
			Name:       "Admin Pasinfo",
			Email:      "admin@pasuruaninfo.com",
			Password:   string(hashedPassword),
			Role:       "admin",
			IsVerified: 1,
		},
		{
			Name:       "Penulis Pasinfo",
			Email:      "penulis@pasuruaninfo.com",
			Password:   string(hashedPassword),
			Role:       "penulis",
			IsVerified: 1,
		},
		{
			Name:       "Editor Pasinfo",
			Email:      "editor@pasuruaninfo.com",
			Password:   string(hashedPassword),
			Role:       "editor",
			IsVerified: 1,
		},
		{
			Name:       "Member Pasinfo",
			Email:      "member@pasuruaninfo.com",
			Password:   string(hashedPassword),
			Role:       "member",
			IsVerified: 1,
		},
	}

	for _, u := range users {
		var existing models.User
		if err := DB.Where("email = ?", u.Email).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := DB.Create(&u).Error; err != nil {
					log.Printf("Failed to seed user %s: %v\n", u.Email, err)
				} else {
					log.Printf("Successfully seeded user: %s\n", u.Email)
				}
			}
		} else {
			existing.Password = string(hashedPassword)
			if err := DB.Save(&existing).Error; err != nil {
				log.Printf("Failed to update password for user %s: %v\n", u.Email, err)
			} else {
				log.Printf("Successfully updated seed password for user: %s\n", u.Email)
			}
		}
	}
	log.Println("Database users seeding checked")

	categories := []models.Category{
		{Name: "NASIONAL", Slug: "nasional"},
		{Name: "LOKAL", Slug: "lokal"},
		{Name: "POLITIK", Slug: "politik"},
		{Name: "WISATA", Slug: "wisata"},
		{Name: "INSPIRATIF", Slug: "inspiratif"},
		{Name: "EKONOMI", Slug: "ekonomi"},
		{Name: "OLAHRAGA", Slug: "olahraga"},
		{Name: "TEKNOLOGI", Slug: "teknologi"},
		{Name: "HIBURAN", Slug: "hiburan"},
		{Name: "KESEHATAN", Slug: "kesehatan"},
		// prd navbar category (Lokal, Nasional, Internasional, Inspiratif, Politik); jobdesk 11 Nov point 4, P4-2, Owner.
		{Name: "INTERNASIONAL", Slug: "internasional"},
	}

	for _, cat := range categories {
		var count int64
		DB.Model(&models.Category{}).Where("slug = ?", cat.Slug).Count(&count)
		if count == 0 {
			if err := DB.Create(&cat).Error; err != nil {
				log.Printf("Failed to seed category %s: %v\n", cat.Name, err)
			}
		}
	}
	log.Println("Database categories seeding checked")
}

var wilayahFiles = map[string]struct{}{
	"provinces.csv": {},
	"regencies.csv": {},
	"districts.csv": {},
	"villages.csv":  {},
}

func safeWilayahPath(root, filename string) (string, error) {
	if _, ok := wilayahFiles[filename]; !ok {
		return "", fmt.Errorf("unknown wilayah seed file")
	}
	if strings.ContainsRune(root, '\x00') || strings.ContainsRune(filename, '\x00') {
		return "", fmt.Errorf("wilayah seed path contains NUL byte")
	}
	root, err := filepath.Abs(filepath.Clean(root))
	if err != nil {
		return "", err
	}
	path := filepath.Join(root, filename)
	rel, err := filepath.Rel(root, path)
	if err != nil || filepath.IsAbs(rel) || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("wilayah seed path escapes root")
	}
	return path, nil
}

func SeedWilayah() {
	var count int64
	DB.Model(&models.Province{}).Count(&count)
	if count > 0 {
		log.Println("Wilayah already seeded")
		return
	}

	basePaths := []string{
		"data/wilayah",
		"./data/wilayah",
		"scripts/node_modules/idn-area-data/data",
		"../scripts/node_modules/idn-area-data/data",
	}

	var basePath string
	for _, p := range basePaths {
		provincePath, err := safeWilayahPath(p, "provinces.csv")
		if err == nil {
			if _, err := os.Stat(provincePath); err == nil {
				basePath = p
				break
			}
		}
	}

	if basePath == "" {
		log.Println("[WARN] Wilayah CSV data files not found. Skipping Wilayah seeding.")
		return
	}
	log.Printf("[Wilayah] Seeding from path: %s", utils.SafeLogValue(basePath))

	// 1. Provinces
	log.Println("Seeding Provinces...")
	provPath, err := safeWilayahPath(basePath, "provinces.csv")
	if err != nil {
		log.Printf("Failed to resolve provinces seed: %v\n", err)
		return
	}
	provRows, err := readCSV(provPath)
	if err != nil {
		log.Printf("Failed to seed provinces: %v\n", err)
		return
	}
	var provinces []models.Province
	for i, row := range provRows {
		if i == 0 {
			continue
		}
		if len(row) >= 2 {
			provinces = append(provinces, models.Province{Code: row[0], Name: row[1]})
		}
	}
	DB.CreateInBatches(provinces, 500)
	log.Printf("Inserted %d provinces\n", len(provinces))

	// 2. Regencies
	log.Println("Seeding Regencies...")
	regPath, err := safeWilayahPath(basePath, "regencies.csv")
	if err != nil {
		log.Printf("Failed to resolve regencies seed: %v\n", err)
		return
	}
	regRows, err := readCSV(regPath)
	if err != nil {
		log.Printf("Failed to seed regencies: %v\n", err)
		return
	}
	var regencies []models.Regency
	for i, row := range regRows {
		if i == 0 {
			continue
		}
		if len(row) >= 3 {
			regencies = append(regencies, models.Regency{Code: row[0], ProvinceCode: row[1], Name: row[2]})
		}
	}
	DB.CreateInBatches(regencies, 500)
	log.Printf("Inserted %d regencies\n", len(regencies))

	// 3. Districts
	log.Println("Seeding Districts...")
	distPath, err := safeWilayahPath(basePath, "districts.csv")
	if err != nil {
		log.Printf("Failed to resolve districts seed: %v\n", err)
		return
	}
	distRows, err := readCSV(distPath)
	if err != nil {
		log.Printf("Failed to seed districts: %v\n", err)
		return
	}
	var districts []models.District
	for i, row := range distRows {
		if i == 0 {
			continue
		}
		if len(row) >= 3 {
			districts = append(districts, models.District{Code: row[0], RegencyCode: row[1], Name: row[2]})
		}
	}
	DB.CreateInBatches(districts, 1000)
	log.Printf("Inserted %d districts\n", len(districts))

	// 4. Villages
	log.Println("Seeding Villages...")
	vilPath, err := safeWilayahPath(basePath, "villages.csv")
	if err != nil {
		log.Printf("Failed to resolve villages seed: %v\n", err)
		return
	}
	vilRows, err := readCSV(vilPath)
	if err != nil {
		log.Printf("Failed to seed villages: %v\n", err)
		return
	}
	var villages []models.Village
	for i, row := range vilRows {
		if i == 0 {
			continue
		}
		if len(row) >= 3 {
			code := strings.TrimSpace(row[0])
			distCode := strings.TrimSpace(row[1])
			name := strings.TrimSpace(row[2])
			villages = append(villages, models.Village{Code: code, DistrictCode: distCode, Name: name})
		}
	}
	DB.CreateInBatches(villages, 2000)
	log.Printf("Inserted %d villages\n", len(villages))
	log.Println("Wilayah seeding completed successfully!")
}

func readCSV(filePath string) ([][]string, error) {
	rootPath, err := filepath.Abs(filepath.Dir(filePath))
	if err != nil {
		return nil, err
	}
	root, err := os.OpenRoot(rootPath)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	file, err := root.Open(filepath.Base(filePath))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	reader := csv.NewReader(file)
	reader.LazyQuotes = true
	return reader.ReadAll()
}
