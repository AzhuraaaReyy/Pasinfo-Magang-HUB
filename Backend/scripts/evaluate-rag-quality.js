#!/usr/bin/env node
// Scores a jobdesk1-run.ps1 raw JSONL against docs/RETRIEVAL_EVALUATION_LABELS.md.
// Usage: node scripts/evaluate-rag-quality.js <raw.jsonl> <labels.md> [<raw.jsonl> ...]
// Context sources are the `sources` field (documents actually given to the LLM).
"use strict";

const fs = require("fs");

function readText(path) {
  return fs.readFileSync(path, "utf8").replace(/^﻿/, "");
}

function loadLabels(path) {
  const labels = new Map();
  for (const line of readText(path).split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    // | id | type | label | source_id | fields | result | accept | critical | notes |
    if (cells.length < 10 || !/^[A-Z]{3}-\d{2}$/.test(cells[1])) continue;
    labels.set(cells[1], {
      result: cells[6],
      accept: cells[7] ? cells[7].split(";").map((a) => a.trim()).filter(Boolean) : [],
      critical: cells[8] === "yes",
    });
  }
  return labels;
}

function loadRaw(path) {
  return readText(path)
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

// `run:expected_accept` in a label means the accepted sources were read from the tested DB during the run
// (jobdesk1-run.ps1 writes them to the raw row's `expected_accept`), for data-dependent scenarios.
function acceptList(label, row) {
  if (!label.accept.includes("run:expected_accept")) return label.accept;
  return String((row && row.expected_accept) || "").split(";").map((a) => a.trim()).filter(Boolean);
}

function accepted(label, src, row) {
  return acceptList(label, row).some((a) => a === `type:${src.source_type}` || a === `${src.source_type}:${src.source_id}`);
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function evaluate(rows, labels) {
  const status = {};
  const http = {};
  const perScenario = [];
  let required = 0, hit = 0, contextSources = 0, acceptedSources = 0, criticalFP = 0, execErrors = 0;
  const llmLatency = [], totalLatency = [];

  for (const r of rows) {
    const key = r.retrieval_status || "(none)";
    status[key] = (status[key] || 0) + 1;
    http[r.http_status] = (http[r.http_status] || 0) + 1;
    if (r.error) execErrors++;
    if (typeof r.llm_latency_ms === "number" && r.llm_latency_ms > 0) llmLatency.push(r.llm_latency_ms);
    if (typeof r.total_latency_ms === "number" && r.total_latency_ms > 0) totalLatency.push(r.total_latency_ms);

    const label = labels.get(r.id);
    const ctx = Array.isArray(r.sources) ? r.sources : [];
    const row = { id: r.id, result: label ? label.result : "(unlabeled)", status: key, context: ctx.length, outcome: "" };

    if (!label) {
      row.outcome = "unlabeled";
    } else if (label.result === "source_required") {
      required++;
      const good = ctx.filter((s) => accepted(label, s, r));
      const bad = ctx.filter((s) => !accepted(label, s, r));
      contextSources += ctx.length;
      acceptedSources += good.length;
      if (good.length) hit++;
      if (bad.length && label.critical) criticalFP++;
      row.outcome = good.length ? (bad.length ? "TP+FP" : "TP") : bad.length ? "FP" : "FN";
      row.wrong = bad.map((s) => `${s.source_type}:${s.source_id} ${s.source_label}`);
    } else if (label.critical) {
      // critical unavailable/validation scenarios: any context is a false positive
      if (ctx.length) criticalFP++;
      row.outcome = ctx.length ? "FP_CRITICAL" : "OK";
    } else if (label.result === "unavailable_expected") {
      row.outcome = ctx.length ? "MANUAL_REVIEW" : "OK";
    } else {
      row.outcome = label.result;
    }
    perScenario.push(row);
  }

  return {
    scenarios: rows.length,
    execution_errors: execErrors,
    http_status: http,
    retrieval_status: status,
    source_required: required,
    recall: required ? +(hit / required).toFixed(3) : null,
    recall_hits: hit,
    precision: contextSources ? +(acceptedSources / contextSources).toFixed(3) : null,
    context_sources: contextSources,
    accepted_context_sources: acceptedSources,
    critical_false_positives: criticalFP,
    median_llm_latency_ms: median(llmLatency),
    median_total_latency_ms: median(totalLatency),
    per_scenario: perScenario,
  };
}

function main() {
  const [labelsPath, ...rawPaths] = (() => {
    const a = process.argv.slice(2);
    if (a.length < 2) {
      console.error("usage: node scripts/evaluate-rag-quality.js <raw.jsonl> <labels.md> [<raw.jsonl> ...]");
      process.exit(1);
    }
    return [a[1], a[0], ...a.slice(2)];
  })();
  const labels = loadLabels(labelsPath);
  const out = {};
  for (const p of rawPaths) out[p] = evaluate(loadRaw(p), labels);
  console.log(JSON.stringify({ labels: labels.size, results: out }, null, 2));
}

if (require.main === module) main();

module.exports = { loadLabels, evaluate, accepted, median };
