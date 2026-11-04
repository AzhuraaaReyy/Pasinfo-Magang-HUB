package models

import (
	"encoding/json"
	"time"

	"github.com/pgvector/pgvector-go"
)

type User struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Name       string    `json:"name"`
	Email      string    `json:"email" gorm:"unique"`
	Password   string    `json:"-"`    // Not returning password in JSON
	Role       string    `json:"role"` // "member", "penulis", "editor", "admin"
	Phone      string    `json:"phone"`
	Provinsi   string    `json:"provinsi"`
	KotaKab    string    `json:"kota_kab"`
	Kecamatan  string    `json:"kecamatan"`
	Kelurahan  string    `json:"kelurahan"`
	Alamat     string    `json:"alamat"`
	Photo      string    `json:"photo"`
	IsVerified int       `json:"is_verified"`
	TotalXP    int       `json:"total_xp"`
}

type News struct {
	ID          uint        `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	Title       string      `json:"judul"`
	Slug        string      `json:"slug" gorm:"size:191;uniqueIndex"`
	Excerpt     *string     `json:"excerpt" gorm:"type:text"`
	PublishedAt *time.Time  `json:"published_at"`
	CategoryID  uint        `json:"category_id"`
	Category    Category    `json:"kategori" gorm:"foreignKey:CategoryID"`
	Content     string      `json:"konten"`
	ProvinceID  string      `json:"province_id"`
	RegencyID   string      `json:"regency_id"`
	DistrictID  string      `json:"district_id"`
	VillageID   string      `json:"village_id"`
	Images      []NewsImage `json:"images" gorm:"foreignKey:NewsID"`
	AuthorID    uint        `json:"author_id"`
	Author      User        `json:"penulis" gorm:"foreignKey:AuthorID"`
	Views       int         `json:"views"`
	Status      string      `json:"status" gorm:"default:'draft'"` // "draft", "pending", "revision", "published"
	SourceURL   string      `json:"source_url" gorm:"uniqueIndex"` // URL asli artikel (untuk deduplication)
	Source      string      `json:"source"`                        // nama sumber (misal: "Kompas", "NewsAPI")
}

// For returning formatted time in JSON like "10 menit", we can use a custom response struct or calculate on the frontend.
// Since frontend expects 'waktu', we can format the created_at appropriately.
type NewsResponse struct {
	ID            uint      `json:"id"`
	Judul         string    `json:"judul"`
	Kategori      string    `json:"kategori"`
	Konten        string    `json:"konten"`
	ProvinceID    string    `json:"province_id"`
	RegencyID     string    `json:"regency_id"`
	DistrictID    string    `json:"district_id"`
	VillageID     string    `json:"village_id"`
	Images        []string  `json:"images"`
	ImageCaptions []string  `json:"image_captions"`
	Penulis       string    `json:"penulis"`
	Waktu         string    `json:"waktu"`
	SourceURL     string    `json:"source_url"`
	Source        string    `json:"source"`
	Status        string    `json:"status"`
	Views         int       `json:"views"`
	Kota          string    `json:"kota"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	WaktuUpdate   string    `json:"waktu_update"`
}

type Province struct {
	Code string `json:"code" gorm:"primaryKey"`
	Name string `json:"name"`
}

type Regency struct {
	Code         string `json:"code" gorm:"primaryKey"`
	Name         string `json:"name"`
	ProvinceCode string `json:"province_code"`
}

type District struct {
	Code        string `json:"code" gorm:"primaryKey"`
	Name        string `json:"name"`
	RegencyCode string `json:"regency_code"`
}

type Village struct {
	Code         string `json:"code" gorm:"primaryKey"`
	Name         string `json:"name"`
	DistrictCode string `json:"district_code"`
}

type Category struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Name      string    `json:"name" gorm:"unique"`
	Slug      string    `json:"slug" gorm:"unique"`
}

type ArticleCategory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:150" json:"name"`
	Slug      string    `gorm:"size:100;uniqueIndex" json:"slug"`
	CreatedAt time.Time `json:"-"`
	UpdatedAt time.Time `json:"-"`
}

