// Jobdesk 30 Okt point 1: end-to-end check of the AI assistant flow, one row per question.
// Usage: node scripts/e2e-flow-check.js <baseUrl incl. /api/v1> <dbName>   env E2E_PAUSE_MS (API limit 20 req / 60 s per IP).
// Steps proven per case: 1 API accepts (HTTP + shape), 2 validation (negative cases), 3 retrieval (stored
// metadata), 4 context sent to the LLM (context_k, LLM latency), 5 grounded answer (grounding report, sources
// named), 6 persisted (DB rows, last_message_at, history endpoint).
"use strict";
const { execFileSync } = require("child_process");
const [base, db] = process.argv.slice(2);
const pause = Number(process.env.E2E_PAUSE_MS || 4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cases = [
  // id, domain expected in sources ("" = any / none), questions (later ones are follow-ups in the same session)
  ["W1", "destination", ["Apa itu Candi Jawi?", "Berapa harga tiketnya?"]],
  ["W2", "destination", ["Rekomendasikan 3 wisata alam di Pasuruan"]],
  ["K1", "culinary", ["Rekomendasikan kuliner khas Bangil"]],
  ["K2", "culinary", ["Di mana alamat Rawon Sakinah?"]],
  ["B1", "culture", ["Apa saja kesenian tradisional di Pasuruan?"]],
  ["B2", "culture", ["Ceritakan tentang Klenteng Tjoe Tik Kiong"]],
  ["E1", "event", ["Kapan Pekan Raya Pasuruan diadakan?"]],
  ["E2", "event", ["Ada acara apa di Pasuruan bulan September 2026?"]],
  ["F1", "region", ["Pasuruan itu kota atau kabupaten?"]],
  ["F2", "region", ["Wilayah mana saja yang ada di Pasuruan?"]],
  ["F3", "", ["Apa saja yang bisa kamu bantu?"]],
  ["N1", "news", ["Ada berita teknologi terbaru?"]],
];

const psql = (sql) => execFileSync("docker", ["exec", "-i", "pasinfo-legacy-postgres", "sh", "-c", `psql -U $POSTGRES_USER -d ${db} -At -q`], { input: `BEGIN READ ONLY; ${sql}; ROLLBACK;` })
  .toString().split(/\r?\n/).filter((l) => l.startsWith("{") || l.startsWith("[")).map((l) => JSON.parse(l));

async function call(method, path, cookie, body) {
  const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json, setCookie: (res.headers.get("set-cookie") || "").split(";")[0] };
}

(async () => {
  for (const [id, domain, questions] of cases) {
    await sleep(pause);
    const created = await call("POST", "/chat/sessions", "", {});
    const cookie = created.setCookie;
    const sid = created.json && created.json.session && created.json.session.id;
    for (let qi = 0; qi < questions.length; qi++) {
      await sleep(pause);
      const q = questions[qi];
      const r = await call("POST", `/chat/sessions/${sid}/messages`, cookie, { message: q });
      const row = { id: questions.length > 1 ? `${id}.${qi + 1}` : id, q, http: r.status };
      const a = r.json && r.json.assistant_message;
      const u = r.json && r.json.user_message;
      row.s1_api = r.status === 200 && !!(r.json && r.json.success && r.json.session && u && a);
      if (!a) { console.log(JSON.stringify(row)); continue; }
      const [meta] = psql(`SELECT metadata FROM chat_messages WHERE id = ${Number(a.id)}`);
      const sourceTypes = (a.metadata.sources || []).map((s) => s.source_type);
      row.status = a.metadata.retrieval_status;
      row.s3_retrieval = { retrieval_k: meta.retrieval_k, candidates: (meta.retrieval_candidates || []).length, path: meta.judge && meta.judge.skipped, event_period: meta.event_period || undefined, news: meta.news_category || (meta.news_latest ? "latest" : undefined) };
      row.s4_llm = { context_k: meta.context_k, llm_ms: meta.llm_latency_ms, model: meta.model };
      row.sources = [...new Set(sourceTypes)].join(",");
      row.domain_ok = domain === "" ? true : sourceTypes.includes(domain);
      const g = meta.grounding || {};
      const named = (a.metadata.sources || []).filter((s) => (a.content || "").includes(s.source_label)).length;
      row.s5_grounded = { valid: g.valid, fallback: g.fallback, named_sources: named, source_line: /\n\nSumber: /.test(a.content || ""), markdown: /\*\*|^#/m.test(a.content || "") };
      const [persist] = psql(`SELECT json_build_object('rows', (SELECT json_agg(json_build_object('id', id, 'role', role, 'status', status)) FROM chat_messages WHERE id IN (${Number(u.id)}, ${Number(a.id)}) AND session_id = ${Number(sid)}), 'last', (SELECT last_message_at FROM chat_sessions WHERE id = ${Number(sid)}))`);
      const hist = await call("GET", `/chat/sessions/${sid}/messages`, cookie);
      const ids = ((hist.json && hist.json.messages) || []).map((m) => m.id);
      row.s6_saved = { db_rows: (persist.rows || []).length, last_message_at: !!persist.last, history_has_both: ids.includes(u.id) && ids.includes(a.id) };
      row.answer = (a.content || "").replace(/\s+/g, " ").slice(0, 220);
      console.log(JSON.stringify(row));
    }
  }
  // Step 2: validation (no LLM call, nothing stored).
  await sleep(pause);
  const s = await call("POST", "/chat/sessions", "", {});
  const c = s.setCookie, sid = s.json.session.id;
  const neg = [
    ["V1 kosong", () => call("POST", `/chat/sessions/${sid}/messages`, c, { message: "  " })],
    ["V2 terlalu panjang", () => call("POST", `/chat/sessions/${sid}/messages`, c, { message: "a".repeat(2001) })],
    ["V3 sesi orang lain", () => call("POST", `/chat/sessions/${sid}/messages`, "", { message: "halo" })],
    ["V4 id tidak valid", () => call("POST", `/chat/sessions/abc/messages`, c, { message: "halo" })],
  ];
  for (const [name, fn] of neg) {
    const r = await fn();
    console.log(JSON.stringify({ id: name, http: r.status, code: r.json && r.json.error && r.json.error.code }));
  }
  const [stored] = psql(`SELECT json_build_object('messages', count(*)) FROM chat_messages WHERE session_id = ${Number(sid)}`);
  console.log(JSON.stringify({ id: "V* tersimpan", messages_in_session: stored.messages }));
})();
