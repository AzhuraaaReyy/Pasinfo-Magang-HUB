package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"wildan-news-backend/internal/services"
)

var sampleQuestions = []string{
	"Apa saja destinasi wisata yang dapat dikunjungi di Pasuruan?",
	"Apa rekomendasi kuliner khas Pasuruan?",
	"Apa budaya atau sejarah menarik di Pasuruan?",
	"Apa yang perlu diketahui wisatawan sebelum mengunjungi Pasuruan?",
}

func main() {
	_ = godotenv.Load()
	llm, err := services.NewLLMFromEnv()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[FATAL] konfigurasi LLM tidak valid: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Provider aktif: %s\n", llm.Name())
	args := os.Args[1:]
	if len(args) > 0 && args[0] == "--embed" {
		runEmbed(llm)
		return
	}
	questions := sampleQuestions
	if len(args) > 0 {
		questions = []string{strings.Join(args, " ")}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	for i, question := range questions {
		start := time.Now()
		answer, err := llm.Chat(ctx, []services.ChatMessage{{Role: "system", Content: "Anda asisten wisata Pasuruan. Jawab dalam Bahasa Indonesia."}, {Role: "user", Content: question}})
		if err != nil {
			fmt.Printf("[%d] ERROR: %v\n", i+1, err)
			continue
		}
		fmt.Printf("[%d] TANYA: %s\nJAWAB (%.1fs): %s\n", i+1, question, time.Since(start).Seconds(), answer)
	}
}

func runEmbed(llm services.LLMProvider) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	result, err := llm.Embed(ctx, "destinasi wisata di Pasuruan")
	if err != nil {
		fmt.Fprintf(os.Stderr, "[FATAL] embedding gagal: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Model embedding: %s\nDimensi: %d (diharapkan %d)\n", result.Model, len(result.Vector), services.EmbeddingDimensions)
	if err := services.EnsureDims(result.Vector); err != nil {
		fmt.Fprintf(os.Stderr, "[FATAL] %v\n", err)
		os.Exit(1)
	}
	fmt.Println("OK: dimensi selaras vector(768).")
}
