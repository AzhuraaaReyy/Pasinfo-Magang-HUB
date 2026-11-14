package services

import (
	"context"
	"log"
	"time"
)

// NewsFetchInterval is how often the API fetches new articles (FetchAndSaveNews: freenewsapi.io and berita-indo-api,
// each the backup of the other). Owner decision 2026-10-31: news is fetched automatically, not by hand. One freenewsapi
// run is about 77 requests (7 topics × 1 list + 10 details) of its 5,000 a day.
const NewsFetchInterval = 12 * time.Hour

// newsFetchFirstDelay lets the API, the database, and Ollama settle after startup; it also keeps the
// first run apart from the RUN_STARTUP_NEWS_FETCH fetch of an empty news table.
const newsFetchFirstDelay = 5 * time.Minute

// StartNewsFetchJob fetches news in the background: newsFetchFirstDelay after startup, then every
// NewsFetchInterval. Duplicates are skipped by source_url and by the same title and content (duplicateNews); new
// articles are published, and the fetch asks the knowledge job for an early refresh (RequestKnowledgeRefresh), so
// they reach the AI corpus without waiting for its next turn.
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
			runRecovered(run)
			timer.Reset(interval)
		}
	}
}

// runRecovered calls one run of a background job and logs a panic instead of letting it end the API process: these
// goroutines have no other recover (P1-2, jobdesk 14 Nov, Owner 2026-11-14; the corpus job has refreshOnce since W1).
// The job goes on at its next turn.
func runRecovered(run func()) {
	defer func() {
		if v := recover(); v != nil {
			log.Printf("[Job] background run panicked, next run as scheduled: %v", v)
		}
	}()
	run()
}
