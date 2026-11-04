package handlers

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
	"wildan-news-backend/internal/utils"
)

// requestCorpusRefresh asks the AI corpus job for an early refresh after an admin news write (P4-1); tests replace it.
var requestCorpusRefresh = services.RequestKnowledgeRefresh

func GetNews(c *fiber.Ctx) error {
	var news []models.News
	// Public endpoint: only published articles (drafts are listed via /news/mine and /news/pending)
	query := database.DB.Preload("Author").Preload("Category").Preload("Images").Where("status = ?", "published").Order("created_at desc")

	q := c.Query("q")
	if q != "" {
		query = query.Where("LOWER(title) LIKE ?", "%"+strings.ToLower(q)+"%")
	}

	query.Find(&news)

	cities := regencyNamesFor(news)
	var response []models.NewsResponse
	for _, n := range news {
		var imgPaths []string
		var imgCaptions []string
		for _, img := range n.Images {
			imgPaths = append(imgPaths, img.ImagePath)
			imgCaptions = append(imgCaptions, img.ImageCaption)
		}
		response = append(response, models.NewsResponse{
			ID:            n.ID,
			Judul:         n.Title,
			Kategori:      n.Category.Name,
			Konten:        n.Content,
			ProvinceID:    n.ProvinceID,
			RegencyID:     n.RegencyID,
			DistrictID:    n.DistrictID,
			VillageID:     n.VillageID,
			Images:        imgPaths,
			ImageCaptions: imgCaptions,
			Penulis:       formatAuthorName(n),
			Waktu:         formatWaktuWIB(n.CreatedAt),
			SourceURL:     n.SourceURL,
			Source:        n.Source,
			Status:        n.Status,
			Views:         n.Views,
			Kota:          cities[n.RegencyID],
			CreatedAt:     n.CreatedAt,
			UpdatedAt:     n.UpdatedAt,
			WaktuUpdate:   formatWaktuWIB(n.UpdatedAt),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    response,
	})
}

func GetNewsByCategory(c *fiber.Ctx) error {
	category := c.Params("category")
	var cat models.Category
	if err := database.DB.Where("slug = ? OR name = ?", category, category).First(&cat).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Category not found"})
	}

	var news []models.News
	database.DB.Preload("Author").Preload("Category").Preload("Images").Where("category_id = ? AND status = ?", cat.ID, "published").Order("created_at desc").Find(&news)

	cities := regencyNamesFor(news)
	var response []models.NewsResponse
	for _, n := range news {
		var imgPaths []string
		var imgCaptions []string
		for _, img := range n.Images {
			imgPaths = append(imgPaths, img.ImagePath)
			imgCaptions = append(imgCaptions, img.ImageCaption)
		}
		response = append(response, models.NewsResponse{
			ID:            n.ID,
			Judul:         n.Title,
			Kategori:      n.Category.Name,
			Konten:        n.Content,
			ProvinceID:    n.ProvinceID,
			RegencyID:     n.RegencyID,
			DistrictID:    n.DistrictID,
			VillageID:     n.VillageID,
			Images:        imgPaths,
			ImageCaptions: imgCaptions,
			Penulis:       formatAuthorName(n),
			Waktu:         formatWaktuWIB(n.CreatedAt),
			SourceURL:     n.SourceURL,
			Source:        n.Source,
			Status:        n.Status,
			Views:         n.Views,
			Kota:          cities[n.RegencyID],
			CreatedAt:     n.CreatedAt,
			UpdatedAt:     n.UpdatedAt,
			WaktuUpdate:   formatWaktuWIB(n.UpdatedAt),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    response,
	})
}

func GetNewsDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	var n models.News
	result := database.DB.Preload("Author").Preload("Category").Preload("Images").Where("status = ?", "published").First(&n, id)
	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "News not found",
		})
	}

	// Increment views count
	n.Views++
	database.DB.Model(&n).UpdateColumn("views", n.Views)

	var imgPaths []string
	var imgCaptions []string
	for _, img := range n.Images {
		imgPaths = append(imgPaths, img.ImagePath)
		imgCaptions = append(imgCaptions, img.ImageCaption)
	}

	response := models.NewsResponse{
		ID:            n.ID,
		Judul:         n.Title,
		Kategori:      n.Category.Name,
		Konten:        n.Content,
		ProvinceID:    n.ProvinceID,
		RegencyID:     n.RegencyID,
		DistrictID:    n.DistrictID,
		VillageID:     n.VillageID,
		Images:        imgPaths,
		ImageCaptions: imgCaptions,
		Penulis:       formatAuthorName(n),
		Waktu:         formatWaktuWIB(n.CreatedAt),
		SourceURL:     n.SourceURL,
		Source:        n.Source,
		Status:        n.Status,
		Views:         n.Views,
		Kota:          getRegencyName(n.RegencyID),
		CreatedAt:     n.CreatedAt,
		UpdatedAt:     n.UpdatedAt,
		WaktuUpdate:   formatWaktuWIB(n.UpdatedAt),
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    response,
	})
}

