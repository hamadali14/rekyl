/* Rekyl — delad backend-modul för e-post och automatisering.
 * Importeras av netlify/functions/send-email.mjs och netlify/functions/reminders.mjs
 * så att leverantörslogik och konfiguration bara finns på ett ställe.
 */

export const SB_URL = process.env.SUPABASE_URL || "https://eaditrzamfhylmlrmkca.supabase.co";
export const SB_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZGl0cnphbWZoeWxtbHJta2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODA4NjgsImV4cCI6MjA5OTE1Njg2OH0.jFzfeVow0P-46Vj7G-yTVjA1IHp8UN-Ts8Us719rYmE";
export const SB_SERVICE = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
export const NOTIFY_SECRET = String(process.env.NOTIFY_SECRET || "").trim();

export const PROVIDER = String(process.env.MAIL_PROVIDER || "").toLowerCase().trim();
export const MAIL_FROM = String(process.env.MAIL_FROM || "").trim();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const BREVO_API_KEY = String(process.env.BREVO_API_KEY || "").trim();

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const enc = encodeURIComponent;
const MAX_ATTACH = 100 * 1024;

export const providerKey = () => (PROVIDER === "resend" ? RESEND_API_KEY : PROVIDER === "brevo" ? BREVO_API_KEY : "");
export const fromAddress = () => { const m = MAIL_FROM.match(/<([^>]+)>/); return (m ? m[1] : MAIL_FROM).trim(); };

/* Skydd mot header-injection. */
export const clean = (v, max) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").replace(/["<>]/g, "").trim().slice(0, max);
export const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
export const renderTpl = (t, vars) => String(t || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));

export function configProblem() {
  if (!PROVIDER) return "MAIL_PROVIDER saknas (sätt 'brevo' eller 'resend').";
  if (PROVIDER !== "brevo" && PROVIDER !== "resend") return "MAIL_PROVIDER måste vara 'brevo' eller 'resend'.";
  if (!providerKey()) return (PROVIDER === "brevo" ? "BREVO_API_KEY" : "RESEND_API_KEY") + " saknas.";
  if (!MAIL_FROM) return "MAIL_FROM saknas.";
  if (!EMAIL_RE.test(fromAddress())) return "MAIL_FROM är ingen giltig adress.";
  return null;
}

export function providerHint(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("key not found") || m.includes("unauthorized") || m.includes("api key is invalid") || m.includes("invalid api key"))
    return "Leverantören nekar API-nyckeln. I Brevo: hämta en API-nyckel v3 under SMTP & API → API keys (börjar med 'xkeysib-') — en SMTP-nyckel fungerar inte här.";
  if (m.includes("sender") && (m.includes("not valid") || m.includes("not found") || m.includes("verif")))
    return "Avsändaradressen (MAIL_FROM) är inte verifierad hos leverantören. Lägg till och verifiera den under Senders i Brevo.";
  if (m.includes("domain") && m.includes("verif")) return "Avsändardomänen är inte verifierad hos leverantören.";
  return String(msg || "Leverantörsfel");
}

export async function providerProblem() {
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

export async function supabaseOk() {
  try { const r = await fetch(SB_URL + "/auth/v1/settings", { headers: { apikey: SB_KEY } }); return r.ok; } catch (e) { return false; }
}

export async function verifyUser(token) {
  try {
    const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: "Bearer " + token } });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d && d.id ? d : null;
  } catch (e) { return null; }
}

/* Läser med anroparens token (RLS gäller). */
export async function sbRest(path, token) {
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: { apikey: SB_KEY, Authorization: "Bearer " + (token || SB_KEY) } });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { return null; }
}

/* Server-läsning med service-nyckel (kringgår RLS — används bara i schemalagda jobb). */
export async function sbAdmin(path) {
  if (!SB_SERVICE) return null;
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE } });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) { return null; }
}
/* Returnerar "ok" | "duplicate" | "error". Unikt index hindrar dubbelutskick. */
export async function sbAdminInsert(table, row) {
  if (!SB_SERVICE) return "error";
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (r.status === 409) return "duplicate";
    return r.ok ? "ok" : "error";
  } catch (e) { return "error"; }
}
export async function sbAdminPatch(table, filter, row) {
  if (!SB_SERVICE) return false;
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + table + "?" + filter, {
      method: "PATCH",
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    return r.ok;
  } catch (e) { return false; }
}

/* Auditlogg — varje kansslig superadmin-atgard registreras server-side. */
export async function audit(actor, action, target, meta) {
  return sbAdminInsert("audit_log", {
    actor_id: actor && actor.id, actor_email: actor && actor.email,
    action, target: target == null ? null : String(target), meta: meta || null,
  });
}

