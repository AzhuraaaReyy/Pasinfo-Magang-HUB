package handlers

import (
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// Deleting a category that still holds news must be refused instead of
// cascading over every article (audit M11).
func TestDeleteCategoryRefusesWhenNewsExist(t *testing.T) {
	setupNewsTest(t) // category id 1 ("lokal") with two articles
	empty := models.Category{Name: "KOSONG", Slug: "kosong"}
	database.DB.Create(&empty)

	app := fiber.New()
	app.Delete("/categories/:id", DeleteCategory)
	del := func(id uint) int {
		resp, err := app.Test(httptest.NewRequest("DELETE", "/categories/"+strconv.Itoa(int(id)), nil))
		if err != nil {
			t.Fatal(err)
		}
		return resp.StatusCode
	}

	if code := del(1); code != fiber.StatusConflict {
		t.Fatalf("delete non-empty category status = %d, want 409", code)
	}
	var newsCount, catCount int64
	database.DB.Model(&models.News{}).Where("category_id = ?", 1).Count(&newsCount)
	database.DB.Model(&models.Category{}).Where("id = ?", 1).Count(&catCount)
	if newsCount != 2 || catCount != 1 {
		t.Fatalf("after refused delete: news=%d category=%d, want 2 and 1", newsCount, catCount)
	}

	if code := del(empty.ID); code != fiber.StatusOK {
		t.Fatalf("delete empty category status = %d, want 200", code)
	}
}
