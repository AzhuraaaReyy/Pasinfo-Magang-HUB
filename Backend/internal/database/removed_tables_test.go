package database

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Owner 2026-11-09: the removed articles tables are dropped at start when empty; a table with rows is kept.
func TestDropRemovedTablesDropsOnlyEmptyTables(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	for _, sql := range []string{
		"CREATE TABLE article_categories (id integer primary key)",
		"CREATE TABLE articles (id integer primary key, category_id integer REFERENCES article_categories(id))",
		"INSERT INTO article_categories (id) VALUES (1)",
	} {
		if err := db.Exec(sql).Error; err != nil {
			t.Fatal(err)
		}
	}
	dropRemovedTables(db)
	if db.Migrator().HasTable("articles") || !db.Migrator().HasTable("article_categories") {
		t.Fatalf("articles (empty) must be dropped, article_categories (1 row) kept: articles=%v categories=%v", db.Migrator().HasTable("articles"), db.Migrator().HasTable("article_categories"))
	}
	db.Exec("DELETE FROM article_categories")
	dropRemovedTables(db)
	if db.Migrator().HasTable("article_categories") {
		t.Fatal("empty article_categories must be dropped")
	}
	dropRemovedTables(db) // no table left: nothing happens
}
