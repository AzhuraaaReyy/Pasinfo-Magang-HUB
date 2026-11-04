package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

type WilayahResponse struct {
	Data []struct {
		Code string `json:"code"`
		Name string `json:"name"`
	} `json:"data"`
}

var client = &http.Client{Timeout: 10 * time.Second}

func fetchAPI(url string) (*WilayahResponse, error) {
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var res WilayahResponse
	err = json.Unmarshal(body, &res)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func main() {
	database.ConnectDB()

	if err := database.DB.AutoMigrate(&models.Province{}, &models.Regency{}, &models.District{}, &models.Village{}); err != nil {
		log.Fatalf("gagal AutoMigrate wilayah: %v", err)
	}

	log.Println("Fetching Provinces...")
	provRes, err := fetchAPI("https://wilayah.id/api/provinces.json")
	if err != nil {
		log.Fatal(err)
	}

	for _, p := range provRes.Data {
		database.DB.FirstOrCreate(&models.Province{Code: p.Code, Name: p.Name}, models.Province{Code: p.Code})
	}
	log.Printf("Seeded %d provinces\n", len(provRes.Data))

	log.Println("Fetching Regencies...")
	var allRegencies []models.Regency
	for _, p := range provRes.Data {
		regRes, err := fetchAPI(fmt.Sprintf("https://wilayah.id/api/regencies/%s.json", p.Code))
		if err == nil {
			for _, r := range regRes.Data {
				allRegencies = append(allRegencies, models.Regency{Code: r.Code, Name: r.Name, ProvinceCode: p.Code})
			}
		}
	}
	if len(allRegencies) > 0 {
		database.DB.CreateInBatches(allRegencies, 500)
	}
	log.Printf("Seeded %d regencies\n", len(allRegencies))

	log.Println("Fetching Districts (Using concurrency)...")
	var allDistricts []models.District
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 20) // 20 concurrent requests

	for _, r := range allRegencies {
		wg.Add(1)
		sem <- struct{}{}
		go func(regCode string) {
			defer wg.Done()
			defer func() { <-sem }()
			distRes, err := fetchAPI(fmt.Sprintf("https://wilayah.id/api/districts/%s.json", regCode))
			if err == nil {
				mu.Lock()
				for _, d := range distRes.Data {
					allDistricts = append(allDistricts, models.District{Code: d.Code, Name: d.Name, RegencyCode: regCode})
				}
				mu.Unlock()
			}
		}(r.Code)
	}
	wg.Wait()
	if len(allDistricts) > 0 {
		database.DB.CreateInBatches(allDistricts, 500)
	}
	log.Printf("Seeded %d districts\n", len(allDistricts))

	log.Println("Fetching Villages (Using concurrency - this might take a while)...")
	var vWg sync.WaitGroup
	vSem := make(chan struct{}, 10) // Reduced to 10 concurrent requests to avoid rate limits

	for i, d := range allDistricts {
		vWg.Add(1)
		vSem <- struct{}{}
		go func(distCode string, idx int) {
			defer vWg.Done()
			defer func() { <-vSem }()
			vilRes, err := fetchAPI(fmt.Sprintf("https://wilayah.id/api/villages/%s.json", distCode))
			if err == nil {
				var batch []models.Village
				for _, v := range vilRes.Data {
					batch = append(batch, models.Village{Code: v.Code, Name: v.Name, DistrictCode: distCode})
				}
				if len(batch) > 0 {
					database.DB.CreateInBatches(batch, 200)
				}
			}
			if idx%100 == 0 {
				log.Printf("Progress: %d / %d districts fetched for villages\n", idx, len(allDistricts))
			}
		}(d.Code, i)
	}
	vWg.Wait()
	log.Println("Wilayah seeding completed successfully!")
}
