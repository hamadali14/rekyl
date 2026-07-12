/* Rekyl — säker e-postutskickstjänst (Netlify Function).
 *
 * Miljövariabler (Netlify → Project configuration → Environment variables):
 *   MAIL_PROVIDER   "brevo" eller "resend"
 *   BREVO_API_KEY   (om brevo)  |  RESEND_API_KEY  (om resend)
 *   MAIL_FROM       verifierad avsändaradress, t.ex. "noreply@dindoman.se"
 *   SUPABASE_URL / SUPABASE_ANON_KEY  (valfria — samma publika värden som i appen)
 *
 * Säkerhet: anroparens Supabase-session verifieras, och mottagaren måste finnas
 * i anroparens EGEN organisation. Tjänsten kan inte missbrukas som spamrelä.
 */

const SB_URL = process.env.SUPABASE_URL || "https://eaditrzamfhylmlrmkca.supabase.co";
const SB_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZGl0cnphbWZoeWxtbHJta2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODA4NjgsImV4cCI6MjA5OTE1Njg2OH0.jFzfeVow0P-46Vj7G-yTVjA1IHp8UN-Ts8Us719rYmE";

const PROVIDER = String(process.env.MAIL_PROVIDER || "").toLowerCase();
const MAIL_FROM = String(process.env.MAIL_FROM || "").trim();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const BREVO_API_KEY = String(process.env.BREVO_API_KEY || "").trim();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 20000;
const MAX_SUBJECT = 300;
const MAX_ATTACH = 100 * 1024; /* 100 kB */

/* Endast kalenderinbjudningar tillats som bilaga — aldrig godtyckliga filer. */
function validAttachment(a) {
  if (!a) return null;
  if (typeof a !== "object") return { error: "Ogiltig bilaga." };
  const name = clean(a.name, 60);
  const content = String(a.content || "");
  if (!/^[\w-]+\.ics$/i.test(name)) return { error: "Endast kalenderfiler (.ics) far bifogas." };
  if (!content || !/^[A-Za-z0-9+/=]+$/.test(content)) return { error: "Bilagan ar inte korrekt kodad." };
  if (content.length > MAX_ATTACH) return { error: "Bilagan ar for stor." };
  return { name, content };
}

const enc = encodeURIComponent;
const providerKey = () => (PROVIDER === "resend" ? RESEND_API_KEY : PROVIDER === "brevo" ? BREVO_API_KEY : "");
const fromAddress = () => { const m = MAIL_FROM.match(/<([^>]+)>/); return (m ? m[1] : MAIL_FROM).trim(); };

/* Vad saknas i konfigurationen? Returnerar en läsbar orsak, aldrig ett tyst fel. */
function configProblem() {
  if (!PROVIDER) return "MAIL_PROVIDER saknas (sätt 'brevo' eller 'resend').";
  if (PROVIDER !== "brevo" && PROVIDER !== "resend") return "MAIL_PROVIDER måste vara 'brevo' eller 'resend'.";
  if (!providerKey()) return (PROVIDER === "brevo" ? "BREVO_API_KEY" : "RESEND_API_KEY") + " saknas.";
  if (!MAIL_FROM) return "MAIL_FROM saknas.";
  if (!EMAIL_RE.test(fromAddress())) return "MAIL_FROM är ingen giltig adress.";
  return null;
}

/* Skydd mot header-injection. */
const clean = (v, max) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").replace(/["<>]/g, "").trim().slice(0, max);
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function sbRest(path, token) {
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: { apikey: SB_KEY, Authorization: "Bearer " + token } });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { return null; }
}

/* Verifierar att SUPABASE_ANON_KEY faktiskt fungerar — annars kan status aldrig påstå "aktivt". */
async function supabaseOk() {
  try {
    const r = await fetch(SB_URL + "/auth/v1/settings", { headers: { apikey: SB_KEY } });
    return r.ok;
  } catch (e) { return false; }
}

/* Gör leverantörens felkoder begripliga och åtgärdbara. */
function providerHint(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("key not found") || m.includes("unauthorized") || m.includes("api key is invalid") || m.includes("invalid api key"))
    return "Leverantören nekar API-nyckeln. I Brevo: hämta en API-nyckel v3 under SMTP & API → API keys (börjar med 'xkeysib-') — en SMTP-nyckel fungerar inte här.";
  if (m.includes("sender") && (m.includes("not valid") || m.includes("not found") || m.includes("verif")))
    return "Avsändaradressen (MAIL_FROM) är inte verifierad hos leverantören. Lägg till och verifiera den under Senders i Brevo.";
  if (m.includes("domain") && m.includes("verif"))
    return "Avsändardomänen är inte verifierad hos leverantören.";
  return String(msg || "Leverantörsfel");
}

