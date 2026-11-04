package services

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

// created_at holds the source's publication time; published_at wins when the fetch stored it (Owner 2026-11-01).
func TestNewsKnowledgeTextAddsCategorySourceAndPublishedDate(t *testing.T) {
	n := models.News{Content: "Satgas PRR membangun sumur bor.", Source: "Tempo", Category: models.Category{Name: "NASIONAL"}, CreatedAt: time.Date(2026, 10, 24, 0, 49, 0, 0, time.UTC)}
	got := newsKnowledgeText(n)
	want := "Satgas PRR membangun sumur bor.\nKategori berita: Nasional\nSumber: Tempo\nTanggal terbit: 24 Oktober 2026"
	if got != want {
		t.Fatalf("got %q\nwant %q", got, want)
	}
	published := time.Date(2026, 10, 20, 3, 0, 0, 0, time.UTC)
	n.PublishedAt = &published
	if got := newsKnowledgeText(n); !strings.HasSuffix(got, "\nTanggal terbit: 20 Oktober 2026") {
		t.Fatalf("published_at not used: %q", got)
	}
	excerpt := "Ringkasan."
	if got := newsKnowledgeText(models.News{Excerpt: &excerpt, Content: "Isi panjang."}); got != "Ringkasan." {
		t.Fatalf("excerpt first, empty fields skipped: %q", got)
	}
}

func seedNews(t *testing.T) *NewsRetrieverFixture {
	t.Helper()
	db := newKnowledgeTestDB(t)
	if err := db.AutoMigrate(&models.Category{}); err != nil {
		t.Fatal(err)
	}
	categories := []models.Category{{Name: "NASIONAL", Slug: "nasional"}, {Name: "POLITIK", Slug: "politik"}, {Name: "TEKNOLOGI", Slug: "teknologi"}}
	if err := db.Create(&categories).Error; err != nil {
		t.Fatal(err)
	}
	day := func(d int) time.Time { return time.Date(2026, 10, d, 9, 0, 0, 0, time.UTC) }
	news := []models.News{
		{Title: "Banjir Aceh Utara", Slug: "banjir", SourceURL: "u1", Content: "Sumur bor.", Source: "Tempo", CategoryID: categories[0].ID, Status: "published", CreatedAt: day(20)},
		{Title: "DPR bahas anggaran", Slug: "dpr", SourceURL: "u2", Content: "Rapat DPR.", Source: "Antara News", CategoryID: categories[1].ID, Status: "published", CreatedAt: day(24)},
		{Title: "Pilkada serentak", Slug: "pilkada", SourceURL: "u3", Content: "Pilkada.", Source: "Tempo", CategoryID: categories[1].ID, Status: "published", CreatedAt: day(22)},
		{Title: "Draf berita", Slug: "draf", SourceURL: "u4", Content: "Draf.", CategoryID: categories[1].ID, Status: "draft", CreatedAt: day(25)},
	}
	if err := db.Create(&news).Error; err != nil {
		t.Fatal(err)
	}
	return &NewsRetrieverFixture{Retriever: NewRetriever(db)}
}

// NewsRetrieverFixture wraps a Retriever over a seeded SQLite database.
type NewsRetrieverFixture struct{ *Retriever }