func formatAuthorName(n models.News) string {
	if strings.TrimSpace(n.Author.Name) != "" {
		return strings.TrimSpace(n.Author.Name)
	}
	if strings.TrimSpace(n.Source) != "" {
		return strings.TrimSpace(n.Source)
	}
	return "Redaksi Pasinfo"
}

// helper to format time to WIB
func formatWaktuWIB(t time.Time) string {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err == nil {
		t = t.In(loc)
	} else {
		t = t.Add(7 * time.Hour)
	}

	months := []string{
		"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}

	return fmt.Sprintf("%d %s %d, %02d:%02d WIB", t.Day(), months[t.Month()], t.Year(), t.Hour(), t.Minute())
}

func getRegencyName(regencyID string) string {
	if regencyID == "" {
		return "PASURUAN"
	}
	var reg models.Regency
	if database.DB.Where("code = ?", regencyID).First(&reg).Error == nil {
		return formatRegencyName(reg.Name)
	}
	return "PASURUAN"
}

func formatRegencyName(name string) string {
	return strings.ToUpper(strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(name, "KABUPATEN ", ""), "KOTA ", "")))
}

// regencyNamesFor resolves the display city of many articles with one query
// (instead of one query per article). Unknown or empty codes map to PASURUAN.
func regencyNamesFor(news []models.News) map[string]string {
	names := map[string]string{"": "PASURUAN"}
	var codes []string
	for _, n := range news {
		if _, seen := names[n.RegencyID]; !seen {
			names[n.RegencyID] = "PASURUAN"
			codes = append(codes, n.RegencyID)
		}
	}
	if len(codes) == 0 {
		return names
	}
	var regs []models.Regency
	if err := database.DB.Where("code IN ?", codes).Find(&regs).Error; err != nil {
		return names
	}
	for _, r := range regs {
		names[r.Code] = formatRegencyName(r.Name)
	}
	return names
}

// validNewsStatuses lists the editorial workflow states used by the news handlers.
var validNewsStatuses = map[string]bool{"draft": true, "pending": true, "revision": true, "published": true}

// newsStatusError returns 0 when the role may set the status, otherwise the HTTP code.
// Writers (penulis) may only keep a draft or submit it for review; editors and admins
// decide revision and publication.
func newsStatusError(role, status string) int {
	if !validNewsStatuses[status] {
		return fiber.StatusBadRequest
	}
	if role == "editor" || role == "admin" || status == "draft" || status == "pending" {
		return 0
	}
	return fiber.StatusForbidden
}

func newsStatusResponse(c *fiber.Ctx, code int) error {
	if code == fiber.StatusBadRequest {
		return c.Status(code).JSON(fiber.Map{"success": false, "message": "Invalid status"})
	}
	return c.Status(code).JSON(fiber.Map{"success": false, "message": "Forbidden: status not allowed for your role"})
}

type CreateNewsRequest struct {
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	CategoryID    uint     `json:"category_id"`
	ProvinceID    string   `json:"province_id"`
	RegencyID     string   `json:"regency_id"`
	DistrictID    string   `json:"district_id"`
	VillageID     string   `json:"village_id"`
	Images        []string `json:"images"`
	ImageCaptions []string `json:"image_captions"`
	AuthorID      uint     `json:"author_id"`
	Status        string   `json:"status"`
}

