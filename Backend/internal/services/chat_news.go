package services

import (
	"context"
	"strings"
)

// newsListSummaryRunes bounds the body excerpt of each item in a latest/popular news list.
const newsListSummaryRunes = 240

// newsFactPrefixes are the field lines newsKnowledgeText appends after the article body.
var newsFactPrefixes = []string{"Kategori berita: ", "Sumber: ", "Tanggal terbit: "}

// newsListExcerpts shortens the items of a latest/popular news list to the first sentence of the body plus the
// category, source, and date lines. With five full articles in the context gemma3:4b repeated one item four
// times and merged two titles into one (jobdesk 30 Okt T1, Owner option C, 2026-11-02). Topic questions keep
// the full article. The sentence is labelled "Ringkasan": unlabelled, gemma3:4b listed it as the item name instead
// of the title (BRT-02/05/07, 2026-11-02).
func newsListExcerpts(results []SemanticResult) []SemanticResult {
	out := make([]SemanticResult, len(results))
	for i, result := range results {
		parts := []string{"Ringkasan: " + firstSentence(result.Answer, newsListSummaryRunes)}
		for _, line := range strings.Split(result.Answer, "\n") {
			for _, prefix := range newsFactPrefixes {
				if strings.HasPrefix(line, prefix) {
					parts = append(parts, line)
				}
			}
		}
		result.Answer = strings.Join(parts, "\n")
		out[i] = result
	}
	return out
}

// NewsCategory is one row of the categories table with its number of published news items.
type NewsCategory struct {
	Slug      string
	Name      string
	NewsCount int
}

// NewsRetriever searches news by category and lists the most recently added news. A retriever that
// implements it lets "berita politik" use the news category and "berita terbaru" the date order:
// text similarity knows neither (Owner instruction 2026-10-31: news of every category is answered).
type NewsRetriever interface {
	NewsCategories(ctx context.Context) ([]NewsCategory, error)
	SemanticSearchNews(ctx context.Context, p LLMProvider, q, newsCategory string, limit int) ([]SemanticResult, error)
	LatestNews(ctx context.Context, newsCategory string, limit int) ([]SemanticResult, error)
	// PopularNews lists news with readers (news.views > 0), most read first; empty while no views exist.
	PopularNews(ctx context.Context, newsCategory string, limit int) ([]SemanticResult, error)
}

// newsRequest is the backend's form of a news question. Popularity is claimed only from news.views, and "newest"
// means the most recently added: staging has no published_at (Owner decisions 2026-10-31, options 1A).
type newsRequest struct {
	Category NewsCategory // the category the question names; Slug "" = none
	Latest   bool         // the question asks for the newest news
	Clarify  bool         // a recommendation without category or topic: ask for the category first
	Popular  bool         // the question asks for popular news
	Topic    bool         // the question names a topic ("tentang upacara"), not only a category or list
	// PopularUnavailable is set by newsOutcome when popular news were asked for but no item has views.
	PopularUnavailable bool
	Available          []NewsCategory // categories that have news, for an empty category
}

// newsRequestFromPlan returns the news request of a plan with domain news, or nil for other questions and when the
// retriever cannot search news by category. A recommendation without category or topic asks for the category first
// (Owner instruction 2026-10-31).
func newsRequestFromPlan(plan QuestionPlan, categories []NewsCategory) *newsRequest {
	if plan.Domain != "news" || categories == nil {
		return nil
	}
	request := &newsRequest{Latest: plan.Sort == "latest", Popular: plan.Sort == "popular", Topic: plan.Topic != ""}
	for _, category := range categories {
		if category.NewsCount > 0 {
			request.Available = append(request.Available, category)
		}
		if request.Category.Slug == "" && category.Slug != "" && category.Name == plan.NewsCategory {
			request.Category = category
		}
	}
	request.Clarify = request.Category.Slug == "" && !request.Latest && !request.Topic && plan.Kind == "recommendation"
	return request
}

// newsCategoryRowNames lists categories.name as stored, for the reader's allowed values.
func newsCategoryRowNames(categories []NewsCategory) []string {
	names := make([]string, 0, len(categories))
	for _, category := range categories {
		names = append(names, category.Name)
	}
	return names
}

