// Copy this file to config.js and fill in your values, then commit config.js.
// All values here are SAFE to be public (the Supabase anon key is publishable;
// the Gemini and Adzuna keys are NOT here — they live in server-side secrets).
window.JOB_RADAR_CONFIG = {
  // From Supabase → Project Settings → API. Leave blank to run without login.
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  // The deployed "tailor-resume" edge function URL (see supabase/README).
  // e.g. https://YOURPROJECT.supabase.co/functions/v1/tailor-resume
  TAILOR_URL: "",
  // Where the crawler commits the feed (relative path is fine on GitHub Pages).
  JOBS_FEED: "data/jobs.json",
};