func TestUpsertNewsWritesCategoryMetadataAndListsLatest(t *testing.T) {
	r := seedNews(t)
	embedder := &recordingEmbedder{}
	if err := r.UpsertNews(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	if len(embedder.inputs) != 3 || !strings.Contains(strings.Join(embedder.inputs, "\n"), "Kategori berita: Politik\nSumber: Antara News") {
		t.Fatalf("embedded texts = %q", embedder.inputs)
	}
	var meta []string
	r.DB.Raw(`SELECT CAST(metadata AS TEXT) FROM faq_knowledge_bases ORDER BY source_id`).Scan(&meta)
	if len(meta) != 3 || meta[0] != `{"news_category":"nasional"}` || meta[1] != `{"news_category":"politik"}` {
		t.Fatalf("metadata = %v", meta)
	}
	latest, err := r.LatestNews(context.Background(), "politik", 5)
	if err != nil {
		t.Fatal(err)
	}
	if len(latest) != 2 || pointerString(latest[0].SourceLabel) != "DPR bahas anggaran" || pointerString(latest[1].SourceLabel) != "Pilkada serentak" || latest[0].RetrievalMethod != "news_latest" {
		t.Fatalf("latest politik = %+v", latest)
	}
	all, _ := r.LatestNews(context.Background(), "", 1)
	if len(all) != 1 || pointerString(all[0].SourceLabel) != "DPR bahas anggaran" {
		t.Fatalf("latest of all = %+v", all)
	}
	categories, err := r.NewsCategories(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(categories) != 3 || categories[0].NewsCount != 1 || categories[1].NewsCount != 2 || categories[2].NewsCount != 0 {
		t.Fatalf("categories = %+v (a draft must not count)", categories)
	}
}

// newsFakeRetriever records news searches; the categories and latest list are fixed.
type newsFakeRetriever struct {
	fakeRetriever
	categories   []NewsCategory
	latest       []SemanticResult
	popular      []SemanticResult
	popularCalls int
	newsCategory string
	newsSearches int
	latestCalls  int
}

func (r *newsFakeRetriever) NewsCategories(context.Context) ([]NewsCategory, error) {
	return r.categories, nil
}

func (r *newsFakeRetriever) SemanticSearchNews(ctx context.Context, p LLMProvider, q, newsCategory string, limit int) ([]SemanticResult, error) {
	r.newsSearches++
	r.newsCategory = newsCategory
	return r.fakeRetriever.SemanticSearch(ctx, p, q, "berita", limit)
}

func (r *newsFakeRetriever) PopularNews(_ context.Context, newsCategory string, _ int) ([]SemanticResult, error) {
	r.popularCalls++
	r.newsCategory = newsCategory
	return r.popular, nil
}

func (r *newsFakeRetriever) LatestNews(_ context.Context, newsCategory string, _ int) ([]SemanticResult, error) {
	r.latestCalls++
	r.newsCategory = newsCategory
	return r.latest, nil
}

var stagingNewsCategories = []NewsCategory{{"nasional", "NASIONAL", 50}, {"lokal", "LOKAL", 16}, {"politik", "POLITIK", 50}, {"wisata", "WISATA", 0}, {"teknologi", "TEKNOLOGI", 0}}

func newsService(t *testing.T, retriever *newsFakeRetriever) (*ChatService, *recordingProvider, *fakeJudge) {
	t.Helper()
	provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
	service := NewChatService(newChatTestDB(t), provider, time.Second, retriever)
	judge := &fakeJudge{}
	service.Judge = judge
	service.Now = func() time.Time { return testToday }
	return service, provider, judge
}

func TestNewsCategoryQuestionSearchesThatCategory(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, fakeRetriever: fakeRetriever{results: []SemanticResult{source("news", 2, "DPR bahas anggaran", "Rapat DPR.\nKategori berita: Politik", 0.7)}}}
	service, provider, _ := newsService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 140}, "Ada berita politik tentang DPR?")
	if err != nil {
		t.Fatal(err)
	}
	if retriever.newsSearches != 1 || retriever.newsCategory != "politik" || retriever.latestCalls != 0 {
		t.Fatalf("searches=%d category=%q latest=%d", retriever.newsSearches, retriever.newsCategory, retriever.latestCalls)
	}
	system := provider.messages[0].Content
	if !strings.Contains(system, "KATEGORI_BERITA_DITANYA: Politik") || !strings.Contains(system, "ATURAN_KATEGORI: Kategori berita adalah label dari database, bukan lokasi berita") || !strings.Contains(system, "NAMA: DPR bahas anggaran") || strings.Contains(system, "ATURAN_BERITA") {
		t.Fatalf("prompt:\n%s", system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if meta["news_category"] != "Politik" || meta["news_latest"] != false {
		t.Fatalf("metadata = %v", meta)
	}
}

func TestNewsCategoryWithoutMatchListsLatestOfCategory(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(2, "DPR bahas anggaran")}}
	service, provider, _ := newsService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 141}, "Berita politik apa saja?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if retriever.latestCalls != 1 || retriever.newsCategory != "politik" || !strings.Contains(system, "ATURAN_BERITA: Berita di CONTEXT adalah berita terbaru") || !strings.Contains(system, "NAMA: DPR bahas anggaran") {
		t.Fatalf("latest=%d prompt:\n%s", retriever.latestCalls, system)
	}
}

