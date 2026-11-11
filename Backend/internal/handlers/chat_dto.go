package handlers

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
	"wildan-news-backend/internal/utils"
)

// chatSessionDTO is the ChatSession contract; visitor_id is never exposed (GAP-04, SEC-01).
type chatSessionDTO struct {
	ID            int64      `json:"id"`
	Status        string     `json:"status"`
	Title         *string    `json:"title"`
	LastMessageAt *time.Time `json:"last_message_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

// sourceReferenceDTO is a relevant answer source plus recommendation-card fields (K1-04).
type sourceReferenceDTO struct {
	SourceType    string  `json:"source_type"`
	SourceID      int64   `json:"source_id"`
	SourceLabel   string  `json:"source_label"`
	Similarity    float64 `json:"similarity"`
	Slug          *string `json:"slug"`
	CategoryLabel *string `json:"category_label"`
	ThumbnailURL  *string `json:"thumbnail_url"`
	Summary       *string `json:"summary"`
}

// messageMetadataDTO is the minimal metadata sent to the frontend (K2-02); diagnostics stay in the DB.
type messageMetadataDTO struct {
	RetrievalStatus *string              `json:"retrieval_status"`
	ContextK        int                  `json:"context_k"`
	Sources         []sourceReferenceDTO `json:"sources"`
	ErrorKind       *string              `json:"error_kind"`
}

type chatMessageDTO struct {
	ID        int64               `json:"id"`
	SessionID int64               `json:"session_id"`
	Role      string              `json:"role"`
	Status    string              `json:"status"`
	Content   *string             `json:"content"`
	Metadata  *messageMetadataDTO `json:"metadata"`
	CreatedAt time.Time           `json:"created_at"`
}

// storedMetadata is the part of chat_messages.metadata that the contract exposes.
type storedMetadata struct {
	RetrievalStatus *string `json:"retrieval_status"`
	ContextK        int     `json:"context_k"`
	Sources         []struct {
		SourceType  *string `json:"source_type"`
		SourceID    *int64  `json:"source_id"`
		SourceLabel *string `json:"source_label"`
		Similarity  float64 `json:"similarity"`
	} `json:"sources"`
	ErrorKind *string `json:"error_kind"`
}

func toSessionDTO(s models.ChatSession) chatSessionDTO {
	var lastMessageAt *time.Time
	if s.LastMessageAt != nil {
		utc := s.LastMessageAt.UTC()
		lastMessageAt = &utc
	}
	return chatSessionDTO{ID: s.ID, Status: s.Status, Title: s.Title, LastMessageAt: lastMessageAt, CreatedAt: s.CreatedAt.UTC()}
}

// parseStoredMetadata returns the exposed metadata of an assistant message.
func parseStoredMetadata(m models.ChatMessage) (*storedMetadata, bool) {
	if m.Role != "assistant" || len(m.Metadata) == 0 {
		return nil, false
	}
	var stored storedMetadata
	if err := json.Unmarshal(m.Metadata, &stored); err != nil {
		return nil, false
	}
	return &stored, true
}

func toMessageDTO(m models.ChatMessage, cards map[services.SourceKey]services.SourceCard) chatMessageDTO {
	dto := chatMessageDTO{ID: m.ID, SessionID: m.SessionID, Role: m.Role, Status: m.Status, Content: m.Content, CreatedAt: m.CreatedAt.UTC()}
	stored, ok := parseStoredMetadata(m)
	if !ok {
		return dto
	}
	metadata := messageMetadataDTO{RetrievalStatus: stored.RetrievalStatus, ContextK: stored.ContextK, Sources: []sourceReferenceDTO{}, ErrorKind: stored.ErrorKind}
	for _, source := range stored.Sources {
		if source.SourceType == nil || source.SourceID == nil {
			continue
		}
		reference := sourceReferenceDTO{SourceType: *source.SourceType, SourceID: *source.SourceID, Similarity: source.Similarity}
		if source.SourceLabel != nil {
			reference.SourceLabel = *source.SourceLabel
		}
		card, found := cards[services.SourceKey{Type: *source.SourceType, ID: *source.SourceID}]
		if !found && cards != nil && services.HasPublicationRule(*source.SourceType) {
			// The cards loaded, and this news article, place, or event has none: it is no longer published (or was removed), so a saved answer
			// does not keep pointing to it (jobdesk 11 Nov point 5, P5-2, Owner). The answer text itself stays as saved.
			// When the cards could not load (cards == nil), the sources stay as before.
			continue
		}
		if found {
			reference.Slug, reference.CategoryLabel, reference.ThumbnailURL, reference.Summary = card.Slug, card.CategoryLabel, card.ThumbnailURL, card.Summary
		}
		metadata.Sources = append(metadata.Sources, reference)
	}
	dto.Metadata = &metadata
	return dto
}

func toMessageDTOs(msgs []models.ChatMessage, cards map[services.SourceKey]services.SourceCard) []chatMessageDTO {
	out := make([]chatMessageDTO, 0, len(msgs))
	for _, m := range msgs {
		out = append(out, toMessageDTO(m, cards))
	}
	return out
}

// sourceCards loads card fields for every source referenced by msgs. Card fields are
// optional: on failure the answer is still returned with null card fields.
func (h *ChatHandler) sourceCards(ctx context.Context, msgs []models.ChatMessage) map[services.SourceKey]services.SourceCard {
	seen := make(map[services.SourceKey]struct{})
	var keys []services.SourceKey
	for _, m := range msgs {
		stored, ok := parseStoredMetadata(m)
		if !ok {
			continue
		}
		for _, source := range stored.Sources {
			if source.SourceType == nil || source.SourceID == nil {
				continue
			}
			key := services.SourceKey{Type: *source.SourceType, ID: *source.SourceID}
			if _, dup := seen[key]; dup {
				continue
			}
			seen[key] = struct{}{}
			keys = append(keys, key)
		}
	}
	if len(keys) == 0 {
		return nil
	}
	cards, err := services.LoadSourceCards(ctx, h.DB, keys)
	if err != nil {
		log.Printf("[WARN] chat source cards unavailable: %s", utils.SafeLogValue(err.Error()))
		return nil
	}
	return cards
}
