// Job Radar — source adapters. Each returns a normalized array of listings.
// Normalized shape: { id, title, company, location, remote, url, source, posted, tags }

const UA = "Mozilla/5.0 (compatible; JobRadar/1.0; +https://github.com)";

async function getJSON(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "application/json", ...(opts.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function norm(o) {
  return {
    id: o.source + ":" + (o.extId || o.url),
    title: (o.title || "").trim(),
    company: (o.company || "").trim(),
    location: (o.location || "").trim(),
    remote: !!o.remote,
    url: o.url,
    source: o.source,
    posted: o.posted || null,
    tags: (o.tags || []).filter(Boolean).slice(0, 12),
  };
}
const isRemote = (s = "") => /remote|anywhere|worldwide|distributed/i.test(s);

// ---- Greenhouse (public board API) ----
export async function greenhouse(token) {
  const d = await getJSON(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=false`);
  return (d.jobs || []).map((j) =>
    norm({
      source: "Greenhouse", extId: String(j.id), title: j.title,
      company: j.company_name || token, location: j.location?.name || "",
      remote: isRemote(j.location?.name), url: j.absolute_url,
      posted: j.updated_at, tags: (j.metadata || []).map((m) => m.value).filter((v) => typeof v === "string"),
    })
  );
}

// ---- Lever (public postings API) ----
export async function lever(company) {
  const d = await getJSON(`https://api.lever.co/v0/postings/${company}?mode=json`);
  return (d || []).map((j) =>
    norm({
      source: "Lever", extId: j.id, title: j.text, company,
      location: j.categories?.location || "", remote: isRemote(j.categories?.location) || isRemote(j.workplaceType),
      url: j.hostedUrl, posted: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
    })
  );
}

// ---- Ashby (public job board API) ----
export async function ashby(org) {
  const d = await getJSON(`https://api.ashbyhq.com/posting-api/job-board/${org}?includeCompensation=false`);
  return (d.jobs || []).map((j) =>
    norm({
      source: "Ashby", extId: j.id, title: j.title, company: d.name || org,
      location: j.location || "", remote: !!j.isRemote || isRemote(j.location),
      url: j.jobUrl || j.applyUrl, posted: j.publishedAt,
      tags: [j.department, j.team, j.employmentType].filter(Boolean),
    })
  );
}

// ---- Remotive (remote jobs API) ----
export async function remotive(search) {
  const d = await getJSON(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=60`);
  return (d.jobs || []).map((j) =>
    norm({
      source: "Remotive", extId: String(j.id), title: j.title, company: j.company_name,
      location: j.candidate_required_location || "Remote", remote: true, url: j.url,
      posted: j.publication_date, tags: [j.category, ...(j.tags || [])],
    })
  );
}

// ---- Arbeitnow (free job board API) ----
export async function arbeitnow() {
  const d = await getJSON(`https://www.arbeitnow.com/api/job-board-api`);
  return (d.data || []).map((j) =>
    norm({
      source: "Arbeitnow", extId: j.slug, title: j.title, company: j.company_name,
      location: j.location || "", remote: !!j.remote, url: j.url,
      posted: j.created_at ? new Date(j.created_at * 1000).toISOString() : null, tags: j.tags || [],
    })
  );
}

// ---- RemoteOK ----
export async function remoteok() {
  const d = await getJSON(`https://remoteok.com/api`);
  return (Array.isArray(d) ? d : []).filter((j) => j && j.id && j.position).map((j) =>
    norm({
      source: "RemoteOK", extId: String(j.id), title: j.position, company: j.company,
      location: j.location || "Remote", remote: true, url: j.url,
      posted: j.date, tags: j.tags || [],
    })
  );
}

// ---- Adzuna (needs free app_id + app_key) — wide coverage incl. many aggregated boards ----
export async function adzuna({ appId, appKey, country = "gb", queries = [] }) {
  if (!appId || !appKey) return [];
  const out = [];
  for (const q of queries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}` +
        `&results_per_page=50&what=${encodeURIComponent(q)}&content-type=application/json&max_days_old=30`;
      const d = await getJSON(url);
      (d.results || []).forEach((j) =>
        out.push(norm({
          source: "Adzuna", extId: String(j.id), title: j.title, company: j.company?.display_name || "",
          location: j.location?.display_name || "", remote: isRemote(j.title) || isRemote(j.description),
          url: j.redirect_url, posted: j.created, tags: [j.category?.label].filter(Boolean),
        }))
      );
    } catch (e) { console.error("adzuna", q, e.message); }
  }
  return out;
}