func TestEmptyNewsCategoryOffersAvailableCategories(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories}
	service, provider, judge := newsService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 142}, "Ada berita teknologi?")
	if err != nil {
		t.Fatal(err)
	}
	want := "Maaf, saat ini belum ada berita kategori Teknologi di database Pasuruan Info. Berita yang tersedia ada di kategori Nasional, Lokal, Politik. Mau saya tampilkan salah satunya?"
	if answer := pointerString(result.Assistant.Content); answer != want || provider.messages != nil {
		t.Fatalf("answer=%q model called=%v", answer, provider.messages != nil)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if meta["retrieval_status"] != "no_source" || judge.calls != 0 || retriever.latestCalls != 0 {
		t.Fatalf("status=%v judge=%d latest=%d", meta["retrieval_status"], judge.calls, retriever.latestCalls)
	}
}

func TestLatestNewsQuestionListsMostRecentlyAdded(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(2, "DPR bahas anggaran"), eventlessNews(1, "Banjir Aceh Utara")}}
	service, provider, judge := newsService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 143}, "Berita terbaru apa?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if retriever.latestCalls != 1 || retriever.newsCategory != "" || judge.calls != 0 || strings.Index(system, "NAMA: DPR bahas anggaran") > strings.Index(system, "NAMA: Banjir Aceh Utara") || !strings.Contains(system, "ATURAN_BERITA") || strings.Contains(system, "KATEGORI_BERITA_DITANYA") {
		t.Fatalf("latest=%d category=%q judge=%d prompt:\n%s", retriever.latestCalls, retriever.newsCategory, judge.calls, system)
	}
}

func TestNewsTopicQuestionAndTravelQuestionKeepSemanticPath(t *testing.T) {
	for _, question := range []string{"Ada berita tentang banjir Aceh?", "Wisata alam di Pasuruan apa saja?"} {
		retriever := &newsFakeRetriever{categories: stagingNewsCategories, fakeRetriever: fakeRetriever{results: []SemanticResult{source("news", 1, "Banjir Aceh Utara", "Sumur bor.", 0.7)}}}
		service, provider, _ := newsService(t, retriever)
		if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 144}, question); err != nil {
			t.Fatal(err)
		}
		system := provider.messages[0].Content
		if retriever.newsSearches != 0 || retriever.latestCalls != 0 || !retriever.called || strings.Contains(system, "KATEGORI_BERITA") || strings.Contains(system, "ATURAN_BERITA") {
			t.Fatalf("%q: newsSearches=%d latest=%d prompt:\n%s", question, retriever.newsSearches, retriever.latestCalls, system)
		}
	}
}

