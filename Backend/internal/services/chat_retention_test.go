package services

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

func newRetentionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.ChatSession{}, &models.ChatMessage{}); err != nil {
		t.Fatal(err)
	}
	return db
}

func createSession(t *testing.T, db *gorm.DB, id int64, created time.Time, last *time.Time, messageTimes ...time.Time) {
	t.Helper()
	if err := db.Create(&models.ChatSession{ID: id, VisitorID: "visitor", CreatedAt: created, UpdatedAt: created, LastMessageAt: last}).Error; err != nil {
		t.Fatal(err)
	}
	for _, at := range messageTimes {
		if err := db.Create(&models.ChatMessage{SessionID: id, Role: "user", Status: "complete", CreatedAt: at}).Error; err != nil {
			t.Fatal(err)
		}
	}
}

func remainingSessionIDs(t *testing.T, db *gorm.DB) []int64 {
	t.Helper()
	var ids []int64
	if err := db.Model(&models.ChatSession{}).Order("id").Pluck("id", &ids).Error; err != nil {
		t.Fatal(err)
	}
	return ids
}

func TestPurgeExpiredChatSessionsDeletesExpiredSessionsAndMessages(t *testing.T) {
	db := newRetentionTestDB(t)
	now := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	old := now.AddDate(0, 0, -91)
	recent := now.AddDate(0, 0, -10)
	createSession(t, db, 1, old, &old, old, old)
	createSession(t, db, 2, old, &recent, old, recent)

	sessions, messages, err := PurgeExpiredChatSessions(context.Background(), db, now, 90*24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if sessions != 1 || messages != 2 {
		t.Fatalf("purged sessions=%d messages=%d, want 1 and 2", sessions, messages)
	}
	if ids := remainingSessionIDs(t, db); len(ids) != 1 || ids[0] != 2 {
		t.Fatalf("remaining sessions=%v, want [2]", ids)
	}
	var orphans int64
	db.Model(&models.ChatMessage{}).Where("session_id = ?", 1).Count(&orphans)
	if orphans != 0 {
		t.Fatalf("messages of purged session remain: %d", orphans)
	}
}

func TestPurgeExpiredChatSessionsFallsBackWhenLastMessageAtIsNull(t *testing.T) {
	db := newRetentionTestDB(t)
	now := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	old := now.AddDate(0, 0, -120)
	recent := now.AddDate(0, 0, -5)
	createSession(t, db, 1, old, nil, old)    // old session, old message → expired
	createSession(t, db, 2, old, nil, recent) // old session, recent message → kept
	createSession(t, db, 3, old, nil)         // old session, no message → expired
	createSession(t, db, 4, recent, nil)      // recent session, no message → kept

	sessions, messages, err := PurgeExpiredChatSessions(context.Background(), db, now, 90*24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if sessions != 2 || messages != 1 {
		t.Fatalf("purged sessions=%d messages=%d, want 2 and 1", sessions, messages)
	}
	if ids := remainingSessionIDs(t, db); len(ids) != 2 || ids[0] != 2 || ids[1] != 4 {
		t.Fatalf("remaining sessions=%v, want [2 4]", ids)
	}
}

func TestPurgeExpiredChatSessionsNoopWhenNothingExpired(t *testing.T) {
	db := newRetentionTestDB(t)
	now := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	recent := now.AddDate(0, 0, -1)
	createSession(t, db, 1, recent, &recent, recent)

	sessions, messages, err := PurgeExpiredChatSessions(context.Background(), db, now, 90*24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if sessions != 0 || messages != 0 {
		t.Fatalf("purged sessions=%d messages=%d, want 0 and 0", sessions, messages)
	}
}

func TestChatServiceAskUpdatesSessionLastMessageAt(t *testing.T) {
	db := newRetentionTestDB(t)
	createSession(t, db, 1, time.Now().UTC().AddDate(0, 0, -1), nil)
	service := testChatService(db, &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}, time.Second)
	session := &models.ChatSession{ID: 1, VisitorID: "visitor"}

	if _, err := service.Ask(context.Background(), session, "Apa itu Pasuruan?"); err != nil {
		t.Fatal(err)
	}
	var stored models.ChatSession
	if err := db.First(&stored, 1).Error; err != nil {
		t.Fatal(err)
	}
	if stored.LastMessageAt == nil || session.LastMessageAt == nil {
		t.Fatalf("last_message_at not set: stored=%v session=%v", stored.LastMessageAt, session.LastMessageAt)
	}
}
