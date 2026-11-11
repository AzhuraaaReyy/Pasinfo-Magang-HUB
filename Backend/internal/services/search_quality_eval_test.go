package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Threshold discussion (Owner 2026-11-11, option a): a larger labelled set for the news and travel text search, and the
// candidates below the threshold, so other ways of cutting the list (absolute threshold, distance to the first card, a
// second LLM judgement) can be compared offline before anything changes. Labels come from SQL over the source columns,
// as in news_threshold_eval_test.go and travel_threshold_eval_test.go; an empty label marks a query nothing answers.
var searchQualityNewsExtra = []travelEvalQuery{
	{"kata kunci", "hp", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(\mhp\M|smartphone|ponsel)'`},
	{"kata kunci", "AI", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(\mai\M|kecerdasan buatan)'`},
	{"kata kunci", "KTP", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(\mktp|\mkk\M|kependudukan|\mikd\M)'`},
	{"kata kunci", "jantung", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* 'jantung'`},
	{"kata kunci", "pinjol", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(pinjol|pinjaman online)'`},
	{"kata kunci", "pajak", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* 'pajak'`},
	{"kata kunci", "Prancis", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(prancis|perancis)'`},
	{"kata kunci", "banjir", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(gempa|banjir|longsor|bencana)'`},
	{"deskripsi", "Cara menjaga kesehatan jantung", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* 'jantung'`},
	{"deskripsi", "Bahaya pinjaman online ilegal", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(pinjol|pinjaman online)'`},
	{"deskripsi", "Bencana alam yang melanda daerah di Indonesia", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(gempa|banjir|longsor|bencana)'`},
	{"deskripsi", "Aturan pajak terbaru dari pemerintah", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* 'pajak'`},
	{"di luar topik", "cara memasak rendang", ""},
	{"di luar topik", "jadwal sholat hari ini", ""},
	{"di luar topik", "kursus bahasa Inggris online", ""},
	{"di luar topik", "sewa mobil di Pasuruan", ""},
}

var searchQualityTravelExtra = []travelEvalQuery{
	{"kata kunci", "rawon", `SELECT 'kuliner:'||slug FROM culinaries WHERE name ~* 'rawon'`},
	{"kata kunci", "kopi", `SELECT 'kuliner:'||slug FROM culinaries WHERE culinary_type='kopi-minuman' OR name ~* 'kopi'`},
	{"kata kunci", "bromo", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* '(bromo|penanjakan)'`},
	{"kata kunci", "klenteng", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* 'klenteng' UNION SELECT 'budaya:'||slug FROM cultures WHERE name ~* 'klenteng'`},
	{"kata kunci", "makam", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* 'makam' UNION SELECT 'budaya:'||slug FROM cultures WHERE name ~* 'makam'`},
	{"kata kunci", "taman", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* 'taman'`},
	{"kata kunci", "festival", `SELECT 'acara:'||slug FROM events WHERE name ~* '(festival|fest\M|karnaval|carnival)'`},
	{"deskripsi", "Tempat makan rawon yang enak", `SELECT 'kuliner:'||slug FROM culinaries WHERE name ~* 'rawon'`},
	{"deskripsi", "Kedai kopi untuk bersantai", `SELECT 'kuliner:'||slug FROM culinaries WHERE culinary_type='kopi-minuman' OR name ~* 'kopi'`},
	{"deskripsi", "Melihat matahari terbit dari gunung", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* '(bromo|penanjakan|gunung)'`},
	{"deskripsi", "Pertunjukan kesenian tradisional", `SELECT 'budaya:'||slug FROM cultures WHERE culture_type='kesenian' UNION SELECT 'acara:'||slug FROM events WHERE event_type='kesenian'`},
	{"di luar topik", "harga emas hari ini", ""},
	{"di luar topik", "cara membuat KTP", ""},
	{"di luar topik", "spesifikasi HP terbaru", ""},
	{"di luar topik", "lowongan kerja pabrik", ""},
}

type searchQualityCard struct {
	Key      string  `json:"key"`
	Name     string  `json:"name"`
	Category string  `json:"category,omitempty"`
	Sim      float64 `json:"sim"`
	Rel      bool    `json:"rel"`
	Reranked *bool   `json:"llm,omitempty"`
}

type searchQualityRow struct {
	Domain   string              `json:"domain"`
	Kind     string              `json:"kind"`
	Query    string              `json:"query"`
	Labelled int                 `json:"labelled"`
	Cards    []searchQualityCard `json:"cards"`
	LLMms    int64               `json:"llm_ms,omitempty"`
	LLMError string              `json:"llm_error,omitempty"`
}

// rerankPrompt v2 (option B, 2026-11-11): v1 asked for "the same topic, not only similar words" and refused right
// articles whose angle differed from the question (heart health, illegal online loans, tax rules) and cafés for "kopi".
// v2 accepts a candidate about the thing the user looks for, whatever its angle, and refuses only another subject. Its
// examples (skin care, bakso) are on purpose not in the evaluation set, so the set still measures the prompt.
const rerankPrompt = "Kamu menyaring hasil pencarian sebuah portal berita dan wisata. Tentukan kandidat mana yang membahas hal yang dicari pengguna. " +
	"Terima kandidat jika pokok bahasannya adalah hal yang dicari, walaupun sudut pandangnya berbeda dari kalimat pencarian " +
	"(contoh: pencarian tentang merawat kulit menerima artikel tentang masalah atau penyakit kulit; pencarian \"bakso\" menerima warung atau rumah makan yang menjual bakso). " +
	"Untuk pencarian satu atau dua kata, terima kandidat yang pokok bahasannya hal tersebut. " +
	"Tolak kandidat yang pokok bahasannya hal lain dan hanya kebetulan memakai kata yang mirip atau berkaitan jauh. " +
	"Kategori di dalam [ ] membantu memahami jenis kandidat. " +
	"Jawab hanya JSON: {\"relevan\": [nomor kandidat yang diterima]}. Jika tidak ada, jawab {\"relevan\": []}."

var rerankNumbers = regexp.MustCompile(`\[[0-9,\s]*\]`)

// rerankCandidates asks the chat model which candidates answer the query: one call per query, numbers only.
func rerankCandidates(ctx context.Context, p LLMProvider, query string, cards []searchQualityCard, summaries []string) (map[int]bool, error) {
	var list strings.Builder
	for i, c := range cards {
		fmt.Fprintf(&list, "%d. %s", i+1, c.Name)
		if c.Category != "" {
			fmt.Fprintf(&list, " [%s]", c.Category)
		}
		if summaries[i] != "" {
			fmt.Fprintf(&list, " — %s", summaries[i])
		}
		list.WriteString("\n")
	}
	reply, err := p.Chat(ctx, []ChatMessage{
		{Role: "system", Content: rerankPrompt},
		{Role: "user", Content: "Pencarian: " + query + "\nKandidat:\n" + list.String()},
	})
	if err != nil {
		return nil, err
	}
	match := rerankNumbers.FindString(reply)
	if match == "" {
		return nil, fmt.Errorf("no list in reply %q", reply)
	}
	out := map[int]bool{}
	for _, part := range strings.Split(strings.Trim(match, "[]"), ",") {
		if n, err := strconv.Atoi(strings.TrimSpace(part)); err == nil {
			out[n-1] = true
		}
	}
	return out, nil
}

// Read-only (TRAVEL_SEARCH_DSN, SEARCH_QUALITY_EVAL=1, SEARCH_QUALITY_OUT=<file>; SEARCH_QUALITY_RERANK=1 adds one chat
// call per query): the 20 first cards of each query through the endpoint path (SearchNews or SearchTravelContent, then
// RecommendByText) with the threshold opened to 0.01 and no relative cutoff, written as JSON for the offline comparison.
func TestSearchQualityEvaluation(t *testing.T) {
	dsn, out := os.Getenv("TRAVEL_SEARCH_DSN"), os.Getenv("SEARCH_QUALITY_OUT")
	if dsn == "" || out == "" || os.Getenv("SEARCH_QUALITY_EVAL") != "1" {
		t.Skip("TRAVEL_SEARCH_DSN, SEARCH_QUALITY_EVAL=1 and SEARCH_QUALITY_OUT not set")
	}
	t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "0.01")
	t.Setenv("RECOMMEND_RELATIVE_CUTOFF", "1") // every cut is compared offline
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	live, err := NewLLMFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	rerank := os.Getenv("SEARCH_QUALITY_RERANK") == "1"
	r, rec, ctx := NewRetriever(db), NewRecommender(db), context.Background()
	type item struct {
		domain string
		q      travelEvalQuery
	}
	var items []item
	for _, q := range append(append([]travelEvalQuery{}, newsEvalQueries...), searchQualityNewsExtra...) {
		items = append(items, item{"berita", q})
	}
	for _, q := range append(append([]travelEvalQuery{}, travelEvalQueries...), searchQualityTravelExtra...) {
		items = append(items, item{"travel", q})
	}
	var rows []searchQualityRow
	for _, it := range items {
		var results []SemanticResult
		if it.domain == "berita" {
			results, err = r.SearchNews(ctx, live, it.q.text, "", 50)
		} else {
			results, err = r.SearchTravelContent(ctx, live, it.q.text, TravelSearch{}, 50)
		}
		if err != nil {
			t.Fatalf("%q: %v", it.q.text, err)
		}
		cards, err := rec.RecommendByText(ctx, results, 20)
		if err != nil {
			t.Fatal(err)
		}
		relevant := map[string]bool{}
		if it.q.relevant != "" {
			var keys []string
			if err := db.Raw(it.q.relevant).Scan(&keys).Error; err != nil {
				t.Fatalf("%q labels: %v", it.q.text, err)
			}
			for _, k := range keys {
				if it.domain == "berita" {
					k = "berita:" + k
				}
				relevant[k] = true
			}
		}
		row := searchQualityRow{Domain: it.domain, Kind: it.q.kind, Query: it.q.text, Labelled: len(relevant)}
		var summaries []string
		for _, c := range cards {
			key := c.Type + ":" + pointerString(c.Slug)
			if it.domain == "berita" {
				key = fmt.Sprintf("berita:%d", c.ID)
			}
			row.Cards = append(row.Cards, searchQualityCard{Key: key, Name: c.Name, Category: pointerString(c.Category), Sim: c.Similarity, Rel: relevant[key]})
			summaries = append(summaries, firstSentence(pointerString(c.Summary), 160))
		}
		if rerank && len(row.Cards) > 0 {
			n := min(len(row.Cards), 15)
			start := time.Now()
			verdict, err := rerankCandidates(ctx, live, it.q.text, row.Cards[:n], summaries[:n])
			row.LLMms = time.Since(start).Milliseconds()
			if err != nil {
				row.LLMError = err.Error()
			} else {
				for i := 0; i < n; i++ {
					v := verdict[i]
					row.Cards[i].Reranked = &v
				}
			}
			time.Sleep(time.Second)
		}
		rows = append(rows, row)
		time.Sleep(400 * time.Millisecond)
	}
	raw, _ := json.MarshalIndent(rows, "", " ")
	if err := os.WriteFile(out, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("%d queries written to %s", len(rows), out)
}