func TestGenericNewsRecommendationAsksForCategory(t *testing.T) {
	for question, want := range map[string]bool{
		"Berikan rekomendasi berita terbaik":        true,
		"Rekomendasikan berita yang menarik dong":   true,
		"Ada berita populer?":                       true,
		"Rekomendasikan berita tentang banjir Aceh": false,
		"Rekomendasi berita nasional":               false, // names a category
		"Rekomendasikan wisata terbaik di Pasuruan": false,
		"Ada berita tentang DPR?":                   false,
	} {
		if got := isGenericNewsRecommendation(question); got != want {
			t.Errorf("%q = %v, want %v", question, got, want)
		}
	}
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, fakeRetriever: fakeRetriever{results: []SemanticResult{source("news", 1, "Banjir Aceh Utara", "Sumur bor.", 0.7)}}}
	service, provider, judge := newsService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 145}, "Berikan rekomendasi berita terbaik")
	if err != nil {
		t.Fatal(err)
	}
	answer := pointerString(result.Assistant.Content)
	want := "Tentu! Supaya rekomendasinya pas, Anda ingin berita dari kategori apa? Saat ini tersedia berita kategori Nasional, Lokal, Politik. Anda juga bisa menyebutkan topik berita yang dicari."
	if answer != want || provider.messages != nil || judge.calls != 0 || retriever.latestCalls != 0 {
		t.Fatalf("answer=%q model called=%v judge=%d latest=%d", answer, provider.messages != nil, judge.calls, retriever.latestCalls)
	}
	// The answer to the clarification names the category; the category path then answers it.
	retriever.latest = []SemanticResult{eventlessNews(1, "Banjir Aceh Utara")}
	retriever.results = nil
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 145}, "Berita nasional saja"); err != nil {
		t.Fatal(err)
	}
	if retriever.newsCategory != "nasional" || !strings.Contains(provider.messages[0].Content, "KATEGORI_BERITA_DITANYA: Nasional") {
		t.Fatalf("category=%q prompt:\n%s", retriever.newsCategory, provider.messages[0].Content)
	}
}

func TestPopularNewsWithoutViewsSaysPopularityIsUnavailable(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(1, "Banjir Aceh Utara")}}
	service, provider, _ := newsService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 146}, "Berita nasional yang populer apa?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if retriever.popularCalls != 1 || !strings.Contains(system, "DATA_POPULER: belum ada data jumlah pembaca berita.") || !strings.Contains(system, "KATEGORI_BERITA_DITANYA: Nasional") || strings.Contains(system, "jumlah pembaca terbanyak") {
		t.Fatalf("popular=%d prompt:\n%s", retriever.popularCalls, system)
	}
	// "berita populer" alone is a recommendation without category: the category is asked first.
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 147}, "Ada berita populer?")
	if err != nil {
		t.Fatal(err)
	}
	if answer := pointerString(result.Assistant.Content); !strings.Contains(answer, "kategori apa?") || !strings.Contains(answer, "Data jumlah pembaca belum tersedia") {
		t.Fatalf("answer = %q", answer)
	}
}

func TestLatestNewsIsAnsweredAsAList(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(2, "DPR bahas anggaran"), eventlessNews(1, "Banjir Aceh Utara")}}
	service, provider, _ := newsService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 149}, "Berita terbaru apa?"); err != nil {
		t.Fatal(err)
	}
	if system := provider.messages[0].Content; !strings.Contains(system, "JENIS_PERMINTAAN: list") || !strings.Contains(system, "JUMLAH_DIMINTA: 2") {
		t.Fatalf("prompt:\n%s", system)
	}
}

func TestPopularNewsWithViewsListsMostRead(t *testing.T) {
	retriever := &newsFakeRetriever{categories: stagingNewsCategories, popular: []SemanticResult{eventlessNews(2, "DPR bahas anggaran")}}
	service, provider, judge := newsService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 148}, "Berita politik terpopuler?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if retriever.newsCategory != "politik" || judge.calls != 0 || retriever.latestCalls != 0 || !strings.Contains(system, "diurutkan dari jumlah pembaca terbanyak") || strings.Contains(system, "DATA_POPULER") {
		t.Fatalf("category=%q judge=%d latest=%d prompt:\n%s", retriever.newsCategory, judge.calls, retriever.latestCalls, system)
	}
}

