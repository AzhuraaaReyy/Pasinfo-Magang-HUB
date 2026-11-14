package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// idParam reads the :id route parameter as a positive whole number. A string id passed to GORM (First(&x, id),
// Delete(&x, id)) is not bound as an id: when it is not a number GORM inserts it into the WHERE clause as SQL, so
// GET /news/(0=1)OR(1=1) answered 200 and a public request could read the users table one yes/no question at a time
// (P4-1, jobdesk 14 Nov, HIGH, Owner option A). With a uint GORM writes "id = ?" with a bound value. ok is false for
// anything else ("abc", "0", "-1", an injected condition), which the caller answers like an id that does not exist.
func idParam(c *fiber.Ctx) (uint, bool) {
	n, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || n == 0 || n > uint64(^uint(0)) {
		return 0, false
	}
	return uint(n), true
}