func CreateNews(c *fiber.Ctx) error {
	authorID, ok := currentUserID(c)
	if !ok {
		return unauthorizedResponse(c)
	}
	var req CreateNewsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request payload"})
	}

	// The token must belong to an existing user; never attribute the article to someone else
	var authorUser models.User
	if err := database.DB.First(&authorUser, authorID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User not found"})
	}

	// Validate Category ID exists in DB, fallback to ID 1 if invalid
	categoryID := req.CategoryID
	if categoryID == 0 {
		categoryID = 1
	}
	var cat models.Category
	if err := database.DB.First(&cat, categoryID).Error; err != nil {
		var firstCat models.Category
		if database.DB.First(&firstCat).Error == nil {
			categoryID = firstCat.ID
		}
	}

	statusTarget := req.Status
	if statusTarget == "" {
		statusTarget = "draft"
	}
	creatorRole, _ := c.Locals("role").(string)
	if code := newsStatusError(creatorRole, statusTarget); code != 0 {
		return newsStatusResponse(c, code)
	}

	slug, err := utils.UniqueNewsSlug(database.DB, req.Title)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to create news"})
	}

	news := models.News{
		Title:      req.Title,
		Slug:       slug,
		Content:    req.Content,
		CategoryID: categoryID,
		ProvinceID: req.ProvinceID,
		RegencyID:  req.RegencyID,
		DistrictID: req.DistrictID,
		VillageID:  req.VillageID,
		AuthorID:   authorID,
		Status:     statusTarget,
		SourceURL:  fmt.Sprintf("manual-%d-%d-%s", authorID, time.Now().UnixNano(), randomHex(4)), // unique even within one clock tick
		Source:     "Pasinfo",
	}

	if err := database.DB.Create(&news).Error; err != nil {
		log.Printf("[CreateNews DB Error] %v", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to create news"})
	}

	log.Printf("[CreateNews Request] news_id=%d Images count: %d, Captions count: %d", news.ID, len(req.Images), len(req.ImageCaptions))
	for i, imgPath := range req.Images {
		caption := ""
		if i < len(req.ImageCaptions) {
			caption = req.ImageCaptions[i]
		}
		img := models.NewsImage{
			NewsID:       news.ID,
			ImagePath:    imgPath,
			ImageCaption: caption,
		}
		if err := database.DB.Create(&img).Error; err != nil {
			log.Printf("[CreateNews Image Error] news_id=%d idx=%d: %v", news.ID, i, err)
		}
	}

	database.DB.Preload("Author").Preload("Category").Preload("Images").First(&news, news.ID)

	if statusTarget == "pending" {
		var authorUser models.User
		database.DB.First(&authorUser, authorID)
		authorName := authorUser.Name
		if authorName == "" {
			authorName = "Penulis"
		}
		categoryName := news.Category.Name
		if categoryName == "" {
			var cat models.Category
			database.DB.First(&cat, news.CategoryID)
			categoryName = cat.Name
		}

		// In-app notifications to editors & admins
		var editors []models.User
		database.DB.Where("role IN ('editor', 'admin')").Find(&editors)
		for _, ed := range editors {
			notif := models.Notification{
				UserID:  ed.ID,
				NewsID:  &news.ID,
				Title:   "Artikel Baru Menunggu Review",
				Message: fmt.Sprintf("%s mengajukan artikel '%s'", authorName, news.Title),
				Type:    "info",
			}
			database.DB.Create(&notif)

			if ed.Email != "" {
				go func(edEmail, edName, authName, title, cat string) {
					wibTime := utils.FormatWIB(time.Now())
					if err := utils.SendNewsSubmittedEditorEmail(edEmail, edName, authName, title, cat, wibTime); err != nil {
						log.Printf("[Email Error] Failed to send draft notice to editor %s: %v", edEmail, err)
					}
				}(ed.Email, ed.Name, authorName, news.Title, categoryName)
			}
		}

		// Email to author
		if authorUser.Email != "" {
			go func(authorEmail, authName, title, cat string) {
				wibTime := utils.FormatWIB(time.Now())
				if err := utils.SendNewsSubmittedAuthorEmail(authorEmail, authName, title, cat, wibTime); err != nil {
					log.Printf("[Email Error] Failed to send submission confirmation to author %s: %v", authorEmail, err)
				}
			}(authorUser.Email, authorName, news.Title, categoryName)
		}
	}

	// P4-1 (jobdesk 3 Nov, 2026-11-03): every successful admin news write asks for an early corpus refresh, so an
	// unpublished, edited, or deleted article leaves the chatbot now instead of at the next hourly refresh.
	requestCorpusRefresh() // P4-1: the AI corpus follows this news change now
	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "News created successfully",
		"data":    news,
	})
}

