// Command embed-faq refreshes the AI knowledge corpus (faq_knowledge_bases) from the domain tables.
// The API does the same automatically (services.StartKnowledgeRefreshJob); this command is for a
// manual check or a full rebuild.
//
//	go run ./cmd/embed-faq            embed only new or changed documents
//	go run ./cmd/embed-faq -dry-run   count what would be embedded, write nothing
//	go run ./cmd/embed-faq -force     embed every document (e.g. after changing the embedding model)
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/services"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "count new or changed documents without embedding or writing")
	force := flag.Bool("force", false, "embed every document, also unchanged ones")
	flag.Parse()

	// Load, like cmd/api: a variable set in the shell wins over .env, so DB_NAME=… go run ./cmd/embed-faq targets
	// that database (K1, jobdesk 31 Okt, 2026-11-03; Overload silently used the .env database).
	_ = godotenv.Load()
	database.ConnectDB()
	c := config.LoadLLM()
	if e := c.Validate(); e != nil {
		log.Fatalf("[FATAL] konfigurasi LLM tidak valid: %v", e)
	}
	// Only embeddings are made here, so the embedding provider (EMBED_PROVIDER, default LLM_PROVIDER) is used.
	p := services.NewRetryProvider(services.NewEmbedProvider(c, c.Embed), c.Retries)
	if !*dryRun {
		// Checked first, like cmd/seed and the API worker: Gemini answers a wrong key with HTTP 400, which the corpus
		// refresh reads as a refused document, so every new or changed document lost a retry attempt (jobdesk 7 Nov, Owner
		// option A). A dry run makes no embedding call.
		healthCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err := services.ProviderHealth(healthCtx, p)
		cancel()
		if err != nil {
			log.Fatalf("[FATAL] provider embedding tidak bisa dipakai (cek EMBED_PROVIDER, API key, dan nama model di .env); tidak ada dokumen yang diproses: %v", err)
		}
	}
	regions, problems := services.LoadSeedRegions(filepath.Join("cmd", "seed", "data"))
	if len(problems) > 0 {
		// Without them culinary, culture, and event documents would lose their map zone.
		log.Fatalf("[FATAL] seed region files: %v", problems)
	}
	r := services.NewRetriever(database.DB)
	r.Regions, r.DryRun, r.Force = regions, *dryRun, *force
	r.EmbedInterval = c.EmbedInterval()
	if e := r.UpsertSources(context.Background(), p); e != nil {
		if errors.Is(e, services.ErrRefreshInProgress) {
			log.Fatalf("[FATAL] refresh corpus sedang berjalan di proses lain (API); coba lagi setelah selesai")
		}
		log.Fatalf("[FATAL] refresh corpus gagal: %v", e)
	}
	if *dryRun {
		fmt.Printf("dry run: %d would be embedded, %d unchanged, %d would be deactivated, %d failed waiting for retry\n", r.Stats.Pending, r.Stats.Skipped, r.Stats.Deactivated, r.Stats.Deferred)
		return
	}
	fmt.Printf("embeddings updated: embedded=%d unchanged=%d deactivated=%d failed=%d deferred=%d\n", r.Stats.Embedded, r.Stats.Skipped, r.Stats.Deactivated, r.Stats.Failed, r.Stats.Deferred)
}
