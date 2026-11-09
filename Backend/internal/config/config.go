package config

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"time"
)

type Provider string

const (
	ProviderOllama Provider = "ollama"
	ProviderGemini Provider = "gemini"
	// ProviderOpenAICompatible is any API with the OpenAI format (/chat/completions, /embeddings, Bearer
	// key): OpenAI, OpenRouter, Groq, DeepSeek, Mistral, and others. Production picks it by env only
	// (Owner 2026-11-01); the base URL, key, and models come from LLM_API_* / EMBED_*.
	ProviderOpenAICompatible Provider = "openai-compatible"
)

// EmbeddingDimensions is the size of faq_knowledge_bases.embedding (vector(768)).
const EmbeddingDimensions = 768

type LLMConfig struct {
	Primary                            Provider
	Fallback                           Provider
	OllamaURL, OllamaChat, OllamaEmbed string
	GeminiKey, GeminiChat, GeminiEmbed string
	Timeout, Retries, Concurrency      int
	// OllamaNumGPU is the number of gemma layers Ollama puts on the GPU (LLM_OLLAMA_NUM_GPU); nil = unset,
	// Ollama decides. A pointer, because 0 means CPU only. A local-machine setting: set it only in the local .env
	// (H1, 2026-10-31; docker-compose.override.yml was removed when one env-driven compose file replaced it).
	OllamaNumGPU *int
	// Embed is the embedding provider (EMBED_PROVIDER); it defaults to Primary. Chat and embedding are
	// separate because many chat providers have no embedding model.
	Embed Provider
	// OpenAI-compatible chat (LLM_API_BASE_URL, LLM_API_KEY, LLM_CHAT_MODEL).
	APIURL, APIKey, APIChat string
	// OpenAI-compatible embedding (EMBED_API_BASE_URL and EMBED_API_KEY default to the LLM_API_* values,
	// EMBED_MODEL, EMBED_DIMENSIONS). EmbedDims is sent as "dimensions" and must be EmbeddingDimensions.
	EmbedURL, EmbedKey, EmbedModel string
	EmbedDims                      int
	// EmbedRPM paces corpus embedding (EMBED_REQUESTS_PER_MINUTE); 0 = no pause, as for local Ollama.
	EmbedRPM int
	// RelevanceThreshold is EMBED_RELEVANCE_THRESHOLD (see RelevanceThreshold); 0 = unset.
	RelevanceThreshold float64
	// RecommendThreshold is RECOMMEND_RELEVANCE_THRESHOLD (see RecommendThreshold); 0 = unset.
	RecommendThreshold float64
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
func integer(key string, fallback int) int {
	n, err := strconv.Atoi(env(key, ""))
	if err != nil {
		return fallback
	}
	return n
}
func Env(key string) string { return env(key, "") }

// optionalNonNegative returns the env value as an integer >= 0, or nil when it is unset or invalid.
func optionalNonNegative(key string) *int {
	n, err := strconv.Atoi(env(key, ""))
	if err != nil || n < 0 {
		return nil
	}
	return &n
}

// RelevanceThreshold is the similarity at or above which a document is relevant without the judge
// (EMBED_RELEVANCE_THRESHOLD). Similarity scores depend on the embedding model, so it is set together with
// the embedding model (Owner 2026-11-01). 0 = unset (the services default, tuned for embeddinggemma);
// NaN = not a number, refused by Validate.
func RelevanceThreshold() float64 {
	v := env("EMBED_RELEVANCE_THRESHOLD", "")
	if v == "" {
		return 0
	}
	t, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return math.NaN()
	}
	return t
}

// RecommendThreshold is the similarity a text recommendation (GET /rekomendasi) needs to be shown
// (RECOMMEND_RELEVANCE_THRESHOLD, jobdesk 9 Nov point 4, Owner option A). Like EMBED_RELEVANCE_THRESHOLD it belongs
// to the embedding model; it is lower because a keyword scores below a question (gemini-embedding-001: "pantai" 0.642).
// 0 = unset (the services default); NaN = not a number, refused by Validate.
func RecommendThreshold() float64 {
	v := env("RECOMMEND_RELEVANCE_THRESHOLD", "")
	if v == "" {
		return 0
	}
	t, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return math.NaN()
	}
	return t
}

// ChatRetentionDays is the anonymous chat history retention (default 90; <= 0 disables purge).
func ChatRetentionDays() int { return integer("CHAT_RETENTION_DAYS", 90) }

// jwtPlaceholderPrefix starts the JWT_SECRET example value in .env.example. The value is public, and it
// passes the 32-character check, so production refuses it (audit 30 Okt P4-2).
const jwtPlaceholderPrefix = "REPLACE_"

// CheckJWTSecret returns an error when production would sign tokens with the public example secret.
func CheckJWTSecret(appEnv, secret string) error {
	if appEnv == "production" && strings.HasPrefix(secret, jwtPlaceholderPrefix) {
		return fmt.Errorf("JWT_SECRET is still the .env.example placeholder; set a random value (openssl rand -hex 32)")
	}
	return nil
}

// ProxyConfig returns the header carrying the client IP and the trusted proxy list.
// It is enabled only when both PROXY_HEADER and TRUSTED_PROXIES are set; without a
// trusted proxy list the header could be spoofed by any client.
func ProxyConfig() (header string, trusted []string, ok bool) {
	header = env("PROXY_HEADER", "")
	for _, p := range strings.Split(env("TRUSTED_PROXIES", ""), ",") {
		if p = strings.TrimSpace(p); p != "" {
			trusted = append(trusted, p)
		}
	}
	return header, trusted, header != "" && len(trusted) > 0
}

