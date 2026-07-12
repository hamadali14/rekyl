/* Rekyl — säker e-postutskickstjänst (Netlify Function).
 *
 * Miljövariabler (Netlify → Site settings → Environment variables):
 *   MAIL_PROVIDER   "brevo" eller "resend"
 *   BREVO_API_KEY   (om brevo)  |  RESEND_API_KEY (om resend)
 *   MAIL_FROM       verifierad avsändaradress, t.ex. "noreply@dindoman.se"
 *   SUPABASE_URL        (valfri — faller tillbaka på projektets publika URL)
 *   SUPABASE_ANON_KEY   (valfri — samma nyckel som i klienten, publik)
 *
 * Säkerhet: anroparens Supabase-token verifieras, och mottagaren måste vara
 * en kandidat i anroparens EGEN organisation (eller anroparens egen adress).
 * Tjänsten kan därmed inte missbrukas som öppet spamrelä.
 */

const SB_URL = process.env.SUPABASE_URL || "https://eaditrzamfhylmlrmkca.supabase.co";
const SB_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZGl0cnphbWZoeWxtbHJta2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODA4NjgsImV4cCI6MjA5OTE1Njg2OH0.jFzfeVow0P-46Vj7G-yTVjA1IHp8UN-Ts8Us7";

const PROVIDER = String(process.env.MAIL_PROVIDER || "").toLowerCase();
const MAIL_FROM = String(process.env.MAIL_FROM || "").trim();
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 20000;
const MAX_SUBJECT = 300;

function providerKey() {
  if (PROVIDER === "resend") return RESEND_API_KEY;
  if (PROVIDER === "brevo") return BREVO_API_KEY;
  return "";
}
function isConfigured() {
  return !!(PROVIDER && providerKey() && MAIL_FROM && EMAIL_RE.test(fromAddress()));
}
function fromAddress() {
  const m = MAIL_FROM.match(/<([^>]+)>/);
  return (m ? m[1] : MAIL_FROM).trim();
}
/* Skydd mot header-injection: ta bort radbrytningar och citattecken. */
function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\r\n]+/g, " ").replace(/["<>]/g, "").trim().slice(0, max);
}
function json(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function sbRest(path, token) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: { apikey: SB_KEY, Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

async function verifyUser(token) {
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  return d && d.id ? d : null;
}

async function sendViaResend({ from, to, subject, text, replyTo }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: (d && (d.message || d.name)) || "Leverantörsfel (" + r.status + ")" };
  return { ok: true, id: d.id || null };
}

async function sendViaBrevo({ fromName, fromEmail, to, subject, text, replyTo }) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: (d && (d.message || d.code)) || "Leverantörsfel (" + r.status + ")" };
  return { ok: true, id: d.messageId || null };
}

export default async (req) => {
  if (req.method === "GET") {
    return json(200, { configured: isConfigured(), provider: isConfigured() ? PROVIDER : null, from: isConfigured() ? fromAddress() : null });
  }
  if (req.method !== "POST") return json(405, { error: "Metod stöds inte" });
  if (!isConfigured()) return json(503, { error: "Utskick är inte konfigurerat på servern (MAIL_PROVIDER, API-nyckel och MAIL_FROM saknas)." });

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json(401, { error: "Saknar sessionstoken." });

  const user = await verifyUser(token);
  if (!user) return json(401, { error: "Ogiltig eller utgången session." });

  let payload;
  try { payload = await req.json(); } catch (e) { return json(400, { error: "Felaktig begäran." }); }

  const to = clean(payload.to, 200).toLowerCase();
  const subject = clean(payload.subject, MAX_SUBJECT);
  const fromName = clean(payload.fromName, 80) || "Rekyl";
  const replyTo = clean(payload.replyTo, 200).toLowerCase();
  const text = String(payload.body == null ? "" : payload.body).slice(0, MAX_BODY);

  if (!EMAIL_RE.test(to)) return json(400, { error: "Ogiltig mottagaradress." });
  if (!subject) return json(400, { error: "Ämne saknas." });
  if (!text.trim()) return json(400, { error: "Meddelandetext saknas." });
  if (replyTo && !EMAIL_RE.test(replyTo)) return json(400, { error: "Ogiltig svarsadress." });

  /* Multi-tenancy: anroparen måste tillhöra en organisation. */
  const members = await sbRest("members?user_id=eq." + encodeURIComponent(user.id) + "&select=org_id", token);
  const orgId = members && members[0] && members[0].org_id;
  if (!orgId) return json(403, { error: "Kontot tillhör ingen organisation." });

  /* Mottagaren måste vara kandidat i anroparens organisation, eller anroparen själv (testmejl). */
  const isSelf = to === String(user.email || "").toLowerCase();
  if (!isSelf) {
    const apps = await sbRest("applications?org_id=eq." + encodeURIComponent(orgId) + "&email=eq." + encodeURIComponent(to) + "&select=id&limit=1", token);
    if (!apps || !apps.length) return json(403, { error: "Mottagaren är inte en kandidat i din organisation." });
  }

  const fromEmail = fromAddress();
  const res = PROVIDER === "resend"
    ? await sendViaResend({ from: `${fromName} <${fromEmail}>`, to, subject, text, replyTo })
    : await sendViaBrevo({ fromName, fromEmail, to, subject, text, replyTo });

  if (!res.ok) return json(502, { error: res.error });
  return json(200, { ok: true, id: res.id, provider: PROVIDER });
};