func (ArticleCategory) TableName() string { return "article_categories" }

type Article struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	AuthorID    *uint           `json:"-"`
	CategoryID  uint            `gorm:"index" json:"category_id"`
	Title       string          `gorm:"size:255" json:"title"`
	Slug        string          `gorm:"size:191;uniqueIndex" json:"slug"`
	Excerpt     *string         `gorm:"type:text" json:"excerpt"`
	Content     string          `gorm:"type:text" json:"content"`
	AuthorName  string          `gorm:"size:150" json:"author_name"`
	Source      string          `gorm:"size:100" json:"source"`
	Status      string          `gorm:"size:20;default:published" json:"status"`
	Featured    bool            `json:"featured"`
	PublishedAt *time.Time      `json:"published_at"`
	CreatedAt   time.Time       `json:"-"`
	UpdatedAt   time.Time       `json:"-"`
	Category    ArticleCategory `gorm:"foreignKey:CategoryID" json:"category"`
}

func (Article) TableName() string { return "articles" }

type NewsImage struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	NewsID       uint   `json:"news_id"`
	ImagePath    string `json:"image_path"`
	ImageCaption string `json:"image_caption" gorm:"type:text"`
}

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	UserID    uint      `json:"user_id"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	NewsID    *uint     `json:"news_id"` // Optional reference to the news article
	News      *News     `json:"news" gorm:"foreignKey:NewsID"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"` // e.g., "info", "warning", "success"
	IsRead    bool      `json:"is_read" gorm:"default:false"`
}

type History struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserID       uint      `json:"user_id"`
	User         User      `json:"-" gorm:"foreignKey:UserID"`
	NewsID       uint      `json:"news_id"`
	News         News      `json:"news" gorm:"foreignKey:NewsID"`
	ActivityType string    `json:"activity_type"` // "read" or "bookmark"
}

type Ad struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Title       string    `json:"title"`
	Slot        string    `json:"slot"`      // "header_top", "home_sidebar", "home_feed", "berita_inline", "berita_bottom", "wisata_banner"
	ImageURL    string    `json:"image_url"` // Direct URL or Base64 / upload path
	RedirectURL string    `json:"redirect_url"`
	Status      string    `json:"status" gorm:"default:'Aktif'"` // "Aktif", "Non-Aktif"
}

type VerifyOTP struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	Email     string    `json:"email" gorm:"index"`
	OTP       string    `json:"otp"`
	ExpiresAt time.Time `json:"expires_at"`
	IsUsed    bool      `json:"is_used" gorm:"default:false"`
}

func (VerifyOTP) TableName() string {
	return "verify_otps"
}

// PasswordResetOTP is an alias for VerifyOTP for backward compatibility
type PasswordResetOTP = VerifyOTP

type Region struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Slug             string    `gorm:"uniqueIndex;size:100" json:"slug"`
	Name             string    `gorm:"size:150" json:"name"`
	Color            string    `gorm:"size:20" json:"color"`
	CenterLatitude   float64   `gorm:"type:decimal(10,7)" json:"center_latitude"`
	CenterLongitude  float64   `gorm:"type:decimal(10,7)" json:"center_longitude"`
	Zoom             int       `json:"zoom"`
	ShortDescription string    `gorm:"type:text" json:"short_description"`
	CreatedAt        time.Time `json:"-"`
	UpdatedAt        time.Time `json:"-"`
}

type TravelCategory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Domain    string    `gorm:"size:20;uniqueIndex:idx_travel_categories_domain_slug" json:"domain"`
	Slug      string    `gorm:"size:100;uniqueIndex:idx_travel_categories_domain_slug" json:"slug"`
	Name      string    `gorm:"size:150" json:"name"`
	CreatedAt time.Time `json:"-"`
	UpdatedAt time.Time `json:"-"`
}

func (TravelCategory) TableName() string { return "travel_categories" }

