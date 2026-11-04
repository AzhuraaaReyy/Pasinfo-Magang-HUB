package handlers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"log"
	"math"
	"strconv"
	"strings"
	"time"
	"wildan-news-backend/internal/middleware"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

type WisataLiveHandler struct {
	DB *gorm.DB
	OW *services.OpenWeatherClient
	GM *services.GoogleMapsClient
}

func NewWisataLiveHandler(db *gorm.DB, ow *services.OpenWeatherClient, gm *services.GoogleMapsClient) *WisataLiveHandler {
	return &WisataLiveHandler{db, ow, gm}
}
func (h *WisataLiveHandler) Register(r fiber.Router) {
	// These routes may call paid external APIs (Google Maps, OpenWeatherMap).
	r.Get("/wisata/:slug/cuaca", middleware.RateLimiter(20, 60), h.Weather)
	r.Get("/wisata/:slug/info-tempat", middleware.RateLimiter(20, 60), h.PlaceInfo)
	r.Get("/wisata/rute", middleware.RateLimiter(20, 60), h.Route)
}
func (h *WisataLiveHandler) dest(c *fiber.Ctx) (models.Destination, error) {
	var d models.Destination
	e := h.DB.Preload("Place").Where("slug = ? AND status = ?", c.Params("slug"), "published").First(&d).Error
	return d, e
}
func (h *WisataLiveHandler) Weather(c *fiber.Ctx) error {
	d, e := h.dest(c)
	if e != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Destinasi tidak ditemukan"})
	}
	var w models.DestinationWeather
	e = h.DB.Where("destination_id = ?", d.ID).First(&w).Error
	has := e == nil
	if e != nil && e != gorm.ErrRecordNotFound {
		return c.Status(500).JSON(fiber.Map{"message": "gagal memuat cuaca"})
	}
	source := "mock"
	if h.OW.Enabled() && d.Place.Latitude != 0 && d.Place.Longitude != 0 && (!has || w.ExpiresAt == nil || w.ExpiresAt.Before(time.Now().UTC())) {
		if x, ee := h.OW.Current(c.Context(), d.Place.Latitude, d.Place.Longitude); ee == nil {
			now := time.Now().UTC()
			p, s := "openweathermap", "OpenWeatherMap"
			w = models.DestinationWeather{ID: w.ID, DestinationID: d.ID, Provider: &p, Source: &s, ConditionCode: x.ConditionCode, ConditionLabel: x.ConditionLabel, TemperatureC: x.TemperatureC, FeelsLikeC: x.FeelsLikeC, HumidityPercent: x.HumidityPercent, WindSpeedKmh: x.WindSpeedKmh, PrecipitationMM: x.PrecipitationMM, Icon: x.Icon, ObservedAt: &x.ObservedAt, ExpiresAt: ptrTime(now.Add(30 * time.Minute))}
			if err := h.DB.Save(&w).Error; err != nil {
				log.Printf("weather cache save failed: %v", err) // live data is still returned
			}
			has = true
			source = "live"
		} else {
			log.Printf("weather fetch failed: %v", ee)
		}
	}
	if !has {
		return c.JSON(fiber.Map{"source": "mock", "weather": nil})
	}
	return c.JSON(fiber.Map{"source": source, "weather": w})
}
func ptrTime(t time.Time) *time.Time { return &t }
func (h *WisataLiveHandler) PlaceInfo(c *fiber.Ctx) error {
	d, e := h.dest(c)
	if e != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Destinasi tidak ditemukan"})
	}
	if h.GM.Enabled() && d.Place.GooglePlaceID != "" {
		if p, ee := h.GM.PlaceDetails(c.Context(), d.Place.GooglePlaceID); ee == nil {
			return c.JSON(fiber.Map{"source": "google", "place": p})
		}
	}
	return c.JSON(fiber.Map{"source": "mock", "place": fiber.Map{"name": d.Place.Name, "formatted_address": d.Place.Address, "rating": d.Rating, "google_maps_uri": d.Place.MapURL, "location": fiber.Map{"lat": d.Place.Latitude, "lng": d.Place.Longitude}}})
}
func (h *WisataLiveHandler) Route(c *fiber.Ctx) error {
	from, slug := c.Query("dari"), c.Query("ke")
	latPart, lngPart, ok := strings.Cut(from, ",")
	if !ok || slug == "" {
		return c.Status(400).JSON(fiber.Map{"message": "parameter dari (lat,lng) dan ke (slug destinasi) wajib diisi"})
	}
	a, e1 := strconv.ParseFloat(strings.TrimSpace(latPart), 64)
	b, e2 := strconv.ParseFloat(strings.TrimSpace(lngPart), 64)
	if e1 != nil || e2 != nil || math.Abs(a) > 90 || math.Abs(b) > 180 {
		return c.Status(400).JSON(fiber.Map{"message": "format dari tidak valid"})
	}
	var d models.Destination
	if h.DB.Preload("Place").Where("slug = ? AND status = ?", slug, "published").First(&d).Error != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Destinasi tidak ditemukan"})
	}
	if h.GM.Enabled() {
		if r, e := h.GM.Directions(c.Context(), a, b, d.Place.Latitude, d.Place.Longitude); e == nil {
			return c.JSON(fiber.Map{"source": "google", "jarak": r.DistanceMeters, "durasi": r.DurationSeconds})
		}
	}
	return c.JSON(fiber.Map{"source": "mock", "jarak": nil, "durasi": nil, "catatan": "Perkiraan rute; isi GOOGLE_MAPS_SERVER_KEY untuk data live."})
}
