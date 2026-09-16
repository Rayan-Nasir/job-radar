// Supabase Edge Function: tailor-resume
// Calls Gemini to rewrite a resume into clean, ATS-friendly structured JSON, tailored to a target profile.
// The Gemini key stays server-side (set as a secret) — never shipped to the browser.
//
// Deploy:
//   supabase functions deploy tailor-resume --no-verify-jwt
//   supabase secrets set GEMINI_API_KEY=YOUR_AI_STUDIO_KEY
//
// Expects an AI Studio API key (looks like "AIza..."). If a token doesn't work,
// create a fresh API key at https://aistudio.google.com/apikey.

const MODEL = "gemini-2.5-flash";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const KEY = Deno.env.get("GEMINI_API_KEY");
  if (!KEY) return json({ error: "GEMINI_API_KEY not set" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const resume = (body?.resume || "").toString().slice(0, 20000);
  const target = body?.target || {};
  if (!resume.trim()) return json({ error: "empty resume" }, 400);

  const prompt = [
    "You are an expert technical resume writer. Rewrite the resume below into a strong, ATS-friendly resume,",
    "tailored to the target role. Rules: keep everything truthful — do NOT invent employers, dates, titles, or metrics.",
    "Where a metric would strengthen a bullet but none is given, write the bullet qualitatively (no fabricated numbers).",
    "Lead with the strongest, most relevant experience for the target. Use active, specific language.",
    "",
    "TARGET ROLE PROFILE: " + JSON.stringify(target),
    "",
    "Return ONLY JSON matching this shape:",
    '{"name":"","title":"","contact":"","summary":"","skills":["",""],',
    '"experience":[{"title":"","company":"","dates":"","bullets":["",""]}],"education":[""]}',
    "",
    "RESUME:",
    resume,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const gemReq = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
  };

  let gem: any;
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(gemReq) });
    gem = await r.json();
    if (!r.ok) return json({ error: "gemini " + r.status, detail: gem }, 502);
  } catch (e) {
    return json({ error: "gemini fetch failed", detail: String(e) }, 502);
  }

  const text = gem?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = { summary: text }; }
  return json({ resume: parsed });
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });
}