type DestinationPrice struct {
	ID            uint    `gorm:"primaryKey" json:"-"`
	DestinationID uint    `gorm:"index" json:"-"`
	Name          string  `gorm:"size:100" json:"name"`
	Price         float64 `gorm:"type:decimal(12,2)" json:"price"`
	MinPrice      float64 `gorm:"type:decimal(12,2)" json:"min_price"`
	MaxPrice      float64 `gorm:"type:decimal(12,2)" json:"max_price"`
	Description   *string `gorm:"type:text" json:"description"`
	ExternalURL   *string `gorm:"type:text" json:"external_url"`
}

func (DestinationPrice) TableName() string { return "destination_prices" }

type Facility struct {
	ID            uint    `gorm:"primaryKey" json:"-"`
	DestinationID uint    `gorm:"index" json:"-"`
	Name          string  `gorm:"size:100" json:"name"`
	Slug          string  `gorm:"size:120" json:"slug"`
	Icon          *string `gorm:"size:100" json:"icon"`
	Note          *string `gorm:"type:text" json:"note"`
	SortOrder     int     `json:"sort_order"`
}

func (Facility) TableName() string { return "facilities" }

type DestinationWeather struct {
	ID              uint       `gorm:"primaryKey" json:"-"`
	DestinationID   uint       `gorm:"uniqueIndex" json:"-"`
	Provider        *string    `gorm:"size:50" json:"provider"`
	Source          *string    `gorm:"size:100" json:"source"`
	ConditionCode   string     `gorm:"size:50" json:"condition_code"`
	ConditionLabel  string     `gorm:"size:100" json:"condition_label"`
	TemperatureC    float64    `json:"temperature_c"`
	FeelsLikeC      float64    `json:"feels_like_c"`
	HumidityPercent float64    `json:"humidity_percent"`
	WindSpeedKmh    float64    `json:"wind_speed_kmh"`
	PrecipitationMM float64    `json:"precipitation_mm"`
	Icon            string     `gorm:"size:50" json:"icon"`
	ObservedAt      *time.Time `json:"observed_at"`
	ExpiresAt       *time.Time `json:"expires_at"`
}

func (DestinationWeather) TableName() string { return "destination_weather" }

type Media struct {
	ID           uint    `gorm:"primaryKey" json:"-"`
	MediableType string  `gorm:"size:50;index:idx_media_polymorphic" json:"-"`
	MediableID   uint    `gorm:"index:idx_media_polymorphic" json:"-"`
	Type         string  `gorm:"size:10" json:"type"`
	URL          string  `gorm:"type:text" json:"url"`
	ThumbnailURL string  `gorm:"type:text" json:"thumbnail_url"`
	AltText      string  `gorm:"type:text" json:"alt_text"`
	Caption      *string `gorm:"type:text" json:"caption"`
	SortOrder    int     `json:"sort_order"`
	IsFeatured   bool    `json:"is_featured"`
}

func (Media) TableName() string { return "media" }

type OpeningHour struct {
	ID           uint      `gorm:"primaryKey" json:"-"`
	OpenableType string    `gorm:"size:50;index:idx_opening_hours_polymorphic" json:"-"`
	OpenableID   uint      `gorm:"index:idx_opening_hours_polymorphic" json:"-"`
	DayOfWeek    int       `gorm:"type:smallint" json:"day_of_week"`
	OpensAt      time.Time `json:"opens_at"`
	ClosesAt     time.Time `json:"closes_at"`
	IsClosed     bool      `json:"is_closed"`
	Is24Hours    bool      `json:"is_24_hours"`
	SortOrder    int       `json:"sort_order"`
}

func (OpeningHour) TableName() string { return "opening_hours" }

type Place struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	GooglePlaceID string    `gorm:"size:100;index" json:"place_id"`
	Name          string    `gorm:"size:150" json:"name"`
	Address       string    `gorm:"type:text" json:"address"`
	Village       string    `gorm:"size:100" json:"-"`
	District      string    `gorm:"size:100" json:"-"`
	Regency       string    `gorm:"size:100" json:"-"`
	Province      string    `gorm:"size:100" json:"-"`
	PostalCode    string    `gorm:"size:20" json:"-"`
	Latitude      float64   `gorm:"type:decimal(10,7)" json:"latitude"`
	Longitude     float64   `gorm:"type:decimal(10,7)" json:"longitude"`
	MapURL        string    `gorm:"type:text" json:"map_url"`
	CreatedAt     time.Time `json:"-"`
	UpdatedAt     time.Time `json:"-"`
}