func GetMyNews(c *fiber.Ctx) error {
	userID, ok := currentUserID(c)
	if !ok {
		return unauthorizedResponse(c)
	}

	var news []models.News
	database.DB.Preload("Category").Preload("Images").Where("author_id = ?", userID).Order("created_at desc").Find(&news)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    news,
	})
}

func GetPendingNews(c *fiber.Ctx) error {
	var news []models.News
	database.DB.Preload("Author").Preload("Category").Preload("Images").Where("status = ?", "pending").Order("created_at asc").Find(&news)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    news,
	})
}

type UpdateStatusRequest struct {
	Status  string `json:"status"`  // "pending", "revision", "published", "draft"
	Message string `json:"message"` // Reason for revision or rejection
}

func UpdateNewsStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}

	userRole := ""
	if r, ok := c.Locals("role").(string); ok {
		userRole = r
	}
	if !validNewsStatuses[req.Status] {
		return newsStatusResponse(c, fiber.StatusBadRequest)
	}

	var news models.News
	if err := database.DB.Preload("Author").Preload("Category").First(&news, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "News not found"})
	}

	// Writers may only change the status of their own articles
	if userRole == "penulis" {
		callerID, _ := c.Locals("user_id").(float64)
		if news.AuthorID != uint(callerID) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"success": false, "message": "Forbidden"})
		}
	}
	if code := newsStatusError(userRole, req.Status); code != 0 {
		return newsStatusResponse(c, code)
	}

	oldStatus := news.Status
	news.Status = req.Status
	if err := database.DB.Save(&news).Error; err != nil {
		log.Printf("[UpdateNewsStatus DB Error] news_id=%d: %v", news.ID, err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to update news status"})
	}

	// Create Notification based on status change

	categoryName := news.Category.Name
	if categoryName == "" {
		var cat models.Category
		database.DB.First(&cat, news.CategoryID)
		categoryName = cat.Name
	}

	if (userRole == "penulis" || userRole == "admin") && req.Status == "pending" {
		// Notify editors
		var editors []models.User
		database.DB.Where("role IN ('editor', 'admin')").Find(&editors)
		for _, ed := range editors {
			notif := models.Notification{
				UserID:  ed.ID,
				NewsID:  &news.ID,
				Title:   "Artikel Baru Menunggu Review",
				Message: fmt.Sprintf("%s mengajukan artikel '%s'", news.Author.Name, news.Title),
				Type:    "info",
			}
			database.DB.Create(&notif)

			if ed.Email != "" {
				go func(edEmail, edName, authName, title, cat string) {
					wibTime := utils.FormatWIB(time.Now())
					if err := utils.SendNewsSubmittedEditorEmail(edEmail, edName, authName, title, cat, wibTime); err != nil {
						log.Printf("[Email Error] Failed to send draft notice to editor %s: %v", edEmail, err)
					}
				}(ed.Email, ed.Name, news.Author.Name, news.Title, categoryName)
			}
		}

		// Email to author
		if news.Author.Email != "" {
			go func(authorEmail, authName, title, cat string) {
				wibTime := utils.FormatWIB(time.Now())
				if err := utils.SendNewsSubmittedAuthorEmail(authorEmail, authName, title, cat, wibTime); err != nil {
					log.Printf("[Email Error] Failed to send submission notice to author %s: %v", authorEmail, err)
				}
			}(news.Author.Email, news.Author.Name, news.Title, categoryName)
		}
	} else if userRole == "editor" || userRole == "admin" {
		// Notify author
		notif := models.Notification{
			UserID: news.AuthorID,
			NewsID: &news.ID,
			Type:   "info",
		}
		if req.Status == "revision" {
			notif.Title = "Artikel Perlu Direvisi"
			notif.Message = fmt.Sprintf("Artikel '%s' perlu revisi: %s", news.Title, req.Message)
			notif.Type = "warning"

			if news.Author.Email != "" {
				go func(authorEmail, authorName, title, cat, notes string) {
					wibTime := utils.FormatWIB(time.Now())
					if err := utils.SendNewsReviewRevisionEmail(authorEmail, authorName, title, cat, wibTime, notes); err != nil {
						log.Printf("[Email Error] Failed to send revision email to author %s: %v", authorEmail, err)
					}
				}(news.Author.Email, news.Author.Name, news.Title, categoryName, req.Message)
			}
		} else if req.Status == "published" {
			notif.Title = "Artikel Diterbitkan"
			notif.Message = fmt.Sprintf("Selamat! Artikel '%s' telah disetujui dan diterbitkan.", news.Title)
			notif.Type = "success"

			if news.Author.Email != "" {
				go func(authorEmail, authorName, title, cat, notes string) {
					wibTime := utils.FormatWIB(time.Now())
					if err := utils.SendNewsReviewApprovedEmail(authorEmail, authorName, title, cat, wibTime, notes); err != nil {
						log.Printf("[Email Error] Failed to send approved email to author %s: %v", authorEmail, err)
					}
				}(news.Author.Email, news.Author.Name, news.Title, categoryName, req.Message)
			}
		}

		if notif.Title != "" {
			database.DB.Create(&notif)
		}
	}

	requestCorpusRefresh() // P4-1: the AI corpus follows this news change now
	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Status changed from %s to %s", oldStatus, req.Status),
	})
}

