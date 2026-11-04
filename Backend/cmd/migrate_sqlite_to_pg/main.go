package main

import (
	"fmt"
	"log"
	"os"

	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/utils"
)

func main() {
	_ = godotenv.Load()

	sqlitePath := os.Getenv("DB_PATH")
	if sqlitePath == "" {
		sqlitePath = "./internal/data/wildan-news.db"
	}

	log.Printf("[Migration] Connecting to SQLite source at %s...", utils.SafeLogValue(sqlitePath))
	sqliteDB, err := gorm.Open(sqlite.Open(sqlitePath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("[Migration] Failed to connect to SQLite: %v", err)
	}

	pgHost := os.Getenv("DB_HOST")
	if pgHost == "" {
		pgHost = "localhost"
	}
	pgPort := os.Getenv("DB_PORT")
	if pgPort == "" {
		pgPort = "5432"
	}
	pgUser := os.Getenv("DB_USER")
	if pgUser == "" {
		pgUser = "postgres"
	}
	pgPass := os.Getenv("DB_PASSWORD")
	if pgPass == "" {
		pgPass = "postgres"
	}
	pgDBName := os.Getenv("DB_NAME")
	if pgDBName == "" {
		pgDBName = "pasinfo"
	}
	pgSSL := os.Getenv("DB_SSLMODE")
	if pgSSL == "" {
		pgSSL = "disable"
	}

	pgDSN := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		pgHost, pgUser, pgPass, pgDBName, pgPort, pgSSL)

	log.Printf("[Migration] Connecting to PostgreSQL target at %s:%s (db=%s)...", utils.SafeLogValue(pgHost), utils.SafeLogValue(pgPort), utils.SafeLogValue(pgDBName))
	pgDB, err := gorm.Open(postgres.Open(pgDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("[Migration] Failed to connect to PostgreSQL: %v", err)
	}

	log.Println("[Migration] AutoMigrating schema on PostgreSQL...")
	err = pgDB.AutoMigrate(
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
	)
	if err != nil {
		log.Fatalf("[Migration] Schema AutoMigrate failed: %v", err)
	}

	// Clean target tables in correct dependency order
	pgDB.Exec("TRUNCATE TABLE histories, notifications, news_images, news, categories, users, villages, districts, regencies, provinces RESTART IDENTITY CASCADE;")

	// 1. Users
	var users []models.User
	if err := sqliteDB.Unscoped().Find(&users).Error; err == nil && len(users) > 0 {
		log.Printf("[Migration] Copying %d Users...", len(users))
		for _, u := range users {
			pgDB.Create(&u)
		}
		pgDB.Exec("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));")
	}

	// 2. Categories
	var categories []models.Category
	if err := sqliteDB.Unscoped().Find(&categories).Error; err == nil && len(categories) > 0 {
		log.Printf("[Migration] Copying %d Categories...", len(categories))
		for _, c := range categories {
			pgDB.Create(&c)
		}
		pgDB.Exec("SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1));")
	}

	// 3. News
	var newsList []models.News
	if err := sqliteDB.Unscoped().Find(&newsList).Error; err == nil && len(newsList) > 0 {
		log.Printf("[Migration] Copying %d News articles...", len(newsList))
		for _, n := range newsList {
			pgDB.Create(&n)
		}
		pgDB.Exec("SELECT setval(pg_get_serial_sequence('news', 'id'), COALESCE((SELECT MAX(id) FROM news), 1));")
	}

	// 4. NewsImages
	var newsImages []models.NewsImage
	if err := sqliteDB.Find(&newsImages).Error; err == nil && len(newsImages) > 0 {
		log.Printf("[Migration] Copying %d NewsImages...", len(newsImages))
		for _, img := range newsImages {
			pgDB.Create(&img)
		}
	}

	// 5. Notifications
	var notifications []models.Notification
	if err := sqliteDB.Unscoped().Find(&notifications).Error; err == nil && len(notifications) > 0 {
		log.Printf("[Migration] Copying %d Notifications...", len(notifications))
		for _, notif := range notifications {
			var userCount int64
			pgDB.Model(&models.User{}).Where("id = ?", notif.UserID).Count(&userCount)
			if userCount > 0 {
				pgDB.Create(&notif)
			}
		}
		pgDB.Exec("SELECT setval(pg_get_serial_sequence('notifications', 'id'), COALESCE((SELECT MAX(id) FROM notifications), 1));")
	}

	// 6. Provinces
	var provinces []models.Province
	if err := sqliteDB.Find(&provinces).Error; err == nil && len(provinces) > 0 {
		log.Printf("[Migration] Copying %d Provinces...", len(provinces))
		pgDB.CreateInBatches(provinces, 500)
	}

	// 7. Regencies
	var regencies []models.Regency
	if err := sqliteDB.Find(&regencies).Error; err == nil && len(regencies) > 0 {
		log.Printf("[Migration] Copying %d Regencies...", len(regencies))
		pgDB.CreateInBatches(regencies, 500)
	}

	// 8. Districts
	var districts []models.District
	if err := sqliteDB.Find(&districts).Error; err == nil && len(districts) > 0 {
		log.Printf("[Migration] Copying %d Districts...", len(districts))
		pgDB.CreateInBatches(districts, 1000)
	}

	// 9. Villages
	var villages []models.Village
	if err := sqliteDB.Find(&villages).Error; err == nil && len(villages) > 0 {
		log.Printf("[Migration] Copying %d Villages...", len(villages))
		pgDB.CreateInBatches(villages, 2000)
	}

	// 10. Histories
	var histories []models.History
	if err := sqliteDB.Unscoped().Find(&histories).Error; err == nil && len(histories) > 0 {
		log.Printf("[Migration] Copying %d Histories...", len(histories))
		for _, h := range histories {
			var userCount, newsCount int64
			pgDB.Model(&models.User{}).Where("id = ?", h.UserID).Count(&userCount)
			pgDB.Model(&models.News{}).Where("id = ?", h.NewsID).Count(&newsCount)
			if userCount > 0 && newsCount > 0 {
				pgDB.Create(&h)
			}
		}
		pgDB.Exec("SELECT setval(pg_get_serial_sequence('histories', 'id'), COALESCE((SELECT MAX(id) FROM histories), 1));")
	}

	log.Println("[Migration] SQLite to PostgreSQL migration completed successfully!")
}
