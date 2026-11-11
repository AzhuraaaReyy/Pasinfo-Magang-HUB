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

// newsEvalQueries are the evaluation queries of the news search threshold (jobdesk 11 Nov point 1, N2). relevant selects,
// with SQL over the news columns (category, title, content), the ids of the published news that answer the query, so the
// labels are reproducible and not chosen by hand; an empty relevant marks a query no news answers.
var newsEvalQueries = []travelEvalQuery{
	{"deskripsi", "Perkembangan harga emas dan investasi", `SELECT n.id FROM news n WHERE n.status='published' AND (n.title ~* '(emas|investasi|saham|tabungan)' OR n.content ~* '(harga emas|investasi)')`},
	{"deskripsi", "Berita pertandingan olahraga", `SELECT n.id FROM news n JOIN categories c ON c.id=n.category_id WHERE n.status='published' AND c.slug='olahraga'`},
	{"deskripsi", "Peluncuran HP dan gadget terbaru", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(\mhp\M|smartphone|ponsel|tablet|galaxy|poco|iphone|android|gadget|laptop)'`},
	{"deskripsi", "Film dan musik yang sedang ramai", `SELECT n.id FROM news n JOIN categories c ON c.id=n.category_id WHERE n.status='published' AND c.slug='hiburan'`},
	{"deskripsi", "Kebijakan politik dan pemerintahan", `SELECT n.id FROM news n JOIN categories c ON c.id=n.category_id WHERE n.status='published' AND c.slug IN ('politik','nasional')`},
	{"deskripsi", "Bantuan sosial untuk masyarakat", `SELECT n.id FROM news n WHERE n.status='published' AND (n.title ~* '(bansos|bantuan|\mpkh\M|\mblt\M|desil)' OR n.content ~* 'bantuan sosial')`},
	{"kata kunci", "emas", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '\memas\M'`},
	{"kata kunci", "bansos", `SELECT n.id FROM news n WHERE n.status='published' AND (n.title ~* '(bansos|bantuan sosial)' OR n.content ~* '(bansos|bantuan sosial)')`},
	{"kata kunci", "film", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(film|sinopsis|bioskop)'`},
	{"kata kunci", "zakat", `SELECT n.id FROM news n WHERE n.status='published' AND (n.title ~* 'zakat' OR n.content ~* 'zakat')`},
	{"kata kunci", "NBA", `SELECT n.id FROM news n WHERE n.status='published' AND (n.title ~* '\mnba\M' OR n.content ~* '\mnba\M')`},
	{"kata kunci", "smartphone", `SELECT n.id FROM news n WHERE n.status='published' AND n.title ~* '(\mhp\M|smartphone|ponsel|galaxy|poco|iphone|android)'`},
	{"di luar topik", "resep kue ulang tahun", ""},
	{"di luar topik", "wisata alam pegunungan di Pasuruan", ""},
	{"di luar topik", "cara merawat tanaman hias", ""},
	{"di luar topik", "kuliner rawon khas Pasuruan", ""},
	{"di luar topik", "lirik lagu anak-anak", ""},
}

// Jobdesk 11 Nov point 1, N2 (read-only; TRAVEL_SEARCH_DSN and NEWS_THRESHOLD_EVAL=1, one embedding per query): for each
// candidate threshold, the news results of each query (limit 6) are compared with the labels. It prints the table the
// threshold of the news search (SearchNews) is chosen from.
func TestNewsSearchThresholdEvaluation(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" || os.Getenv("NEWS_THRESHOLD_EVAL") != "1" {
		t.Skip("TRAVEL_SEARCH_DSN and NEWS_THRESHOLD_EVAL=1 not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	live, err := NewLLMFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	r := NewRetriever(db)
	type run struct {
		results  []SemanticResult
		relevant map[int64]bool
	}
	runs := make([]run, len(newsEvalQueries))
	for i, q := range newsEvalQueries {
		res, err := r.SemanticSearchNews(context.Background(), live, q.text, "", 6)
		if err != nil {
			t.Fatalf("%q: %v", q.text, err)
		}
		runs[i] = run{results: res, relevant: map[int64]bool{}}
		if q.relevant != "" {
			var ids []int64
			if err := db.Raw(q.relevant).Scan(&ids).Error; err != nil {
				t.Fatalf("%q labels: %v", q.text, err)
			}
			for _, id := range ids {
				runs[i].relevant[id] = true
			}
		}
		var top []string
		for _, x := range res {
			mark := "-"
			if runs[i].relevant[pointerInt64Value(x.SourceID)] {
				mark = "Y"
			}
			top = append(top, fmt.Sprintf("%.3f%s", x.Similarity, mark))
		}
		label := ""
		if len(res) > 0 {
			label = pointerString(res[0].SourceLabel)
		}
		t.Logf("%-13s %-42q relevan=%-3d skor: %s | teratas: %s", q.kind, q.text, len(runs[i].relevant), strings.Join(top, " "), label)
	}
	t.Logf("ambang | presisi deskripsi | presisi kata kunci | query relevan kosong | hasil di luar topik")
	for th := 0.55; th <= 0.7001; th += 0.01 {
		var hitD, shownD, hitK, shownK, emptyPos, offTopic int
		var empty []string
		for i, q := range newsEvalQueries {
			hits, shown := 0, 0
			for _, x := range runs[i].results {
				if x.Similarity < th {
					continue
				}
				shown++
				if runs[i].relevant[pointerInt64Value(x.SourceID)] {
					hits++
				}
			}
			switch {
			case q.relevant == "":
				offTopic += shown
			case q.kind == "deskripsi":
				hitD, shownD = hitD+hits, shownD+shown
			default:
				hitK, shownK = hitK+hits, shownK+shown
			}
			if q.relevant != "" && shown == 0 {
				emptyPos++
				empty = append(empty, q.text)
			}
		}
		pct := func(a, b int) string {
			if b == 0 {
				return "  -  "
			}
			return fmt.Sprintf("%5.1f%%", 100*float64(a)/float64(b))
		}
		t.Logf("%.2f   | %s (%2d/%2d)     | %s (%2d/%2d)      | %d                    | %d   %s", th, pct(hitD, shownD), hitD, shownD, pct(hitK, shownK), hitK, shownK, emptyPos, offTopic, strings.Join(empty, "; "))
	}
}