export async function sbAdminDelete(table, filter) {
  if (!SB_SERVICE) return false;
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + table + "?" + filter, { method: "DELETE", headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, Prefer: "return=minimal" } });
    return r.ok;
  } catch (e) { return false; }
}

export function validAttachment(a) {
  if (!a) return null;
  if (typeof a !== "object") return { error: "Ogiltig bilaga." };
  const name = clean(a.name, 60);
  const content = String(a.content || "");
  if (!/^[\w-]+\.ics$/i.test(name)) return { error: "Endast kalenderfiler (.ics) får bifogas." };
  if (!content || !/^[A-Za-z0-9+/=]+$/.test(content)) return { error: "Bilagan är inte korrekt kodad." };
  if (content.length > MAX_ATTACH) return { error: "Bilagan är för stor." };
  return { name, content };
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

/* Enda vägen ut för all e-post. */
export async function sendProvider({ fromName, to, subject, text, replyTo, attachment }) {
  const problem = configProblem();
  if (problem) return { ok: false, error: problem };
  const name = clean(fromName, 80) || "Rekyl";
  const addr = fromAddress();
  return PROVIDER === "resend"
    ? sendViaResend({ from: name + " <" + addr + ">", to, subject, text, replyTo, attachment })
    : sendViaBrevo({ fromName: name, fromEmail: addr, to, subject, text, replyTo, attachment });
}

/* ---- Intervjupåminnelser (24 h innan) ---- */
const REMIND_MIN_H = 23, REMIND_MAX_H = 25;

export async function runReminders(orgId) {
  if (!SB_SERVICE) return { error: "SUPABASE_SERVICE_ROLE_KEY saknas — påminnelser kan inte läsa organisationernas data." };
  const problem = configProblem();
  if (problem) return { error: problem };
  const rows = await sbAdmin("org_state?select=org_id,data" + (orgId ? "&org_id=eq." + enc(orgId) : ""));
  if (!rows) return { error: "Kunde inte läsa org_state (kontrollera SUPABASE_SERVICE_ROLE_KEY)." };

  const now = Date.now();
  const lo = now + REMIND_MIN_H * 3600e3;
  const hi = now + REMIND_MAX_H * 3600e3;
  let sent = 0, skipped = 0;
  const errors = [];

  for (const row of rows) {
    const st = (row && row.data) || {};
    const org = st.org || {};
    const cands = Array.isArray(st.candidates) ? st.candidates : [];
    const jobs = Array.isArray(st.jobs) ? st.jobs : [];
    const tpl = (Array.isArray(st.templates) ? st.templates : []).find((x) => x.trigger === "interview_reminder" && x.active);

    for (const c of cands) {
      const iv = c && c.interview;
      if (!iv || !iv.at || iv.cancelled) continue;
      const t = new Date(iv.at).getTime();
      if (!(t >= lo && t <= hi)) continue;
      if (!EMAIL_RE.test(String(c.email || ""))) { skipped++; continue; }

      const kind = "interview_24h:" + (iv.seq || 0);
      const mark = await sbAdminInsert("reminders_sent", { org_id: row.org_id, candidate_id: c.id, kind });
      if (mark === "duplicate") { skipped++; continue; }
      if (mark === "error") { errors.push("Kunde inte registrera påminnelse för " + c.email); continue; }

      const job = jobs.find((j) => j.id === c.jobId) || {};
      const vars = {
        candidateName: c.name || "", jobTitle: job.title || "tjänsten", companyName: org.companyName || "",
        hrName: org.hrName || "", hrEmail: org.hrEmail || "", interviewTime: c.interviewTime || "",
      };
      const subject = tpl ? renderTpl(tpl.subject, vars) : "Påminnelse: intervju imorgon - " + vars.jobTitle;
      const text = tpl ? renderTpl(tpl.body, vars)
        : "Hej " + vars.candidateName + ",\n\nEn vänlig påminnelse om din intervju för " + vars.jobTitle + " hos " + vars.companyName + ".\n\nTid: " + vars.interviewTime + "\n\nHör av dig om något har kommit emellan.\n\nVänliga hälsningar,\n" + vars.hrName + "\n" + vars.companyName;

      const res = await sendProvider({ fromName: org.companyName, to: c.email, subject, text, replyTo: org.hrEmail });
      if (res.ok) sent++;
      else {
        /* Utskicket misslyckades — ta bort markeringen så att nästa körning försöker igen. */
        await sbAdminDelete("reminders_sent", "candidate_id=eq." + enc(c.id) + "&kind=eq." + enc(kind));
        errors.push(c.email + ": " + res.error);
      }
    }
  }
  return { sent, skipped, errors };
}