type Destination struct {
	ID                uint    `gorm:"primaryKey" json:"id"`
	PlaceID           uint    `gorm:"index" json:"place_id"`
	RegionID          uint    `gorm:"index" json:"region_id"`
	CategoryID        uint    `gorm:"index" json:"category_id"`
	Name              string  `gorm:"size:150" json:"name"`
	Slug              string  `gorm:"size:150;uniqueIndex" json:"slug"`
	ShortDescription  string  `gorm:"type:text" json:"short_description"`
	Description       string  `gorm:"type:text" json:"description"`
	Status            string  `gorm:"size:20;default:published" json:"status"`
	OperationalStatus string  `gorm:"size:30" json:"operational_status"`
	Featured          bool    `gorm:"default:false" json:"featured"`
	Rating            float64 `gorm:"type:decimal(3,2)" json:"rating"`
	ReviewsLabel      string  `gorm:"size:50" json:"reviews_label"`
	Keyakinan         string  `gorm:"size:30" json:"keyakinan"`
	// Views counts detail page views (Sprint 1 Tahap B, Owner 2026-11-03): popularity signal for recommendations.
	Views          int64               `gorm:"not null;default:0" json:"-"`
	Source         string              `gorm:"size:150" json:"source"`
	PublishedAt    *time.Time          `json:"published_at"`
	CreatedAt      time.Time           `json:"-"`
	UpdatedAt      time.Time           `json:"-"`
	Place          Place               `gorm:"foreignKey:PlaceID" json:"place"`
	Region         Region              `gorm:"foreignKey:RegionID" json:"-"`
	TravelCategory TravelCategory      `gorm:"foreignKey:CategoryID" json:"category"`
	Prices         []DestinationPrice  `gorm:"foreignKey:DestinationID" json:"destination_prices"`
	Facilities     []Facility          `gorm:"foreignKey:DestinationID" json:"facilities"`
	Weather        *DestinationWeather `gorm:"foreignKey:DestinationID" json:"weather"`
	Media          []Media             `gorm:"polymorphic:Mediable;polymorphicValue:Destination" json:"media"`
	Hours          []OpeningHour       `gorm:"polymorphic:Openable;polymorphicValue:Destination" json:"-"`
	Verification   *Verification       `gorm:"polymorphic:Verifiable;polymorphicValue:Destination" json:"verification"`
}

type Culinary struct {
	ID               uint   `gorm:"primaryKey" json:"id"`
	PlaceID          *uint  `gorm:"index" json:"place_id"`
	Name             string `gorm:"size:150" json:"name"`
	Slug             string `gorm:"size:150;uniqueIndex" json:"slug"`
	ShortDescription string `gorm:"type:text" json:"short_description"`
	Description      string `gorm:"type:text" json:"description"`
	CulinaryType     string `gorm:"size:100" json:"culinary_type"`
	PriceRange       string `gorm:"size:50" json:"price_range"`
	// Keyakinan is the editorial confidence of the seed data (tinggi/sedang/rendah/perlu_cek), like destinations
	// (Owner 2026-11-03, jobdesk 2 Nov p3 R2): a quality weight for "pilihan editor" recommendations.
	Keyakinan   string         `gorm:"size:30" json:"keyakinan"`
	Views       int64          `gorm:"not null;default:0" json:"-"` // as Destination.Views
	Status      string         `gorm:"size:20;default:published" json:"status"`
	Featured    bool           `gorm:"default:false" json:"featured"`
	PublishedAt *time.Time     `json:"published_at"`
	CreatedAt   time.Time      `json:"-"`
	UpdatedAt   time.Time      `json:"-"`
	Place       *Place         `gorm:"foreignKey:PlaceID" json:"place"`
	Menus       []CulinaryMenu `gorm:"foreignKey:CulinaryID" json:"menus"`
}

