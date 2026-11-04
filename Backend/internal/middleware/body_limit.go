package middleware

import "github.com/gofiber/fiber/v2"

// MaxBodyBytes rejects requests whose body is larger than limit. Fiber has already read the
// body under the global BodyLimit, so this narrows the accepted size for one route prefix.
func MaxBodyBytes(limit int, onTooLarge fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if len(c.Body()) > limit {
			return onTooLarge(c)
		}
		return c.Next()
	}
}