func DeleteNews(c *fiber.Ctx) error {
	id := c.Params("id")
	var news models.News
	if err := database.DB.Preload("Author").Preload("Category").First(&news, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "News not found"})
	}

	userRole := ""
	if r, ok := c.Locals("role").(string); ok {
		userRole = r
	}
	userName := "Administrator"
	if uid, ok := c.Locals("user_id").(float64); ok {
		var adminUser models.User
		if database.DB.First(&adminUser, uint(uid)).Error == nil && adminUser.Name != "" {
			userName = adminUser.Name
		}
	}

	// Delete associated records and the article in one transaction
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, child := range []any{&models.NewsImage{}, &models.History{}, &models.Notification{}} {
			if err := tx.Where("news_id = ?", news.ID).Delete(child).Error; err != nil {
				return err
			}
		}
		return tx.Delete(&news).Error
	}); err != nil {
		log.Printf("[DeleteNews DB Error] news_id=%d: %v", news.ID, err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to delete news"})
	}

	// If deleted by admin and author has email, send deletion notice
	if userRole == "admin" && news.Author.Email != "" {
		go func(authorEmail, authorName, title, admin string) {
			wibTime := utils.FormatWIB(time.Now())
			if err := utils.SendNewsAdminDeletedEmail(authorEmail, authorName, title, wibTime, admin); err != nil {
				log.Printf("[Email Error] Failed to send news deletion email to author %s: %v", authorEmail, err)
			} else {
				log.Printf("[Email Success] News deletion email sent to author %s", authorEmail)
			}
		}(news.Author.Email, news.Author.Name, news.Title, userName)
	}

	requestCorpusRefresh() // P4-1: the AI corpus follows this news change now
	return c.JSON(fiber.Map{"success": true, "message": "News deleted successfully"})
}

func DeleteAllNews(c *fiber.Ctx) error {
	// Cascade delete all dependent tables in one transaction
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, stmt := range []string{
			"DELETE FROM news_images",
			"DELETE FROM histories WHERE news_id IS NOT NULL",
			"DELETE FROM notifications WHERE news_id IS NOT NULL",
			"DELETE FROM news",
		} {
			if err := tx.Exec(stmt).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		log.Printf("[DeleteAllNews DB Error] %v", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to delete all news"})
	}

	requestCorpusRefresh() // P4-1: the AI corpus follows this news change now
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Semua artikel berita berhasil dihapus.",
	})
}

type UpdateNewsRequest struct {
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	CategoryID    uint     `json:"category_id"`
	ProvinceID    string   `json:"province_id"`
	RegencyID     string   `json:"regency_id"`
	DistrictID    string   `json:"district_id"`
	VillageID     string   `json:"village_id"`
	Images        []string `json:"images"`
	ImageCaptions []string `json:"image_captions"`
	Status        string   `json:"status"`
}