type CulinaryMenu struct {
	ID          uint     `gorm:"primaryKey" json:"id"`
	CulinaryID  uint     `gorm:"index;uniqueIndex:idx_culinary_menus_identity"`
	Name        string   `gorm:"size:150;uniqueIndex:idx_culinary_menus_identity" json:"name"`
	Category    string   `gorm:"size:50" json:"category"`
	Description *string  `gorm:"type:text" json:"description"`
	Price       *float64 `gorm:"type:decimal(12,2)" json:"price"`
}
type Culture struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	PlaceID          *uint     `gorm:"index"`
	Name             string    `gorm:"size:150" json:"name"`
	Slug             string    `gorm:"size:150;uniqueIndex" json:"slug"`
	ShortDescription string    `gorm:"type:text" json:"short_description"`
	Description      string    `gorm:"type:text" json:"description"`
	CultureType      string    `gorm:"size:100" json:"culture_type"`
	HistoricalPeriod string    `gorm:"size:100" json:"historical_period"`
	Keyakinan        string    `gorm:"size:30" json:"keyakinan"`    // as Culinary.Keyakinan (Owner 2026-11-03)
	Views            int64     `gorm:"not null;default:0" json:"-"` // as Destination.Views
	Status           string    `gorm:"size:20;default:published" json:"status"`
	Featured         bool      `gorm:"default:false" json:"featured"`
	CreatedAt        time.Time `json:"-"`
	UpdatedAt        time.Time `json:"-"`
	Place            *Place    `gorm:"foreignKey:PlaceID" json:"place"`
}
type Event struct {
	ID               uint              `gorm:"primaryKey" json:"id"`
	PlaceID          *uint             `gorm:"index"`
	Name             string            `gorm:"size:150" json:"name"`
	Slug             string            `gorm:"size:150;uniqueIndex" json:"slug"`
	ShortDescription string            `gorm:"type:text" json:"short_description"`
	Description      string            `gorm:"type:text" json:"description"`
	EventType        string            `gorm:"size:100" json:"event_type"`
	OrganizerName    *string           `gorm:"size:255" json:"organizer_name"`
	Views            int64             `gorm:"not null;default:0" json:"-"` // as Destination.Views
	Status           string            `gorm:"size:20;default:published" json:"status"`
	Featured         bool              `gorm:"default:false" json:"featured"`
	CreatedAt        time.Time         `json:"-"`
	UpdatedAt        time.Time         `json:"-"`
	Place            *Place            `gorm:"foreignKey:PlaceID" json:"place"`
	Occurrences      []EventOccurrence `gorm:"foreignKey:EventID" json:"occurrences"`
	Tickets          []EventTicket     `gorm:"foreignKey:EventID" json:"tickets"`
}
type EventOccurrence struct {
	ID       uint `gorm:"primaryKey"`
	EventID  uint `gorm:"index"`
	StartsAt time.Time
	EndsAt   *time.Time
	Status   *string `gorm:"size:30"`
	Notes    *string `gorm:"type:text"`
}
type EventTicket struct {
	ID          uint     `gorm:"primaryKey"`
	EventID     uint     `gorm:"index;uniqueIndex:idx_event_tickets_identity"`
	Name        string   `gorm:"size:150;uniqueIndex:idx_event_tickets_identity"`
	Price       *float64 `gorm:"type:decimal(12,2)"`
	Description *string  `gorm:"type:text"`
	TicketURL   *string  `gorm:"type:text"`
	Available   bool     `gorm:"default:true"`
}
type TravelSource struct {
	ID          uint    `gorm:"primaryKey"`
	Name        string  `gorm:"size:150"`
	URL         *string `gorm:"type:text"`
	SourceType  string  `gorm:"size:50"`
	Description string  `gorm:"type:text"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (TravelSource) TableName() string { return "sources" }

type Sourceable struct {
	ID             uint   `gorm:"primaryKey"`
	SourceID       uint   `gorm:"uniqueIndex:idx_sourceables_unique"`
	SourceableType string `gorm:"size:50;uniqueIndex:idx_sourceables_unique;index"`
	SourceableID   uint   `gorm:"uniqueIndex:idx_sourceables_unique;index"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
type Verification struct {
	ID             uint   `gorm:"primaryKey"`
	VerifiableType string `gorm:"size:50;index"`
	VerifiableID   uint   `gorm:"index"`
	Status         string `gorm:"size:20"`
	VerifiedBy     *uint
	VerifiedAt     *time.Time
	Notes          string `gorm:"type:text"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// AI tables: constraints follow the approved ERD (devbackend/plans/2026-10-21-erd-ai-assistant.md) through
// GORM AutoMigrate tags (Owner 2026-11-01). Indexes (E2/E3, jobdesk 2 Nov, 2026-11-03): the ERD index
// idx_faq_knowledge_source; no single-column visitor_id/session_id index, the composite indexes cover them. CHECK values are the ones the backend writes; FAQ source types
// follow the active corpus (schema.md drift No. 16). is_active has no GORM default: a default would turn an
// inserted false into true.
type ChatSession struct {
	ID            int64      `gorm:"primaryKey"`
	VisitorID     string     `gorm:"size:64;not null;index:idx_chat_sessions_visitor_last,priority:1"`
	Title         *string    `gorm:"size:200"`
	Status        string     `gorm:"size:20;not null;default:active;check:chk_chat_sessions_status,status IN ('active','closed','expired')"`
	LastMessageAt *time.Time `gorm:"index:idx_chat_sessions_visitor_last,priority:2,sort:desc"`
	CreatedAt     time.Time  `gorm:"not null"`
	UpdatedAt     time.Time  `gorm:"not null"`
	// Messages creates the FK chat_messages.session_id → chat_sessions.id. NO ACTION, not CASCADE (Owner
	// 2026-10-28, option A 2026-11-01): the purge deletes the messages explicitly before their session.
	Messages []ChatMessage `gorm:"foreignKey:SessionID;constraint:OnDelete:NO ACTION"`
}
type ChatMessage struct {
	ID        int64           `gorm:"primaryKey"`
	SessionID int64           `gorm:"not null;index:idx_chat_messages_session_created,priority:1"`
	Role      string          `gorm:"size:20;not null;check:chk_chat_messages_role,role IN ('user','assistant','system')"`
	Content   *string         `gorm:"type:text"`
	Status    string          `gorm:"size:20;not null;default:complete;check:chk_chat_messages_status,status IN ('complete','pending','failed')"`
	Metadata  json.RawMessage `gorm:"type:jsonb"`
	CreatedAt time.Time       `gorm:"not null;index:idx_chat_messages_session_created,priority:2"`
}
type FAQKnowledgeBase struct {
	ID                 int64           `gorm:"primaryKey"`
	Question           string          `gorm:"type:text;not null"`
	Answer             string          `gorm:"type:text;not null"`
	Category           string          `gorm:"size:50;not null;index:idx_faq_knowledge_category;check:chk_faq_category,category IN ('wisata','berita','kuliner','budaya','acara','umum','layanan')"`
	SourceType         *string         `gorm:"size:20;uniqueIndex:idx_faq_knowledge_source,priority:1,where:source_type IS NOT NULL AND source_id IS NOT NULL;check:chk_faq_source_type,source_type IS NULL OR source_type IN ('destination','culinary','culture','event','news','region')"`
	SourceID           *int64          `gorm:"uniqueIndex:idx_faq_knowledge_source,priority:2"`
	SourceLabel        *string         `gorm:"type:text"`
	SourceURL          *string         `gorm:"type:text"`
	IsActive           bool            `gorm:"not null"`
	Embedding          pgvector.Vector `gorm:"type:vector(768)"`
	EmbeddingModel     *string         `gorm:"size:50"`
	EmbeddingUpdatedAt *time.Time
	Metadata           []byte    `gorm:"type:jsonb"`
	CreatedAt          time.Time `gorm:"not null"`
	UpdatedAt          time.Time `gorm:"not null"`
}

func (FAQKnowledgeBase) TableName() string { return "faq_knowledge_bases" }
