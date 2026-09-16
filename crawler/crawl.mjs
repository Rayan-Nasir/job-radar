// Job Radar crawler — aggregates public job feeds into data/jobs.json
// Relevance filtering is done PER USER in the app; this just gathers a wide, fresh pool.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "./sources.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, "..", "data", "jobs.json");
const companies = JSON.parse(fs.readFileSync(path.join(__dir, "companies.json"), "utf8"));

// Adzuna search terms (broad; app filters finely). Free key via developer.adzuna.com
const ADZUNA_QUERIES = ["software engineer", "full stack developer", "backend developer", "node.js", "react developer"];
const REMOTIVE_SEARCHES = ["software", "full stack", "backend", "frontend", "developer"];

async function settle(label, p) {
  try { const r = await p; console.log(`  ✓ ${label}: ${r.length}`); return r; }
  catch (e) { console.log(`  ✗ ${label}: ${e.message}`); return []; }
}

async function run() {
  const tasks = [];
  for (const t of companies.greenhouse || []) tasks.push(settle(`greenhouse/${t}`, S.greenhouse(t)));
  for (const c of companies.lever || []) tasks.push(settle(`lever/${c}`, S.lever(c)));
  for (const o of companies.ashby || []) tasks.push(settle(`ashby/${o}`, S.ashby(o)));
  for (const q of REMOTIVE_SEARCHES) tasks.push(settle(`remotive/${q}`, S.remotive(q)));
  tasks.push(settle("remoteok", S.remoteok()));
  tasks.push(settle("adzuna", S.adzuna({
    appId: process.env.ADZUNA_APP_ID, appKey: process.env.ADZUNA_APP_KEY,
    country: process.env.ADZUNA_COUNTRY || "gb", queries: ADZUNA_QUERIES,
  })));

  const all = (await Promise.all(tasks)).flat();

  // dedupe by url
  const seen = new Set();
  const jobs = [];
  for (const j of all) {
    if (!j.url || !j.title || seen.has(j.url)) continue;
    seen.add(j.url);
    jobs.push(j);
  }
  // newest first when a date exists
  jobs.sort((a, b) => (Date.parse(b.posted || 0) || 0) - (Date.parse(a.posted || 0) || 0));

  const payload = { generatedAt: new Date().toISOString(), count: jobs.length, sources: countBy(jobs), jobs };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 0));
  console.log(`\nWrote ${jobs.length} jobs → data/jobs.json`);
  console.log("By source:", JSON.stringify(payload.sources));
}
function countBy(jobs) {
  return jobs.reduce((m, j) => ((m[j.source] = (m[j.source] || 0) + 1), m), {});
}
run().catch((e) => { console.error(e); process.exit(1); });
