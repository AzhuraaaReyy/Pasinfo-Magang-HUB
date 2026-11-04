package services

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

const ChatPurgeInterval = 24 * time.Hour

// PurgeExpiredChatSessions deletes anonymous chat sessions whose last activity is
// older than the retention window, together with their messages (ERD AI §6.4).
// Activity falls back to the latest message and then the session creation time
// because sessions created before last_message_at was maintained hold NULL.
// Messages are deleted explicitly: the database has no FK cascade on session_id.
func PurgeExpiredChatSessions(ctx context.Context, db *gorm.DB, now time.Time, retention time.Duration) (sessions, messages int64, err error) {
	cutoff := now.Add(-retention)
	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ids []int64
		if e := tx.Model(&models.ChatSession{}).
			Where("COALESCE(last_message_at, (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.session_id = chat_sessions.id), created_at) < ?", cutoff).
			Pluck("id", &ids).Error; e != nil {
			return e
		}
		if len(ids) == 0 {
			return nil
		}
		deleted := tx.Where("session_id IN ?", ids).Delete(&models.ChatMessage{})
		if deleted.Error != nil {
			return deleted.Error
		}
		messages = deleted.RowsAffected
		deleted = tx.Where("id IN ?", ids).Delete(&models.ChatSession{})
		if deleted.Error != nil {
			return deleted.Error
		}
		sessions = deleted.RowsAffected
		return nil
	})
	if err != nil {
		return 0, 0, err
	}
	return sessions, messages, nil
}

// StartChatRetentionJob runs the purge once at startup and then every 24 hours.
// retentionDays <= 0 disables the job.
func StartChatRetentionJob(db *gorm.DB, retentionDays int) {
	if retentionDays <= 0 {
		log.Println("[ChatRetention] Disabled (CHAT_RETENTION_DAYS <= 0)")
		return
	}
	if !db.Migrator().HasTable(&models.ChatSession{}) || !db.Migrator().HasTable(&models.ChatMessage{}) {
		log.Println("[ChatRetention] Chat tables not available; purge job not started")
		return
	}
	retention := time.Duration(retentionDays) * 24 * time.Hour
	run := func() {
		sessions, messages, err := PurgeExpiredChatSessions(context.Background(), db, time.Now(), retention)
		if err != nil {
			log.Printf("[ChatRetention] Purge failed: %v", err)
			return
		}
		log.Printf("[ChatRetention] Purged sessions=%d messages=%d (retention=%d days)", sessions, messages, retentionDays)
	}
	go func() {
		run()
		ticker := time.NewTicker(ChatPurgeInterval)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}