// newsOutcome selects the documents of a news question that names a category or asks for the newest
// news. A topic question within a category keeps the judge; when it finds nothing, or the question asks
// for the newest news, the most recently added news (of the category) is listed. It returns ok=false,
// and the caller keeps the semantic classification, for a news question with neither.
func (s *ChatService) newsOutcome(ctx context.Context, request *newsRequest, query string, results []SemanticResult, limit int) (relevanceOutcome, bool, error) {
	if request == nil || (request.Category.Slug == "" && !request.Latest && !request.Clarify && !request.Popular) {
		return relevanceOutcome{}, false, nil
	}
	retriever := s.Retriever.(NewsRetriever)
	var popular []SemanticResult
	if request.Popular {
		var err error
		if popular, err = retriever.PopularNews(ctx, request.Category.Slug, limit); err != nil {
			return relevanceOutcome{}, false, err
		}
		request.PopularUnavailable = len(popular) == 0
	}
	if request.Clarify {
		return relevanceOutcome{Status: "no_source", Judge: map[string]any{"skipped": "news_clarify", "pool_k": 0, "picked_k": 0}}, true, nil
	}
	if request.Category.Slug != "" && request.Category.NewsCount == 0 {
		return relevanceOutcome{Status: "no_source", Judge: map[string]any{"skipped": "news_category_empty", "pool_k": 0, "picked_k": 0}}, true, nil
	}
	// A topic question ("berita populer tentang banjir Aceh") keeps the topic search below: the most read list
	// would answer it with unrelated news once news.views > 0 (audit K4, fixed 2026-11-03).
	if len(popular) > 0 && !request.Topic {
		return relevanceOutcome{Status: "relevant", Context: popular, Judge: map[string]any{"skipped": "news_popular", "pool_k": 0, "picked_k": 0}}, true, nil
	}
	if request.Category.Slug == "" && !request.Latest && request.Topic {
		// "berita populer tentang banjir" without views: the topic search answers it, with the note.
		return relevanceOutcome{}, false, nil
	}
	// A topic is searched first, also in "berita terbaru tentang banjir". Popular news without a topic and without
	// views has nothing to search for: the search gave unrelated news (coverage test 2026-11-07, N03), so the newest are listed.
	if request.Topic || (!request.Latest && !request.Popular) {
		if outcome := s.classify(ctx, query, results, limit, false); outcome.Status == "relevant" {
			return outcome, true, nil
		}
	}
	latest, err := retriever.LatestNews(ctx, request.Category.Slug, limit)
	if err != nil {
		return relevanceOutcome{}, false, err
	}
	status := "no_source"
	if len(latest) > 0 {
		status = "relevant"
	}
	judge := map[string]any{"skipped": "news_latest", "pool_k": 0, "picked_k": 0}
	if request.Topic {
		// The newest news stand in for a topic that was not found; the prompt must say so (session 230:
		// "berita politik tentang upacara" got a DPR item presented as the answer).
		judge["topic_not_found"] = true
	}
	return relevanceOutcome{Status: status, Context: latest, Judge: judge}, true, nil
}

// newsClarifyAnswer asks which news category the user wants, naming only categories that have news.
func newsClarifyAnswer(available string, popularUnavailable bool) string {
	var b strings.Builder
	b.WriteString("Tentu! Supaya rekomendasinya pas, Anda ingin berita dari kategori apa?")
	if available != "" {
		b.WriteString(" Saat ini tersedia berita kategori " + available + ".")
	}
	if popularUnavailable {
		b.WriteString(" Data jumlah pembaca belum tersedia, jadi saya belum bisa menentukan berita yang paling populer, tetapi saya bisa menampilkan berita terbaru.")
	}
	b.WriteString(" Anda juga bisa menyebutkan topik berita yang dicari.")
	return b.String()
}

// newsEmptyAnswer says a category has no news and offers the categories that do. A fixed text: with an
// empty context the no-result rules made the model offer travel domains instead (regression #5 BRT-04).
func newsEmptyAnswer(category, available string) string {
	text := "Mohon maaf, saat ini belum ada berita kategori " + category + " di database Pasuruan Info."
	if available != "" {
		text += " Berita yang tersedia ada di kategori " + available + ". Apakah Anda ingin saya tampilkan salah satunya?"
	}
	return text
}

// newsCategoryNames lists category names for the prompt ("Nasional, Politik, Lokal").
func newsCategoryNames(categories []NewsCategory) string {
	names := make([]string, 0, len(categories))
	for _, category := range categories {
		names = append(names, newsCategoryLabel(category.Name))
	}
	return strings.Join(names, ", ")
}
