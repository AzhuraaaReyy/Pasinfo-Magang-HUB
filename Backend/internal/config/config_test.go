package config

import (
	"strconv"
	"strings"
	"testing"
)

func TestProxyConfigRequiresHeaderAndTrustedProxies(t *testing.T) {
	cases := []struct {
		name, header, trusted string
		wantOK                bool
		wantTrusted           int
	}{
		{"disabled by default", "", "", false, 0},
		{"header without trusted proxies", "X-Forwarded-For", "", false, 0},
		{"trusted proxies without header", "", "10.0.0.1", false, 1},
		{"enabled", "X-Forwarded-For", " 10.0.0.1, 172.18.0.0/16 ,", true, 2},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("PROXY_HEADER", tc.header)
			t.Setenv("TRUSTED_PROXIES", tc.trusted)
			header, trusted, ok := ProxyConfig()
			if ok != tc.wantOK || len(trusted) != tc.wantTrusted || header != tc.header {
				t.Fatalf("ProxyConfig() = %q, %v, %v", header, trusted, ok)
			}
		})
	}
}

func TestOllamaNumGPUIsOptional(t *testing.T) {
	for value, want := range map[string]string{"": "nil", "30": "30", "0": "0", "-1": "nil", "abc": "nil"} {
		t.Setenv("LLM_OLLAMA_NUM_GPU", value)
		got := "nil"
		if n := LoadLLM().OllamaNumGPU; n != nil {
			got = strconv.Itoa(*n)
		}
		if got != want {
			t.Errorf("LLM_OLLAMA_NUM_GPU=%q → %s, want %s", value, got, want)
		}
	}
}

func TestProviderValidation(t *testing.T) {
	compatible := LLMConfig{Primary: ProviderOpenAICompatible, Embed: ProviderOpenAICompatible, APIURL: "https://api.example/v1", APIKey: "k", APIChat: "chat", EmbedURL: "https://api.example/v1", EmbedKey: "k", EmbedModel: "embed", EmbedDims: 768}
	if err := compatible.Validate(); err != nil {
		t.Fatalf("valid openai-compatible config rejected: %v", err)
	}
	for name, broken := range map[string]func(*LLMConfig){
		"missing chat key":       func(c *LLMConfig) { c.APIKey = "" },
		"missing chat model":     func(c *LLMConfig) { c.APIChat = "" },
		"missing embed model":    func(c *LLMConfig) { c.EmbedModel = "" },
		"wrong dimensions":       func(c *LLMConfig) { c.EmbedDims = 1536 },
		"unknown chat":           func(c *LLMConfig) { c.Primary = "claude-native" },
		"unknown embed":          func(c *LLMConfig) { c.Embed = "x" },
		"unknown fallback":       func(c *LLMConfig) { c.Fallback = "x" },
		"gemini embed no key":    func(c *LLMConfig) { c.Embed = ProviderGemini },
		"gemini fallback no key": func(c *LLMConfig) { c.Fallback = ProviderGemini },
	} {
		c := compatible
		broken(&c)
		if c.Validate() == nil {
			t.Errorf("%s: must be rejected", name)
		}
	}
	// Combination 3: chat from an OpenAI-compatible API, embeddings from Gemini (no EMBED_* needed).
	mixed := LLMConfig{Primary: ProviderOpenAICompatible, Embed: ProviderGemini, APIURL: "https://api.example/v1", APIKey: "k", APIChat: "chat", GeminiKey: "g"}
	if err := mixed.Validate(); err != nil {
		t.Fatalf("openai-compatible chat + gemini embeddings rejected: %v", err)
	}
	if (LLMConfig{Primary: ProviderOllama, Embed: ProviderOllama}).Validate() != nil {
		t.Fatal("Ollama must not need any API settings")
	}
}

func TestEmbedInterval(t *testing.T) {
	for rpm, want := range map[int]string{0: "0s", 60: "1s", 50: "1.2s", -5: "0s"} {
		if got := (LLMConfig{EmbedRPM: rpm}).EmbedInterval().String(); got != want {
			t.Errorf("EMBED_REQUESTS_PER_MINUTE=%d → %s, want %s", rpm, got, want)
		}
	}
}

