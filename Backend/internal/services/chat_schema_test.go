package services

import (
	"testing"

	"wildan-news-backend/internal/models"
)

// The AI tables get their ERD constraints from the GORM tags (jobdesk 2026-10-22, Owner 2026-11-01):
// AutoMigrate must create them, and they must refuse invalid rows.
func TestChatTablesEnforceERDConstraints(t *testing.T) {
	db := newChatTestDB(t)
	for _, name := range []string{"chk_chat_sessions_status", "chk_chat_messages_role", "chk_chat_messages_status"} {
		table := any(&models.ChatMessage{})
		if name == "chk_chat_sessions_status" {
			table = &models.ChatSession{}
		}
		if !db.Migrator().HasConstraint(table, name) {
			t.Errorf("constraint %s not created", name)
		}
	}
	for _, name := range []string{"idx_chat_messages_session_created"} {
		if !db.Migrator().HasIndex(&models.ChatMessage{}, name) {
			t.Errorf("index %s not created", name)
		}
	}
	if !db.Migrator().HasIndex(&models.ChatSession{}, "idx_chat_sessions_visitor_last") {
		t.Error("index idx_chat_sessions_visitor_last not created")
	}
	if !db.Migrator().HasConstraint(&models.ChatSession{}, "Messages") {
		t.Error("FK chat_messages.session_id → chat_sessions.id not created")
	}
	if err := db.Create(&models.ChatSession{VisitorID: "v1", Status: "unknown"}).Error; err == nil {
		t.Error("session status outside the ERD list was accepted")
	}
	if err := db.Create(&models.ChatMessage{SessionID: 1, Role: "bot", Status: "complete"}).Error; err == nil {
		t.Error("message role outside the ERD list was accepted")
	}
	if err := db.Create(&models.ChatMessage{SessionID: 1, Role: "user", Status: "complete"}).Error; err != nil {
		t.Fatalf("valid message refused: %v", err)
	}
}

// E2/E3 (jobdesk 2 Nov, 2026-11-03): the ERD index on the corpus source exists, and the single-column chat
// indexes covered by the composite ones are no longer created.
func TestAITableIndexesFollowERDWithoutDuplicates(t *testing.T) {
	db := newChatTestDB(t)
	if db.Migrator().HasIndex(&models.ChatSession{}, "idx_chat_sessions_visitor_id") {
		t.Error("redundant index idx_chat_sessions_visitor_id created")
	}
	if db.Migrator().HasIndex(&models.ChatMessage{}, "idx_chat_messages_session_id") {
		t.Error("redundant index idx_chat_messages_session_id created")
	}
	if err := db.AutoMigrate(&models.FAQKnowledgeBase{}); err != nil {
		t.Fatal(err)
	}
	if !db.Migrator().HasIndex(&models.FAQKnowledgeBase{}, "idx_faq_knowledge_source") {
		t.Error("ERD index idx_faq_knowledge_source not created")
	}
	// F2 (2026-11-03): the index is unique, so a second row for the same source is refused.
	source, id := "news", int64(7)
	row := func() *models.FAQKnowledgeBase {
		return &models.FAQKnowledgeBase{Question: "q", Answer: "a", Category: "berita", SourceType: &source, SourceID: &id, IsActive: true}
	}
	if err := db.Omit("Embedding").Create(row()).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Omit("Embedding").Create(row()).Error; err == nil {
		t.Error("second corpus row for the same source accepted")
	}
}
