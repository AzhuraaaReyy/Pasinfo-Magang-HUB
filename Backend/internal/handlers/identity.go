package handlers

import "github.com/gofiber/fiber/v2"

// currentUserID returns the authenticated user ID set by middleware.Protected.
// ok is false when the handler is reached without that middleware.
func currentUserID(c *fiber.Ctx) (id uint, ok bool) {
	v, ok := c.Locals("user_id").(float64)
	if !ok || v <= 0 {
		return 0, false
	}
	return uint(v), true
}

func unauthorizedResponse(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Silakan masuk terlebih dahulu."})
}
