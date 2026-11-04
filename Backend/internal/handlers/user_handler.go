package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// validUserRoles are the roles used by RoleMiddleware and the login portals.
var validUserRoles = map[string]bool{"member": true, "penulis": true, "editor": true, "admin": true}

// emailTaken reports whether another user (id != exceptID) already uses the email.
func emailTaken(email string, exceptID uint) bool {
	var count int64
	database.DB.Model(&models.User{}).Where("email = ? AND id <> ?", email, exceptID).Count(&count)
	return count > 0
}

// GetUsers returns users, optionally filtered by role
func GetUsers(c *fiber.Ctx) error {
	role := c.Query("role")
	var users []models.User

	query := database.DB
	if role != "" {
		query = query.Where("role = ?", role)
	}

	if err := query.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch users"})
	}

	// Remove password hashes from response
	var safeUsers []fiber.Map
	for _, u := range users {
		safeUsers = append(safeUsers, fiber.Map{
			"id":          u.ID,
			"name":        u.Name,
			"email":       u.Email,
			"role":        u.Role,
			"phone":       u.Phone,
			"provinsi":    u.Provinsi,
			"kota_kab":    u.KotaKab,
			"kecamatan":   u.Kecamatan,
			"kelurahan":   u.Kelurahan,
			"alamat":      u.Alamat,
			"photo":       u.Photo,
			"is_verified": u.IsVerified,
			"created_at":  u.CreatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    safeUsers,
	})
}

// CreateUser creates a new user manually
func CreateUser(c *fiber.Ctx) error {
	var input struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		Password   string `json:"password"`
		Role       string `json:"role"`
		Phone      string `json:"phone"`
		Provinsi   string `json:"provinsi"`
		KotaKab    string `json:"kota_kab"`
		Kecamatan  string `json:"kecamatan"`
		Kelurahan  string `json:"kelurahan"`
		Alamat     string `json:"alamat"`
		IsVerified *int   `json:"is_verified"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid input"})
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if input.Name == "" || !isValidEmail(input.Email) || !validUserRoles[input.Role] {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"success": false, "message": "Name, valid email, and role (member, penulis, editor, admin) are required"})
	}
	if msg := validatePassword(input.Password); msg != "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"success": false, "message": msg})
	}
	if emailTaken(input.Email, 0) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "message": "Email already registered"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to hash password"})
	}

	isVerifiedVal := 0
	if input.IsVerified != nil {
		isVerifiedVal = *input.IsVerified
	}

	user := models.User{
		Name:       input.Name,
		Email:      input.Email,
		Password:   string(hashedPassword),
		Role:       input.Role,
		Phone:      input.Phone,
		Provinsi:   input.Provinsi,
		KotaKab:    input.KotaKab,
		Kecamatan:  input.Kecamatan,
		Kelurahan:  input.Kelurahan,
		Alamat:     input.Alamat,
		IsVerified: isVerifiedVal,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create user"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User created successfully",
		"data": fiber.Map{
			"id":   user.ID,
			"name": user.Name,
			"role": user.Role,
		},
	})
}

// UpdateUser updates a user's profile.
// Rules:
//   - A user may only update their own profile.
//   - Only admin can update another user's profile or change roles.
func UpdateUser(c *fiber.Ctx) error {
	targetID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	// Extract caller identity from JWT
	callerIDFloat, _ := c.Locals("user_id").(float64)
	callerID := int(callerIDFloat)
	callerRole, _ := c.Locals("role").(string)

	// Enforce: only self or admin
	if callerID != targetID && callerRole != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Forbidden: you may only update your own profile",
		})
	}

	var user models.User
	if err := database.DB.First(&user, targetID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "User not found"})
	}

	var input struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		Password   string `json:"password"`
		Role       string `json:"role"` // only honoured when callerRole == admin
		Phone      string `json:"phone"`
		Provinsi   string `json:"provinsi"`
		KotaKab    string `json:"kota_kab"`
		Kecamatan  string `json:"kecamatan"`
		Kelurahan  string `json:"kelurahan"`
		Alamat     string `json:"alamat"`
		Photo      string `json:"photo"`
		IsVerified *int   `json:"is_verified"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid input"})
	}

	if input.Name != "" {
		user.Name = strings.TrimSpace(input.Name)
	}
	if input.Email != "" {
		email := strings.ToLower(strings.TrimSpace(input.Email))
		if !isValidEmail(email) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"success": false, "message": "Invalid email address"})
		}
		if emailTaken(email, user.ID) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "message": "Email already registered"})
		}
		user.Email = email
	}
	if input.Password != "" {
		if msg := validatePassword(input.Password); msg != "" {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"success": false, "message": msg,
			})
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update password"})
		}
		user.Password = string(hashed)
	}
	// Role change: admin-only
	if input.Role != "" && callerRole == "admin" {
		if !validUserRoles[input.Role] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid role"})
		}
		user.Role = input.Role
	}
	if input.Phone != "" {
		user.Phone = input.Phone
	}
	if input.Provinsi != "" {
		user.Provinsi = input.Provinsi
	}
	if input.KotaKab != "" {
		user.KotaKab = input.KotaKab
	}
	if input.Kecamatan != "" {
		user.Kecamatan = input.Kecamatan
	}
	if input.Kelurahan != "" {
		user.Kelurahan = input.Kelurahan
	}
	if input.Alamat != "" {
		user.Alamat = input.Alamat
	}
	if input.Photo != "" {
		user.Photo = input.Photo
	}
	if input.IsVerified != nil && callerRole == "admin" {
		user.IsVerified = *input.IsVerified
	}

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update user"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User updated successfully",
	})
}

// DeleteUser deletes a user
func DeleteUser(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	if err := database.DB.Delete(&models.User{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete user"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User deleted successfully",
	})
}

// GetUserDetail returns detailed info of a single user
func GetUserDetail(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	// Only the user themself, or roles that may already list users (admin, editor)
	callerIDFloat, _ := c.Locals("user_id").(float64)
	callerRole, _ := c.Locals("role").(string)
	if int(callerIDFloat) != id && callerRole != "admin" && callerRole != "editor" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Forbidden: you may only view your own profile",
		})
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "User not found"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":          user.ID,
			"name":        user.Name,
			"email":       user.Email,
			"role":        user.Role,
			"phone":       user.Phone,
			"provinsi":    user.Provinsi,
			"kota_kab":    user.KotaKab,
			"kecamatan":   user.Kecamatan,
			"kelurahan":   user.Kelurahan,
			"alamat":      user.Alamat,
			"photo":       user.Photo,
			"is_verified": user.IsVerified,
			"total_xp":    user.TotalXP,
		},
	})
}
