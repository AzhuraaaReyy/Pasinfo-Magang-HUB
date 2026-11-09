package services

import (
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Answer cache (T03 stage 2, audit 2026-11-08, Owner option 1): the same standalone question asked again on the same
// day, before the corpus changes, gets the stored answer without the reader, the search, and the answer model, so the
// Gemini quota is not spent twice on it. Only the first question of a session without a shared location is looked up
// or stored: a later question can depend on the history, and the user's location is never kept (Owner 2026-11-07).
const (
	answerCacheTTL = 6 * time.Hour
	answerCacheMax = 500
)

// corpusGeneration changes whenever a refresh embeds or deactivates a document; a cached answer of an older
// generation is not used.
var corpusGeneration atomic.Int64

func markCorpusChanged() { corpusGeneration.Add(1) }

type cachedAnswer struct {
	answer     string
	metadata   []byte
	day        string
	generation int64
	expires    time.Time
}

// answerCache keeps answers in memory; a restart only costs model calls.
type answerCache struct {
	mu    sync.Mutex
	items map[string]cachedAnswer
	now   func() time.Time
}

func newAnswerCache() *answerCache {
	return &answerCache{items: map[string]cachedAnswer{}, now: time.Now}
}

// answerCacheKey is the question in lower case with single spaces and without closing punctuation.
func answerCacheKey(question string) string {
	return strings.TrimRight(strings.Join(strings.Fields(strings.ToLower(question)), " "), " ?!.")
}

func wibDay(t time.Time) string { return t.In(wib).Format(time.DateOnly) }

func (c *answerCache) get(question string, today time.Time) (cachedAnswer, bool) {
	key := answerCacheKey(question)
	c.mu.Lock()
	defer c.mu.Unlock()
	item, ok := c.items[key]
	if !ok {
		return cachedAnswer{}, false
	}
	if !c.now().Before(item.expires) || item.day != wibDay(today) || item.generation != corpusGeneration.Load() {
		delete(c.items, key)
		return cachedAnswer{}, false
	}
	return item, true
}

func (c *answerCache) put(question string, today time.Time, answer string, metadata []byte) {
	now := c.now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.items) >= answerCacheMax {
		day, generation := wibDay(today), corpusGeneration.Load()
		for k, item := range c.items {
			if !now.Before(item.expires) || item.day != day || item.generation != generation {
				delete(c.items, k)
			}
		}
	}
	if len(c.items) >= answerCacheMax {
		c.items = map[string]cachedAnswer{}
	}
	c.items[answerCacheKey(question)] = cachedAnswer{answer: answer, metadata: metadata, day: wibDay(today),
		generation: corpusGeneration.Load(), expires: now.Add(answerCacheTTL)}
}

// cacheableAnswer tells whether a first question's answer may be reused: a grounded answer from the database to a
// standalone question without a relative period, a user location, or the most read news (news.views changes anytime).
func cacheableAnswer(plan QuestionPlan, readerError string, outcome relevanceOutcome, grounding map[string]any, fixed bool) bool {
	return readerError == "" && !fixed && outcome.Status == "relevant" && grounding != nil && grounding["fallback"] == false &&
		!plan.FollowUp && !plan.NearUser && plan.Period == "" && outcome.Judge["skipped"] != "news_popular"
}