func TestRetrieverPopularNewsNeedsViews(t *testing.T) {
	r := seedNews(t)
	if err := r.UpsertNews(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	if got, err := r.PopularNews(context.Background(), "", 5); err != nil || len(got) != 0 {
		t.Fatalf("no views must give no popular news: %v %v", got, err)
	}
	r.DB.Exec(`UPDATE news SET views = 7 WHERE slug = 'pilkada'`)
	r.DB.Exec(`UPDATE news SET views = 3 WHERE slug = 'banjir'`)
	got, _ := r.PopularNews(context.Background(), "", 5)
	if len(got) != 2 || pointerString(got[0].SourceLabel) != "Pilkada serentak" || got[0].RetrievalMethod != "news_popular" {
		t.Fatalf("popular = %+v", got)
	}
	if politik, _ := r.PopularNews(context.Background(), "politik", 5); len(politik) != 1 {
		t.Fatalf("popular politik = %+v", politik)
	}
}

func eventlessNews(id int64, label string) SemanticResult {
	doc := source("news", id, label, label+".\nKategori berita: Politik", 0)
	doc.RelevanceStatus = "relevant"
	doc.RetrievalMethod = "news_latest"
	return doc
}

// fullRetriever supports zone search, event schedules, and news together, like the real Retriever.
type fullRetriever struct {
	newsFakeRetriever
	regionSearches int
	periodCalls    int
}

func (r *fullRetriever) SemanticSearchInRegion(ctx context.Context, p LLMProvider, q, c, region string, l int) ([]SemanticResult, error) {
	r.regionSearches++
	return r.fakeRetriever.SemanticSearch(ctx, p, q, c, l)
}

func (r *fullRetriever) EventsInPeriod(context.Context, time.Time, time.Time, string, int) ([]SemanticResult, error) {
	r.periodCalls++
	return []SemanticResult{eventDoc(18, "Pameran Tetap Museum Cunggrang", "Pameran.")}, nil
}

func fullService(t *testing.T, r *fullRetriever) (*ChatService, *recordingProvider) {
	t.Helper()
	provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
	service := NewChatService(newChatTestDB(t), provider, time.Second, r)
	service.Judge = &fakeJudge{}
	service.Now = func() time.Time { return testToday }
	return service, provider
}

// Audit K1 (2026-10-31): the newest news are not zone-filtered, so the prompt must not say so; a news
// topic question that names a zone must not be zone-filtered either (news has no zone metadata).
func TestNewsQuestionWithZoneSkipsZoneFilter(t *testing.T) {
	r := &fullRetriever{newsFakeRetriever: newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(102, "Penyebab rem motor berdecit")}}}
	service, provider := fullService(t, r)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 160}, "Berita terbaru di Kota Pasuruan apa?"); err != nil {
		t.Fatal(err)
	}
	if system := provider.messages[0].Content; r.regionSearches != 0 || r.latestCalls != 1 || strings.Contains(system, "ZONA_DITANYA") || strings.Contains(system, "ATURAN_ZONA") {
		t.Fatalf("regionSearches=%d latest=%d prompt:\n%s", r.regionSearches, r.latestCalls, system)
	}
	r.results = []SemanticResult{source("news", 2, "Banjir Aceh Utara", "Sumur bor.", 0.7)}
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 161}, "Ada berita banjir di Pasuruan Utara?"); err != nil {
		t.Fatal(err)
	}
	if r.regionSearches != 0 || !r.called {
		t.Fatalf("a news topic question was zone-filtered: regionSearches=%d", r.regionSearches)
	}
	// A travel question with a zone keeps the zone filter.
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 162}, "Wisata apa saja di Pasuruan Barat?"); err != nil {
		t.Fatal(err)
	}
	if r.regionSearches != 1 {
		t.Fatalf("travel zone question lost its zone filter: regionSearches=%d", r.regionSearches)
	}
}

