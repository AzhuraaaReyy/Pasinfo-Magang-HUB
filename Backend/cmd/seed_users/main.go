package main

import (
	"log"
	"os"

	"wildan-news-backend/internal/models"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	// Development helper only: refuse to run in production and never use a built-in password
	if os.Getenv("APP_ENV") == "production" {
		log.Fatal("[FATAL] seed_users is a development tool and must not run with APP_ENV=production")
	}
	password := os.Getenv("SEED_USER_PASSWORD")
	if password == "" {
		log.Fatal("[FATAL] SEED_USER_PASSWORD is not set. Refusing to seed users.")
	}

	db, err := gorm.Open(sqlite.Open("./internal/data/wildan-news.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	if err := db.AutoMigrate(&models.User{}); err != nil {
		log.Fatalf("gagal AutoMigrate user: %v", err)
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	users := []models.User{
		{
			Name:     "Admin Pasinfo",
			Email:    "admin@pasuruaninfo.com",
			Password: string(hashedPassword),
			Role:     "admin",
		},
		{
			Name:     "Penulis Pasinfo",
			Email:    "penulis@pasuruaninfo.com",
			Password: string(hashedPassword),
			Role:     "penulis",
		},
		{
			Name:     "Editor Pasinfo",
			Email:    "editor@pasuruaninfo.com",
			Password: string(hashedPassword),
			Role:     "editor",
		},
	}

	for _, u := range users {
		var existing models.User
		if err := db.Where("email = ?", u.Email).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				db.Create(&u)
				log.Printf("Created user %s with role %s", u.Email, u.Role)
			}
		} else {
			// Update password just in case
			existing.Password = string(hashedPassword)
			db.Save(&existing)
			log.Printf("User %s already exists, password updated", u.Email)
		}
	}

	log.Println("Seeding users completed.")
}
