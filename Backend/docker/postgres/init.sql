-- Dijalankan otomatis oleh Docker entrypoint saat inisialisasi database pertama kali.
-- Ekstensi pgvector disediakan oleh image pgvector/pgvector (sudah ter-*compile* di image),
-- di sini hanya perlu diaktifkan pada database POSTGRES_DB.
CREATE EXTENSION IF NOT EXISTS vector;
