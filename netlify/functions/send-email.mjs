/* Rekyl — e-post och aviseringar.
 *
 * Tre vägar in, med olika behörighetsmodell:
 *   GET                        → konfigurationsstatus (ingen hemlig information)
 *   POST + Bearer <token>      → appen skickar mejl till en kandidat i SIN organisation
 *   POST + x-rekyl-secret      → Supabase-webhook: ny ansökan → avisera rekryteraren
 *
 * Miljövariabler (Netlify → Project configuration → Environment variables):
 *   MAIL_PROVIDER, BREVO_API_KEY (eller RESEND_API_KEY), MAIL_FROM
 *   NOTIFY_SECRET               → krävs för avisering vid ny ansökan
 *   SUPABASE_SERVICE_ROLE_KEY   → krävs för intervjupåminnelser
 */

import {
  EMAIL_RE, NOTIFY_SECRET, SB_KEY, SB_SERVICE, PROVIDER, enc, clean, json,
  configProblem, fromAddress, providerProblem, supabaseOk, verifyUser, sbRest,
  sendProvider, validAttachment, runReminders,
} from "../lib/mail.mjs";

const MAX_BODY = 20000;
const MAX_SUBJECT = 300;

/* ---- 1. Status ---- */
async function handleStatus() {
  const problem = configProblem();
  if (problem) return json(200, { configured: false, reason: problem });
  if (!(await supabaseOk())) return json(200, { configured: false, reason: "Supabase-nyckeln fungerar inte — sätt SUPABASE_ANON_KEY i Netlify." });
  const pp = await providerProblem();
  if (pp) return json(200, { configured: false, reason: pp });
  return json(200, {
    configured: true, provider: PROVIDER, from: fromAddress(),
    notify: !!NOTIFY_SECRET,
    reminders: !!SB_SERVICE,
  });
}

async function recipientAllowed(orgId, to, token) {
  const apps = await sbRest("applications?org_id=eq." + enc(orgId) + "&email=ilike." + enc(to) + "&select=id&limit=1", token);
  if (Array.isArray(apps) && apps.length) return true;
  const st = await sbRest("org_state?org_id=eq." + enc(orgId) + "&select=data", token);
  const cands = st && st[0] && st[0].data && Array.isArray(st[0].data.candidates) ? st[0].data.candidates : [];
  return cands.some((c) => String((c && c.email) || "").trim().toLowerCase() === to);
}

/* ---- 2. Appen skickar till en kandidat (eller kör påminnelser för sin org) ---- */
async function handleUserSend(req) {
  const problem = configProblem();
  if (problem) return json(503, { error: "Utskick ej konfigurerat: " + problem });

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json(401, { error: "Saknar sessionstoken." });

  const user = await verifyUser(token);
  if (!user) return json(401, { error: "Kunde inte verifiera sessionen mot Supabase (kontrollera SUPABASE_ANON_KEY, eller logga ut och in)." });

  let payload;
  try { payload = await req.json(); } catch (e) { return json(400, { error: "Felaktig begäran." }); }

  const members = await sbRest("members?user_id=eq." + enc(user.id) + "&select=org_id,role", token);
  const orgId = members && members[0] && members[0].org_id;
  if (!orgId) return json(403, { error: "Kontot tillhör ingen organisation." });

  /* Manuell påminnelsekörning — bara för den egna organisationen. */
  if (payload.action === "run-reminders") {
    if ((members[0].role || "") !== "admin") return json(403, { error: "Endast admin kan köra påminnelser." });
    const res = await runReminders(orgId);
    if (res.error) return json(503, { error: res.error });
    return json(200, res);
  }

  const to = clean(payload.to, 200).toLowerCase();
  const subject = clean(payload.subject, MAX_SUBJECT);
  const fromName = clean(payload.fromName, 80) || "Rekyl";
  const replyTo = clean(payload.replyTo, 200).toLowerCase();
  const text = String(payload.body == null ? "" : payload.body).slice(0, MAX_BODY);

  if (!EMAIL_RE.test(to)) return json(400, { error: "Ogiltig mottagaradress." });
  if (!subject) return json(400, { error: "Ämne saknas." });
  if (!text.trim()) return json(400, { error: "Meddelandetext saknas." });
  if (replyTo && !EMAIL_RE.test(replyTo)) return json(400, { error: "Ogiltig svarsadress." });

  const att = validAttachment(payload.attachment);
  if (att && att.error) return json(400, { error: att.error });

  /* Mottagaren måste finnas i anroparens organisation — annars vore detta ett spamrelä. */
  const isSelf = to === String(user.email || "").toLowerCase();
  if (!isSelf && !(await recipientAllowed(orgId, to, token))) {
    return json(403, { error: "Mottagaren finns inte som kandidat i din organisation." });
  }

  const res = await sendProvider({ fromName, to, subject, text, replyTo, attachment: att });
  if (!res.ok) return json(502, { error: res.error });
  return json(200, { ok: true, id: res.id, provider: PROVIDER });
}

/* ---- 3. Supabase-webhook: ny ansökan → avisera rekryteraren ---- */
async function handleWebhook(req, secret) {
  if (!NOTIFY_SECRET) return json(503, { error: "NOTIFY_SECRET saknas i Netlify." });
  if (secret !== NOTIFY_SECRET) return json(401, { error: "Fel hemlighet." });

  let p;
  try { p = await req.json(); } catch (e) { return json(400, { error: "Felaktig begäran." }); }
  if (!p || p.type !== "INSERT" || p.table !== "applications" || !p.record) return json(200, { ignored: true });

  const rec = p.record;
  if (!rec.job_slug) return json(200, { ignored: true });

  /* Tjänstens org-uppgifter läses ur den publicerade annonsen — ingen service-nyckel behövs. */
  const jobs = await sbRest("jobs?slug=eq." + enc(rec.job_slug) + "&select=title,org,org_id&limit=1", SB_KEY);
  const job = jobs && jobs[0];
  const org = job && job.org;
  if (!org || !EMAIL_RE.test(String(org.hrEmail || ""))) return json(200, { skipped: "ingen mottagaradress" });

  const name = clean(rec.name, 80) || "Okänd sökande";
  const subject = "Ny ansökan: " + name + " - " + clean(job.title, 80);
  const text = "Ny ansökan till " + job.title + " hos " + (org.companyName || "") + ".\n\n"
    + "Namn: " + name + "\n"
    + "E-post: " + (clean(rec.email, 200) || "-") + "\n"
    + "Telefon: " + (clean(rec.phone, 40) || "-") + "\n"
    + "Källa: " + (clean(rec.source, 40) || "direkt") + "\n\n"
    + "Öppna Rekyl för att se matchning och gå vidare:\n" + (org.appUrl || "");

  const res = await sendProvider({ fromName: org.companyName || "Rekyl", to: org.hrEmail, subject, text, replyTo: org.hrEmail });
  if (!res.ok) return json(502, { error: res.error });
  return json(200, { ok: true, notified: org.hrEmail });
}

export default async (req) => {
  if (req.method === "GET") return handleStatus();
  if (req.method !== "POST") return json(405, { error: "Metod stöds inte" });
  const secret = req.headers.get("x-rekyl-secret");
  if (secret) return handleWebhook(req, secret);
  return handleUserSend(req);
};
