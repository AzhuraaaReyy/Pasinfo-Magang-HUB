package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// travelEvalQuery is one evaluation query of the text recommendation threshold. relevant selects, with SQL over the
// structured columns (category, type, name), the "type:slug" keys of the items that answer it, so the labels are
// reproducible and not chosen by hand; an empty relevant marks a query outside the assistant's topics.
type travelEvalQuery struct {
	kind, text, relevant string
}

var travelEvalQueries = []travelEvalQuery{
	{"deskripsi", "Tempat wisata alam yang cocok untuk keluarga", `SELECT 'wisata:'||d.slug FROM destinations d JOIN travel_categories c ON c.id=d.category_id WHERE c.name IN ('Wisata Alam','Keluarga')`},
	{"deskripsi", "Rekomendasi kuliner khas Pasuruan", `SELECT 'kuliner:'||slug FROM culinaries`},
	{"deskripsi", "Tempat bersejarah dan peninggalan kerajaan", `SELECT 'wisata:'||d.slug FROM destinations d JOIN travel_categories c ON c.id=d.category_id WHERE c.name='Sejarah & Budaya' UNION SELECT 'budaya:'||slug FROM cultures WHERE culture_type IN ('situs-sejarah','museum') UNION SELECT 'acara:'||slug FROM events WHERE event_type IN ('sejarah','museum')`},
	{"deskripsi", "Kegiatan budaya atau acara menarik di Pasuruan", `SELECT 'acara:'||slug FROM events UNION SELECT 'budaya:'||slug FROM cultures WHERE culture_type IN ('kesenian','tradisi')`},
	{"deskripsi", "Tempat wisata dengan suasana sejuk dan pemandangan pegunungan", `SELECT 'wisata:'||d.slug FROM destinations d JOIN travel_categories c ON c.id=d.category_id WHERE c.name='Wisata Alam'`},
	{"deskripsi", "Tempat ibadah dan wisata religi", `SELECT 'wisata:'||d.slug FROM destinations d JOIN travel_categories c ON c.id=d.category_id WHERE c.name='Wisata Religi' UNION SELECT 'budaya:'||slug FROM cultures WHERE name ~* '(masjid|pura|gereja|klenteng|makam|pesantren)'`},
	{"kata kunci", "kuliner", `SELECT 'kuliner:'||slug FROM culinaries`},
	{"kata kunci", "candi", `SELECT 'wisata:'||slug FROM destinations WHERE name ILIKE '%candi%' UNION SELECT 'budaya:'||slug FROM cultures WHERE name ILIKE '%candi%'`},
	{"kata kunci", "air terjun", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* '(coban|air terjun)'`},
	{"kata kunci", "masjid", `SELECT 'wisata:'||slug FROM destinations WHERE name ILIKE '%masjid%' UNION SELECT 'budaya:'||slug FROM cultures WHERE name ILIKE '%masjid%'`},
	{"kata kunci", "museum", `SELECT 'wisata:'||slug FROM destinations WHERE name ILIKE '%museum%' UNION SELECT 'budaya:'||slug FROM cultures WHERE name ILIKE '%museum%' OR culture_type='museum' UNION SELECT 'acara:'||slug FROM events WHERE name ILIKE '%museum%' OR event_type='museum'`},
	{"kata kunci", "pantai", `SELECT 'wisata:'||slug FROM destinations WHERE name ~* '(pantai|pesisir)'`},
	{"di luar topik", "harga saham hari ini", ""},
	{"di luar topik", "servis laptop rusak", ""},
	{"di luar topik", "tiket pesawat ke Bali", ""},
	{"di luar topik", "resep kue ulang tahun", ""},
	{"di luar topik", "jadwal pertandingan sepak bola", ""},
}

// Jobdesk 9 Nov point 4 (read-only; TRAVEL_SEARCH_DSN and TRAVEL_THRESHOLD_EVAL=1, one embedding per query): for each
// candidate threshold, the cards of each query (limit 6) are compared with the labels. It prints the table the
// threshold of GET /recommendations/travel is chosen from.
func TestTravelRecommendationThresholdEvaluation(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" || os.Getenv("TRAVEL_THRESHOLD_EVAL") != "1" {
		t.Skip("TRAVEL_SEARCH_DSN and TRAVEL_THRESHOLD_EVAL=1 not set")
	}
	// Every candidate threshold is applied here, so the configured one must not cut first.
	t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "0.01")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	live, err := NewLLMFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	r, rec := NewRetriever(db), NewRecommender(db)
	type scored struct {
		results  []SemanticResult
		relevant map[string]bool
	}
	runs := make([]scored, len(travelEvalQueries))
	for i, q := range travelEvalQueries {
		res, err := r.SearchTravelContent(context.Background(), live, q.text, TravelSearch{}, 30)
		if err != nil {
			t.Fatalf("%q: %v", q.text, err)
		}
		runs[i].results = res
		runs[i].relevant = map[string]bool{}
		if q.relevant != "" {
			var keys []string
			if err := db.Raw(q.relevant).Scan(&keys).Error; err != nil {
				t.Fatalf("%q labels: %v", q.text, err)
			}
			for _, k := range keys {
				runs[i].relevant[k] = true
			}
		}
		top := ""
		if len(res) > 0 {
			top = fmt.Sprintf("%s %.3f", pointerString(res[0].SourceLabel), res[0].Similarity)
		}
		t.Logf("%-13s %-62q relevan=%-3d top: %s", q.kind, q.text, len(runs[i].relevant), top)
	}
	t.Logf("ambang | presisi deskripsi | presisi kata kunci | query relevan kosong | kartu di luar topik")
	for th := 0.55; th <= 0.7201; th += 0.01 {
		var hitD, shownD, hitK, shownK, emptyPos, offTopic int
		var detail []string
		for i, q := range travelEvalQueries {
			var kept []SemanticResult
			for _, x := range runs[i].results {
				if x.Similarity >= th {
					kept = append(kept, x)
				}
			}
			cards, err := rec.RecommendByText(context.Background(), kept, 6)
			if err != nil {
				t.Fatal(err)
			}
			if q.relevant == "" {
				offTopic += len(cards)
				continue
			}
			if len(cards) == 0 {
				emptyPos++
				detail = append(detail, "kosong:"+q.text)
			}
			hits := 0
			for _, c := range cards {
				if runs[i].relevant[c.Type+":"+deref(c.Slug)] {
					hits++
				}
			}
			if q.kind == "deskripsi" {
				hitD, shownD = hitD+hits, shownD+len(cards)
			} else {
				hitK, shownK = hitK+hits, shownK+len(cards)
			}
		}
		pct := func(a, b int) string {
			if b == 0 {
				return "  -  "
			}
			return fmt.Sprintf("%5.1f%%", 100*float64(a)/float64(b))
		}
		t.Logf("%.2f   | %s (%2d/%2d)     | %s (%2d/%2d)      | %d                    | %d   %s", th, pct(hitD, shownD), hitD, shownD, pct(hitK, shownK), hitK, shownK, emptyPos, offTopic, strings.Join(detail, "; "))
	}
}