/* Kontrollerar att leverantören faktiskt accepterar nyckeln — status får aldrig påstå "aktivt" annars. */
async function providerProblem() {
  try {
    if (PROVIDER === "brevo") {
      const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": BREVO_API_KEY, Accept: "application/json" } });
      if (r.status === 401 || r.status === 403) return providerHint("key not found");
      if (!r.ok) return "Brevo svarar inte (" + r.status + ").";
      return null;
    }
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: "Bearer " + RESEND_API_KEY } });
    if (r.status === 401 || r.status === 403) return providerHint("api key is invalid");
    if (!r.ok) return "Resend svarar inte (" + r.status + ").";
    return null;
  } catch (e) { return "Kunde inte nå e-postleverantören."; }
}

async function verifyUser(token) {
  try {
    const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: "Bearer " + token } });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d && d.id ? d : null;
  } catch (e) { return null; }
}

/* Mottagaren måste finnas i anroparens organisation — antingen som ansökan i molnet
 * eller som kandidat i organisationens sparade state (täcker båda vägarna in). */
async function recipientAllowed(orgId, to, token) {
  const apps = await sbRest("applications?org_id=eq." + enc(orgId) + "&email=ilike." + enc(to) + "&select=id&limit=1", token);
  if (Array.isArray(apps) && apps.length) return true;
  const st = await sbRest("org_state?org_id=eq." + enc(orgId) + "&select=data", token);
  const cands = st && st[0] && st[0].data && Array.isArray(st[0].data.candidates) ? st[0].data.candidates : [];
  return cands.some((c) => String((c && c.email) || "").trim().toLowerCase() === to);
}

async function sendViaResend({ from, to, subject, text, replyTo, attachment }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(attachment ? { attachments: [{ filename: attachment.name, content: attachment.content }] } : {}) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: providerHint((d && (d.message || d.name)) || "Leverantörsfel (" + r.status + ")") };
  return { ok: true, id: d.id || null };
}

async function sendViaBrevo({ fromName, fromEmail, to, subject, text, replyTo, attachment }) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      ...(attachment ? { attachment: [{ name: attachment.name, content: attachment.content }] } : {}),
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: providerHint((d && (d.message || d.code)) || "Leverantörsfel (" + r.status + ")") };
  return { ok: true, id: d.messageId || null };
}

export default async (req) => {
  if (req.method === "GET") {
    const problem = configProblem();
    if (problem) return json(200, { configured: false, reason: problem });
    if (!(await supabaseOk())) return json(200, { configured: false, reason: "Supabase-nyckeln fungerar inte — sätt SUPABASE_ANON_KEY i Netlify." });
    const pp = await providerProblem();
    if (pp) return json(200, { configured: false, reason: pp });
    return json(200, { configured: true, provider: PROVIDER, from: fromAddress() });
  }
  if (req.method !== "POST") return json(405, { error: "Metod stöds inte" });

  const problem = configProblem();
  if (problem) return json(503, { error: "Utskick ej konfigurerat: " + problem });

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json(401, { error: "Saknar sessionstoken." });

  const user = await verifyUser(token);
  if (!user) return json(401, { error: "Kunde inte verifiera sessionen mot Supabase (kontrollera SUPABASE_ANON_KEY, eller logga ut och in)." });

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

  const att = validAttachment(payload.attachment);
  if (att && att.error) return json(400, { error: att.error });

  const members = await sbRest("members?user_id=eq." + enc(user.id) + "&select=org_id", token);
  const orgId = members && members[0] && members[0].org_id;
  if (!orgId) return json(403, { error: "Kontot tillhör ingen organisation." });

  const isSelf = to === String(user.email || "").toLowerCase();
  if (!isSelf && !(await recipientAllowed(orgId, to, token))) {
    return json(403, { error: "Mottagaren finns inte som kandidat i din organisation." });
  }

  const fromEmail = fromAddress();
  const res = PROVIDER === "resend"
    ? await sendViaResend({ from: fromName + " <" + fromEmail + ">", to, subject, text, replyTo, attachment: att })
    : await sendViaBrevo({ fromName, fromEmail, to, subject, text, replyTo, attachment: att });

  if (!res.ok) return json(502, { error: res.error });
  return json(200, { ok: true, id: res.id, provider: PROVIDER });
};