func LoadLLM() LLMConfig {
	// Empty LLM_PROVIDER = gemini, the primary provider for chat and embedding (OVERRIDE-RAG-007; T17, Owner 2026-11-08:
	// was ollama). EMBED_PROVIDER defaults to it.
	primary := Provider(strings.ToLower(env("LLM_PROVIDER", string(ProviderGemini))))
	apiURL := strings.TrimRight(env("LLM_API_BASE_URL", ""), "/")
	apiKey := env("LLM_API_KEY", "")
	return LLMConfig{
		Primary:      primary,
		Fallback:     Provider(strings.ToLower(env("LLM_FALLBACK_PROVIDER", ""))),
		OllamaURL:    strings.TrimRight(env("OLLAMA_BASE_URL", "http://localhost:11434"), "/"),
		OllamaChat:   env("OLLAMA_CHAT_MODEL", "gemma3:4b"),
		OllamaEmbed:  env("OLLAMA_EMBED_MODEL", "embeddinggemma"),
		GeminiKey:    env("GEMINI_API_KEY", ""),
		GeminiChat:   env("GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite"), // gemini-2.5-flash: 404 for new users (2026-11-01)
		GeminiEmbed:  env("GEMINI_EMBED_MODEL", "gemini-embedding-001"),
		Timeout:      integer("LLM_HTTP_TIMEOUT_SEC", 120),
		Retries:      integer("LLM_MAX_RETRIES", 1),
		Concurrency:  integer("LLM_MAX_CONCURRENCY", 1),
		OllamaNumGPU: optionalNonNegative("LLM_OLLAMA_NUM_GPU"),
		Embed:        Provider(strings.ToLower(env("EMBED_PROVIDER", string(primary)))),
		APIURL:       apiURL,
		APIKey:       apiKey,
		APIChat:      env("LLM_CHAT_MODEL", ""),
		EmbedURL:     strings.TrimRight(env("EMBED_API_BASE_URL", apiURL), "/"),
		EmbedKey:     env("EMBED_API_KEY", apiKey),
		EmbedModel:   env("EMBED_MODEL", ""),
		EmbedDims:    integer("EMBED_DIMENSIONS", EmbeddingDimensions),
		EmbedRPM:     integer("EMBED_REQUESTS_PER_MINUTE", 0),

		RelevanceThreshold: RelevanceThreshold(),
		RecommendThreshold: RecommendThreshold(),
	}
}

// EmbedInterval is the pause between two corpus embeddings, or 0 for none.
func (c LLMConfig) EmbedInterval() time.Duration {
	if c.EmbedRPM <= 0 {
		return 0
	}
	return time.Minute / time.Duration(c.EmbedRPM)
}

func knownProvider(p Provider) bool {
	return p == ProviderOllama || p == ProviderGemini || p == ProviderOpenAICompatible
}

// Validate refuses a configuration that would fail at the first question, with a message naming the
// missing env variable. Chat providers are Primary and Fallback; the embedding provider is Embed.
func (c LLMConfig) Validate() error {
	if !knownProvider(c.Primary) {
		return fmt.Errorf("unsupported LLM_PROVIDER %q (ollama, gemini, openai-compatible)", c.Primary)
	}
	if c.Fallback != "" && !knownProvider(c.Fallback) {
		return fmt.Errorf("unsupported LLM_FALLBACK_PROVIDER %q", c.Fallback)
	}
	if !knownProvider(c.Embed) {
		return fmt.Errorf("unsupported EMBED_PROVIDER %q (ollama, gemini, openai-compatible)", c.Embed)
	}
	for _, chat := range []Provider{c.Primary, c.Fallback} {
		if chat == ProviderGemini && c.GeminiKey == "" {
			return fmt.Errorf("GEMINI_API_KEY is required")
		}
		if chat == ProviderOpenAICompatible && (c.APIURL == "" || c.APIKey == "" || c.APIChat == "") {
			return fmt.Errorf("LLM_API_BASE_URL, LLM_API_KEY and LLM_CHAT_MODEL are required for openai-compatible chat")
		}
	}
	if c.Embed == ProviderGemini && c.GeminiKey == "" {
		return fmt.Errorf("GEMINI_API_KEY is required for gemini embeddings")
	}
	if c.Embed == ProviderOpenAICompatible {
		if c.EmbedURL == "" || c.EmbedKey == "" || c.EmbedModel == "" {
			return fmt.Errorf("EMBED_API_BASE_URL (or LLM_API_BASE_URL), EMBED_API_KEY (or LLM_API_KEY) and EMBED_MODEL are required for openai-compatible embeddings")
		}
		if c.EmbedDims != EmbeddingDimensions {
			return fmt.Errorf("EMBED_DIMENSIONS must be %d (faq_knowledge_bases.embedding is vector(%d))", EmbeddingDimensions, EmbeddingDimensions)
		}
	}
	// Above the judge floor (services.judgeCandidateFloor, 0.35) so the judge band stays non-empty.
	if t := c.RelevanceThreshold; t != 0 && !(t > 0.35 && t < 1) {
		return fmt.Errorf("EMBED_RELEVANCE_THRESHOLD must be a number above 0.35 and below 1")
	}
	if t := c.RecommendThreshold; t != 0 && !(t > 0 && t < 1) {
		return fmt.Errorf("RECOMMEND_RELEVANCE_THRESHOLD must be a number above 0 and below 1")
	}
	return nil
}
