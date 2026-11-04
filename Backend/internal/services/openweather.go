package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"time"
)

type OpenWeatherClient struct {
	APIKey string
	HTTP   *http.Client
}

func NewOpenWeatherClient(key string) *OpenWeatherClient {
	return &OpenWeatherClient{APIKey: key, HTTP: &http.Client{Timeout: 8 * time.Second}}
}
func (c *OpenWeatherClient) Enabled() bool { return c != nil && c.APIKey != "" }

type WeatherLive struct {
	ConditionCode, ConditionLabel, Icon                                      string
	TemperatureC, FeelsLikeC, HumidityPercent, WindSpeedKmh, PrecipitationMM float64
	ObservedAt                                                               time.Time
}

func MapOWMCondition(id int) (string, string, string) {
	switch {
	case id >= 200 && id < 300:
		return "thunderstorm", "Badai Petir", "storm"
	case id >= 300 && id < 400:
		return "drizzle", "Gerimis", "rain"
	case id >= 500 && id < 600:
		return "rain", "Hujan", "rain"
	case id >= 600 && id < 700:
		return "snow", "Salju", "snow"
	case id == 741:
		return "fog", "Kabut", "fog"
	case id >= 700 && id < 800:
		return "haze", "Udara Berkabut", "fog"
	case id == 800:
		return "clear", "Cerah", "sun"
	case id <= 802:
		return "partly_cloudy", "Berawan", "sun-cloud"
	case id <= 804:
		return "cloudy", "Mendung", "cloud"
	default:
		return "unknown", "Tidak Diketahui", "cloud"
	}
}
func (c *OpenWeatherClient) Current(ctx context.Context, lat, lon float64) (*WeatherLive, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("WEATHER_API_KEY belum diisi")
	}
	u := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?lat=%.6f&lon=%.6f&units=metric&lang=id&appid=%s", lat, lon, url.QueryEscape(c.APIKey))
	req, e := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if e != nil {
		return nil, e
	}
	res, e := c.HTTP.Do(req)
	if e != nil {
		return nil, withoutRequestURL(e)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 300))
		return nil, fmt.Errorf("openweather HTTP %d: %s", res.StatusCode, string(b))
	}
	var raw struct {
		Weather []struct {
			ID          int    `json:"id"`
			Description string `json:"description"`
		} `json:"weather"`
		Main struct {
			Temp      float64 `json:"temp"`
			FeelsLike float64 `json:"feels_like"`
			Humidity  int     `json:"humidity"`
		} `json:"main"`
		Wind struct {
			Speed float64 `json:"speed"`
		} `json:"wind"`
		Rain struct {
			OneH float64 `json:"1h"`
		} `json:"rain"`
		Dt int64 `json:"dt"`
	}
	if e = json.NewDecoder(res.Body).Decode(&raw); e != nil {
		return nil, e
	}
	if len(raw.Weather) == 0 {
		return nil, fmt.Errorf("openweather: respons tanpa weather")
	}
	code, label, icon := MapOWMCondition(raw.Weather[0].ID)
	r := func(v float64) float64 { return math.Round(v*10) / 10 }
	return &WeatherLive{code, label, icon, r(raw.Main.Temp), r(raw.Main.FeelsLike), float64(raw.Main.Humidity), r(raw.Wind.Speed * 3.6), r(raw.Rain.OneH), time.Unix(raw.Dt, 0).UTC()}, nil
}
