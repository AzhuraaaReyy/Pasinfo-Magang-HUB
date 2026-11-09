package services

// Intent kinds; internal only, never sent to the frontend.
const (
	intentFact           = "fact"
	intentList           = "list"
	intentRecommendation = "recommendation"
	intentFollowUp       = "follow_up"
	intentSmalltalk      = "smalltalk"
)

const (
	// defaultFactLimit is the retrieval size of a single-answer question (unchanged from before).
	defaultFactLimit = 5
	// defaultListCount is used when a list or recommendation request names no number.
	defaultListCount = 5
	// maxListCount bounds the items of one answer. It protects the prompt size of the local
	// model; it is not a relevance target.
	maxListCount = 10
	// listCandidateExtra is retrieved on top of a list limit so the judge can reject some candidates.
	listCandidateExtra = 5
	// maxRequestedCount caps the stored requested number against absurd input.
	maxRequestedCount = 99
)

// ChatIntent is the backend's form of a validated QuestionPlan. It holds only what the user asked and
// never contains database facts.
type ChatIntent struct {
	Kind      string // fact, list, recommendation, follow_up, smalltalk
	Requested int    // number of items asked for; 0 = not a list request
	// DefaultCount is true when Requested is the default list size: the user named no number, so no answer may say
	// how many were asked for.
	DefaultCount bool
	Domain       string // faq_knowledge_bases.category hint ("wisata", "kuliner", ...) or ""
	FollowUp     bool   // the question refers to an earlier turn
	// SampleFields is true when the user asks about prices, facilities, or menus — the fields
	// that are sample data in the seed. Only then are sample-data lines sent to the model.
	SampleFields bool
	// Region is the map zone the question names ("Pasuruan Barat", "Kota Pasuruan"), or "".
	Region string
}

func (i ChatIntent) isList() bool { return i.Requested > 0 }

// Limit is the number of distinct sources one answer may present.
func (i ChatIntent) Limit() int {
	if !i.isList() {
		return defaultFactLimit
	}
	return min(i.Requested, maxListCount)
}

// RetrievalLimit is the number of semantic candidates fetched for this intent.
func (i ChatIntent) RetrievalLimit() int {
	if !i.isList() {
		return defaultFactLimit
	}
	return i.Limit() + listCandidateExtra
}

// RetrievalCategory filters a list request to one clearly named domain; "" searches all domains.
func (i ChatIntent) RetrievalCategory() string {
	if !i.isList() {
		return ""
	}
	return i.Domain
}

func (i ChatIntent) metadata() map[string]any {
	return map[string]any{"kind": i.Kind, "requested": i.Requested, "limit": i.Limit(), "domain": i.Domain, "follow_up": i.FollowUp, "sample_fields": i.SampleFields, "region": i.Region}
}

// domainCategories maps a plan domain to faq_knowledge_bases.category.
var domainCategories = map[string]string{"destination": "wisata", "culinary": "kuliner", "culture": "budaya", "event": "acara", "news": "berita"}

// intentFromPlan builds the intent from a checked plan. Sample-data lines (prices, facilities, menus) are sent to the
// model only when those fields are asked about.
func intentFromPlan(plan QuestionPlan) ChatIntent {
	if plan.Domain == smalltalkDomain {
		return ChatIntent{Kind: intentSmalltalk}
	}
	intent := ChatIntent{Kind: intentFact, Domain: domainCategories[plan.Domain], FollowUp: plan.FollowUp, Region: plan.Zone}
	switch plan.Info {
	case "price", "facility", "menu", "ticket":
		intent.SampleFields = true
	}
	// A number the user wrote (check() keeps a count only then) asks for that many items, also when the reader called the
	// question a fact: "Sebutkan satu destinasi wisata" was read as fact with count 1 and got five documents (regression
	// 2026-11-07, WIS-01). A fact about one named thing keeps its number as part of the question.
	listByCount := plan.Kind == "fact" && plan.Count > 0 && plan.Name == ""
	if plan.Kind == "list" || plan.Kind == "recommendation" || listByCount {
		intent.Requested, intent.DefaultCount = defaultListCount, true
		if plan.Count > 0 {
			intent.Requested, intent.DefaultCount = min(plan.Count, maxRequestedCount), false
		}
		intent.Kind = intentList
		if plan.Kind == "recommendation" {
			intent.Kind = intentRecommendation
		}
		return intent
	}
	if plan.FollowUp {
		intent.Kind = intentFollowUp
	}
	return intent
}