// Audit K2 (2026-10-31): a news question with an event word and a time keeps the news path.
func TestNewsQuestionWithEventWordAndTimeKeepsNewsPath(t *testing.T) {
	r := &fullRetriever{newsFakeRetriever: newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(52, "DPR bahas anggaran")}}}
	service, provider := fullService(t, r)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 163}, "Ada berita politik tentang upacara hari ini?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if r.periodCalls != 0 || r.newsCategory != "politik" || strings.Contains(system, "PERIODE_DITANYA") || !strings.Contains(system, "KATEGORI_BERITA_DITANYA: Politik") {
		t.Fatalf("periodCalls=%d category=%q prompt:\n%s", r.periodCalls, r.newsCategory, system)
	}
	// Event time questions without a news word, including "kabar", keep the schedule path.
	for _, question := range []string{"Ada acara apa akhir pekan ini?", "Ada kabar acara minggu ini?"} {
		if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 164}, question); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(provider.messages[0].Content, "PERIODE_DITANYA") {
			t.Fatalf("%q lost the schedule path:\n%s", question, provider.messages[0].Content)
		}
	}
}

// Audit K3 (2026-10-31): a bold date or period in an honest no-source answer is kept.
func TestGroundAnswerNoSourceKeepsBoldDates(t *testing.T) {
	answer := "Belum ada acara terjadwal pada **tahun 2028** atau **1 Januari 2028** di database kami."
	got, report := groundAnswer(answer, parseIntent("Acara tahun 2028 apa saja?"), ragContext{Period: "tahun 2028"}, nil, "q")
	if got != answer || report["fallback"] != false {
		t.Fatalf("honest answer with a bold date replaced: %q (%v)", got, report)
	}
	// A bold name next to a bold date is still an invented item.
	mixed := "Pada **tahun 2028** ada **Festival Karangan Model**."
	if got, _ := groundAnswer(mixed, parseIntent("Acara tahun 2028 apa saja?"), ragContext{Period: "tahun 2028"}, nil, "q"); got != noSourceFallbackAnswer {
		t.Fatalf("bold name kept: %q", got)
	}
}

// Session 230 (2026-10-31): a topic that no news matches must be reported before the newest news.
func TestNewsTopicWithoutMatchSaysTopicIsMissing(t *testing.T) {
	for question, want := range map[string]bool{
		"Ada berita politik tentang upacara hari ini?": true,
		"Berita terbaru tentang banjir apa?":           true,
		"Berita politik apa saja?":                     false,
		"Berita politik terbaru apa saja?":             false,
		"Berita terbaru apa?":                          false,
	} {
		retriever := &newsFakeRetriever{categories: stagingNewsCategories, latest: []SemanticResult{eventlessNews(52, "DPR bahas anggaran")}}
		service, provider, _ := newsService(t, retriever)
		if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 170}, question); err != nil {
			t.Fatal(err)
		}
		system := provider.messages[0].Content
		if got := strings.Contains(system, "HASIL_TOPIK: tidak ada berita yang cocok dengan topik pertanyaan."); got != want {
			t.Errorf("%q: topic-missing rule = %v, want %v\n%s", question, got, want, system)
		}
		if !strings.Contains(system, "NAMA: DPR bahas anggaran") {
			t.Errorf("%q: newest news not sent", question)
		}
	}
}

// K4 (audit 2026-10-31, fixed 2026-11-03): with read counts present, a popular-news question that names a topic
// keeps the topic search; the most read list (unrelated news) must not answer it. Without a topic it still does.
func TestPopularNewsWithTopicSearchesTheTopic(t *testing.T) {
	retriever := &newsFakeRetriever{
		categories:    stagingNewsCategories,
		popular:       []SemanticResult{eventlessNews(2, "DPR bahas anggaran")},
		fakeRetriever: fakeRetriever{results: []SemanticResult{source("news", 1, "Banjir Aceh Utara", "Sumur bor.", 0.7)}},
	}
	service, provider, _ := newsService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 150}, "Berita populer tentang banjir Aceh?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if !strings.Contains(system, "Banjir Aceh Utara") || strings.Contains(system, "DPR bahas anggaran") || strings.Contains(system, "jumlah pembaca terbanyak") {
		t.Fatalf("topic question answered from the popular list:\n%s", system)
	}
}
