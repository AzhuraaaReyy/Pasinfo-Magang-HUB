package services

// noReferenceAnswer is the fixed clarification for a first message that points back to something
// ("Berapa harganya?", "Tempat itu buka jam berapa?") while the conversation has nothing before it.
const noReferenceAnswer = "Mohon maaf, saya belum tahu tempat, acara, atau topik yang Anda maksud karena kita belum membahasnya sebelumnya. Boleh sebutkan namanya? Saya siap membantu informasi wisata, kuliner, budaya, acara, dan berita di Pasuruan."

// capabilityAnswer is the fixed reply to a question about the assistant itself ("Apa saja yang bisa kamu bantu?").
// The model listed its domains as numbered items without context, so grounding replaced the answer with "Maaf,
// informasi tersebut belum tersedia…" (E2E-F3, jobdesk 30 Okt, 2026-11-03).
const capabilityAnswer = "Saya Pasinfo Travel Assistant, siap membantu Anda mencari informasi seputar Pasuruan dari database Pasuruan Info:\n1. Destinasi wisata\n2. Kuliner\n3. Budaya dan tradisi\n4. Jadwal acara\n5. Informasi wilayah Kota dan Kabupaten Pasuruan\n6. Berita\n7. Tempat terdekat beserta perkiraan waktu tempuhnya\n\nSilakan tanyakan, misalnya, \"Rekomendasikan wisata alam di Pasuruan\" atau \"Ada acara apa bulan ini?\""

// weatherUnavailableAnswer is the reply to a weather question: destination_weather holds sample values and
// WEATHER_API_KEY is empty, so no current weather can be stated (Owner 2026-11-06).
const weatherUnavailableAnswer = "Mohon maaf, informasi cuaca terkini belum tersedia di database kami. Sebaiknya cek prakiraan cuaca resmi sebelum berangkat, ya. Saya siap membantu informasi lokasi, fasilitas, atau harga tempat yang Anda tuju."
