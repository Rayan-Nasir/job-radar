# Job Radar

Find relevant roles across the web → tailor the resume with AI → apply on each role's own page.
All free tier. No servers to maintain.

## What's in here

```
index.html              The site (GitHub Pages serves this)
config.js               Your public settings (Supabase URL/anon key, function URL). Blank = local mode.
config.example.js       Reference for config.js
data/jobs.json          The job feed (the crawler overwrites this; ships with sample data)
crawler/                Node crawler: pulls public job feeds → data/jobs.json
  crawl.mjs, sources.mjs, companies.json, package.json
.github/workflows/crawl.yml   Runs the crawler every 6h + on-demand, commits the feed
supabase/               Optional login + AI resume tailoring
  schema.sql
  functions/tailor-resume/index.ts
```

**How it works:** GitHub Actions runs the crawler on a schedule and commits `data/jobs.json`; GitHub Pages serves the site and that file. The site matches each person's saved profile against the feed *in the browser* (instant, free) and links straight to each role's apply page. Gemini is used only for resume tailoring, inside a Supabase function so the key stays private.

---

## Setup

### Part 1 — get the job feed live (10 min, no accounts beyond GitHub)

1. **Create a repo** (e.g. `job-radar`) under your GitHub account and push these files to it.
2. **Enable Pages:** repo → *Settings → Pages* → Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)` → Save. Your site will be at `https://<you>.github.io/job-radar/`.
3. **(Recommended) Add Adzuna** for the widest coverage: sign up free at https://developer.adzuna.com/, create an app to get an **App ID** and **App Key**. Then repo → *Settings → Secrets and variables → Actions*:
   - New **secret** `ADZUNA_APP_ID` = your id
   - New **secret** `ADZUNA_APP_KEY` = your key
   - (optional) New **variable** `ADZUNA_COUNTRY` = `gb` / `us` / `au` etc. (default `gb`)
   Skip this and the crawler still runs on all the other free sources.
4. **Run the crawler once:** repo → *Actions → Crawl jobs → Run workflow*. After ~1 min it commits a fresh `data/jobs.json`. From then on it refreshes every 6 hours automatically.
5. Open your Pages URL → **Live matches** now shows real roles for the profile on the left.

That's a fully working discovery + apply tool. Parts 2–3 add login and AI resume tailoring.

### Part 2 — AI resume tailoring (Supabase + Gemini)

1. Create a free project at https://supabase.com/.
2. *SQL Editor* → paste and run `supabase/schema.sql`.
3. Install the Supabase CLI, then from the repo root:
   ```
   supabase link --project-ref <your-project-ref>
   supabase functions deploy tailor-resume --no-verify-jwt
   supabase secrets set GEMINI_API_KEY=<your AI Studio key>
   ```
   > The key must be an **AI Studio API key** (starts with `AIza…`), from https://aistudio.google.com/apikey. If the one you have doesn't authenticate, generate a fresh API key there.
4. Copy your function URL: `https://<project-ref>.supabase.co/functions/v1/tailor-resume`.

### Part 3 — turn on login (Google) + saved profiles

1. Supabase → *Authentication → Providers → Google* → enable, and paste in a Google OAuth client (Google Cloud Console → *APIs & Services → Credentials → OAuth client ID → Web*; add your Pages URL and the Supabase callback URL it shows you as authorized redirect URIs).
2. Supabase → *Project Settings → API*: copy the **Project URL** and the **anon public** key.
3. Edit **`config.js`** and fill in:
   ```js
   SUPABASE_URL: "https://<project-ref>.supabase.co",
   SUPABASE_ANON_KEY: "<anon public key>",
   TAILOR_URL: "https://<project-ref>.supabase.co/functions/v1/tailor-resume",
   ```
   Commit it. Sign-in and per-person saved profiles now work for you and the 3 others.

---

## Notes

- **Costs:** GitHub Pages + Actions, Supabase, Gemini free tier, Adzuna free tier — all $0 at this scale.
- **Where keys live:** Adzuna keys → GitHub Actions secrets. Gemini key → Supabase secret. Supabase *anon* key is safe to be public in `config.js`. No secret ever ships in the page.
- **More companies:** add Greenhouse/Lever/Ashby board slugs to `crawler/companies.json` — that's how you reach roles that never hit the big aggregators. Find the slug in a company's careers URL (e.g. `boards.greenhouse.io/stripe` → `stripe`).
- **Legit by design:** it aggregates public feeds and links to each role's real apply page. It does not scrape LinkedIn or auto-submit (both get accounts banned).
