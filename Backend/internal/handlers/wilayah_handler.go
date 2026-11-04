package handlers

import (
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

func GetProvinces(c *fiber.Ctx) error {
	var provinces []models.Province
	database.DB.Order("name asc").Find(&provinces)
	return c.JSON(fiber.Map{"data": provinces})
}

func GetRegencies(c *fiber.Ctx) error {
	provinceCode := c.Params("province_code")
	var regencies []models.Regency
	database.DB.Where("province_code = ?", provinceCode).Order("name asc").Find(&regencies)
	return c.JSON(fiber.Map{"data": regencies})
}

func GetDistricts(c *fiber.Ctx) error {
	regencyCode := c.Params("regency_code")
	var districts []models.District
	database.DB.Where("regency_code = ?", regencyCode).Order("name asc").Find(&districts)
	return c.JSON(fiber.Map{"data": districts})
}

func GetVillages(c *fiber.Ctx) error {
	districtCode := c.Params("district_code")
	var villages []models.Village
	database.DB.Where("district_code = ?", districtCode).Order("name asc").Find(&villages)
	return c.JSON(fiber.Map{"data": villages})
}