func TestRelevanceThreshold(t *testing.T) {
	t.Setenv("LLM_PROVIDER", "ollama") // the threshold rule only; the Gemini default would ask for GEMINI_API_KEY
	t.Setenv("EMBED_PROVIDER", "")
	for value, wantErr := range map[string]bool{"": false, "0.66": false, "0.6": false, "0.35": true, "0.2": true, "1": true, "abc": true} {
		t.Setenv("EMBED_RELEVANCE_THRESHOLD", value)
		err := LoadLLM().Validate()
		if (err != nil) != wantErr {
			t.Errorf("EMBED_RELEVANCE_THRESHOLD=%q → error %v, want error %v", value, err, wantErr)
		}
	}
}

// Jobdesk 2026-10-23: a missing API key gives an error that names the env variable to set.
func TestMissingAPIKeyErrorNamesTheVariable(t *testing.T) {
	cases := map[string]struct {
		config LLMConfig
		want   string
	}{
		"gemini chat":             {LLMConfig{Primary: ProviderGemini, Embed: ProviderOllama}, "GEMINI_API_KEY"},
		"gemini embeddings":       {LLMConfig{Primary: ProviderOllama, Embed: ProviderGemini}, "GEMINI_API_KEY"},
		"openai-compatible chat":  {LLMConfig{Primary: ProviderOpenAICompatible, Embed: ProviderOllama, APIURL: "https://api.example.com/v1", APIChat: "m"}, "LLM_API_KEY"},
		"openai-compatible embed": {LLMConfig{Primary: ProviderOllama, Embed: ProviderOpenAICompatible, EmbedURL: "https://api.example.com/v1", EmbedModel: "e", EmbedDims: EmbeddingDimensions}, "EMBED_API_KEY"},
	}
	for name, c := range cases {
		err := c.config.Validate()
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: error %v must name %s", name, err, c.want)
		}
	}
}

// Audit 30 Okt P4-2: the public .env.example JWT_SECRET passes the length check, so production refuses it.
func TestCheckJWTSecretRefusesExamplePlaceholderInProduction(t *testing.T) {
	placeholder := "REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARS"
	if err := CheckJWTSecret("production", placeholder); err == nil || !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("production must refuse the placeholder, got %v", err)
	}
	if err := CheckJWTSecret("development", placeholder); err != nil {
		t.Fatalf("development keeps working with the example: %v", err)
	}
	if err := CheckJWTSecret("production", "3f9c1a7e5b2d4c6a8e0f1b3d5c7a9e2f4b6d8c0a1e3f5b7d9c2a4e6f8b0d1c3e"); err != nil {
		t.Fatalf("a random secret must pass: %v", err)
	}
}

// Jobdesk 9 Nov point 4: RECOMMEND_RELEVANCE_THRESHOLD is a similarity above 0 and below 1; empty means the default.
func TestRecommendThreshold(t *testing.T) {
	t.Setenv("LLM_PROVIDER", "ollama")
	t.Setenv("EMBED_PROVIDER", "")
	for value, wantErr := range map[string]bool{"": false, "0.61": false, "0.5": false, "0": false, "1": true, "1.5": true, "-0.2": true, "abc": true} {
		t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", value)
		if err := LoadLLM().Validate(); (err != nil) != wantErr {
			t.Errorf("RECOMMEND_RELEVANCE_THRESHOLD=%q → error %v, want error %v", value, err, wantErr)
		}
	}
}

// Threshold discussion 2026-11-11 (Owner option A): RECOMMEND_RELATIVE_CUTOFF is above 0 and at most 1 (1 = no cut);
// empty means the default.
func TestRecommendRelativeCutoff(t *testing.T) {
	t.Setenv("LLM_PROVIDER", "ollama")
	t.Setenv("EMBED_PROVIDER", "")
	for value, wantErr := range map[string]bool{"": false, "0.04": false, "1": false, "0": false, "1.5": true, "-0.1": true, "abc": true} {
		t.Setenv("RECOMMEND_RELATIVE_CUTOFF", value)
		if err := LoadLLM().Validate(); (err != nil) != wantErr {
			t.Errorf("RECOMMEND_RELATIVE_CUTOFF=%q → error %v, want error %v", value, err, wantErr)
		}
	}
}