func UpdateNews(c *fiber.Ctx) error {
	id := c.Params("id")
	authorID, ok := currentUserID(c)
	if !ok {
		return unauthorizedResponse(c)
	}
	var req UpdateNewsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}

	var news models.News
	if err := database.DB.Preload("Author").Preload("Category").First(&news, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "News not found"})
	}

	userRole, _ := c.Locals("role").(string)
	if news.AuthorID != authorID && userRole != "admin" && userRole != "editor" {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Forbidden"})
	}
	if req.Status != "" {
		if code := newsStatusError(userRole, req.Status); code != 0 {
			return newsStatusResponse(c, code)
		}
	}

	news.Title = req.Title
	news.Content = req.Content
	news.CategoryID = req.CategoryID
	news.ProvinceID = req.ProvinceID
	news.RegencyID = req.RegencyID
	news.DistrictID = req.DistrictID
	news.VillageID = req.VillageID

	if req.Status != "" {
		news.Status = req.Status
	}

	if news.SourceURL == "" {
		news.SourceURL = fmt.Sprintf("manual-%d-%d", authorID, time.Now().UnixNano())
		news.Source = "Pasinfo"
	}

	if err := database.DB.Save(&news).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to update news"})
	}

	log.Printf("[UpdateNews Request] news_id=%d Images count: %d, Captions count: %d", news.ID, len(req.Images), len(req.ImageCaptions))
	if req.Images != nil {
		if err := database.DB.Where("news_id = ?", news.ID).Delete(&models.NewsImage{}).Error; err != nil {
			log.Printf("[UpdateNews DB Error] news_id=%d delete images: %v", news.ID, err)
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to update news images"})
		}
		for i, imgPath := range req.Images {
			caption := ""
			if i < len(req.ImageCaptions) {
				caption = req.ImageCaptions[i]
			}
			img := models.NewsImage{
				NewsID:       news.ID,
				ImagePath:    imgPath,
				ImageCaption: caption,
			}
			if err := database.DB.Create(&img).Error; err != nil {
				log.Printf("[UpdateNews Image Error] news_id=%d idx=%d: %v", news.ID, i, err)
			}
		}
	}

	database.DB.Preload("Author").Preload("Category").Preload("Images").First(&news, news.ID)

	categoryName := news.Category.Name
	if categoryName == "" {
		var cat models.Category
		database.DB.First(&cat, news.CategoryID)
		categoryName = cat.Name
	}

	// If edited by admin and author is different, send admin edited notice
	if userRole == "admin" && news.AuthorID != authorID && news.Author.Email != "" {
		var adminUser models.User
		database.DB.First(&adminUser, authorID)
		adminName := adminUser.Name
		if adminName == "" {
			adminName = "Administrator"
		}
		go func(authorEmail, authorName, title, cat, admin string) {
			wibTime := utils.FormatWIB(time.Now())
			if err := utils.SendNewsAdminEditedEmail(authorEmail, authorName, title, cat, wibTime, admin); err != nil {
				log.Printf("[Email Error] Failed to send admin edit notification to %s: %v", authorEmail, err)
			} else {
				log.Printf("[Email Success] Admin edit notification sent to author %s", authorEmail)
			}
		}(news.Author.Email, news.Author.Name, news.Title, categoryName, adminName)
	}

	if req.Status == "pending" {
		var editors []models.User
		database.DB.Where("role IN ('editor', 'admin')").Find(&editors)
		for _, ed := range editors {
			notif := models.Notification{
				UserID:  ed.ID,
				NewsID:  &news.ID,
				Title:   "Artikel Baru Menunggu Review",
				Message: fmt.Sprintf("%s mengajukan artikel '%s'", news.Author.Name, news.Title),
				Type:    "info",
			}
			database.DB.Create(&notif)

			if ed.Email != "" {
				go func(edEmail, edName, authName, title, cat string) {
					wibTime := utils.FormatWIB(time.Now())
					if err := utils.SendNewsSubmittedEditorEmail(edEmail, edName, authName, title, cat, wibTime); err != nil {
						log.Printf("[Email Error] Failed to send draft notice to editor %s: %v", edEmail, err)
					}
				}(ed.Email, ed.Name, news.Author.Name, news.Title, categoryName)
			}
		}

		if news.Author.Email != "" {
			go func(authorEmail, authName, title, cat string) {
				wibTime := utils.FormatWIB(time.Now())
				if err := utils.SendNewsSubmittedAuthorEmail(authorEmail, authName, title, cat, wibTime); err != nil {
					log.Printf("[Email Error] Failed to send submission notice to author %s: %v", authorEmail, err)
				}
			}(news.Author.Email, news.Author.Name, news.Title, categoryName)
		}
	}

	requestCorpusRefresh() // P4-1: the AI corpus follows this news change now
	return c.JSON(fiber.Map{
		"success": true,
		"message": "News updated successfully",
		"data":    news,
	})
}
