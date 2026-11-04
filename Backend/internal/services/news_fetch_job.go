package services

import (
	"context"
	"log"
	"time"
)

// NewsFetchInterval is how often the API fetches new articles (berita-indo-api: 9 Tempo/Antara
// endpoints, no API key). Owner decision 2026-10-31: news is fetched automatically, not by hand.
const NewsFetchInterval = 12 * time.Hour

// newsFetchFirstDelay lets the API, the database, and Ollama settle after startup; it also keeps the
// first run apart from the RUN_STARTUP_NEWS_FETCH fetch of an empty news table.
const newsFetchFirstDelay = 5 * time.Minute

// StartNewsFetchJob fetches news in the background: newsFetchFirstDelay after startup, then every
// NewsFetchInterval. Duplicates are skipped by source_url; new articles are published and reach the AI
// corpus at the next knowledge refresh.
func StartNewsFetchJob() {
	go runPeriodically(context.Background(), newsFetchFirstDelay, NewsFetchInterval, func() {
		result, err := FetchAndSaveNews()
		if err != nil {
			log.Printf("[NewsJob] fetch failed: %v", err)
			return
		}
		log.Printf("[NewsJob] fetched=%d saved=%d skipped=%d errors=%d", result.Fetched, result.Saved, result.Skipped, result.Errors)
	})
}

// runPeriodically calls run after first, then every interval, until ctx ends.
func runPeriodically(ctx context.Context, first, interval time.Duration, run func()) {
	timer := time.NewTimer(first)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			run()
			timer.Reset(interval)
		}
	}
}
