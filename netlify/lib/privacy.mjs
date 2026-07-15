/* Rekyl — Fas 3C: server-side integritetsmotor (ren logik + I/O-orkestrering).
 *
 * Kandidater lever i org_state.data-blobben. Denna modul innehåller:
 *  - PURA transformationer (anonymisering, exportvitlista, raderingskontroll, retention)
 *    som är deterministiska och enhetstestbara utan nätverk.
 *  - I/O-hjälpare (rev-låst blob-sparning, storage-uppladdning/signering) som använder
 *    service-nyckeln och bara får anropas efter server-verifierad behörighet.
 *
 * All destruktiv behandling är idempotent (idempotency_key + flaggor i blobben) och
 * lämnar spårbara jobb + audit. Delvis fel döljs aldrig — de rapporteras per mål.
 */

import {
  SB_URL, SB_SERVICE, enc, sbAdmin, sbAdminInsert, sbAdminPatch, sbAdminDelete,
} from "./mail.mjs";

/* ---- Behörighet (auktoritativ, speglar SQL privacy_role_can) ---- */
const PRIV = {
  view: ["admin", "recruiter", "manager"],
  view_sensitive: ["admin", "recruiter"],
  manage_consents: ["admin", "recruiter"],
  edit_retention: ["admin"],
  manage_requests: ["admin", "recruiter"],
  verify_identity: ["admin", "recruiter"],
  create_export: ["admin", "recruiter"],
  view_export: ["admin"],
  correct_data: ["admin", "recruiter"],
  restrict: ["admin", "recruiter"],
  anonymize: ["admin"],
  delete: ["admin"],
  legal_hold: ["admin"],
  view_access_log: ["admin"],
};
export function roleCan(role, action) { return (PRIV[action] || []).includes(String(role || "")); }

/* ---- Små rena hjälpare ---- */
export const isFileAnswer = (v) => v && typeof v === "object" && typeof v.url === "string" && v.url.length > 0;
export function cvPathFromUrl(url) {
  // Publik URL: .../storage/v1/object/public/cv/<path>. Extrahera <path>.
  const m = String(url || "").match(/\/object\/(?:public\/)?cv\/(.+)$/);
  return m ? decodeURIComponent(m[1].split("?")[0]) : null;
}
const REDACT = "[borttaget]";
const isPlainObj = (o) => o && typeof o === "object" && !Array.isArray(o);

/* Fält i answers som räknas som fritext/PII och ska maskas vid anonymisering. */
function scrubAnswers(answers) {
  const out = {}; const removedFiles = [];
  for (const [k, v] of Object.entries(answers || {})) {
    if (isFileAnswer(v)) { const p = cvPathFromUrl(v.url); if (p) removedFiles.push(p); continue; } // dokument tas bort helt
    if (typeof v === "string") { out[k] = v.trim() === "" ? v : REDACT; }
    else if (typeof v === "number" || typeof v === "boolean") { out[k] = v; } // numeriska/booleska svar bevaras för anonym statistik
    else if (Array.isArray(v)) { out[k] = v.map((x) => (typeof x === "string" ? REDACT : x)); }
    else if (isPlainObj(v)) { out[k] = REDACT; }
    else out[k] = v;
  }
  return { answers: out, removedFiles };
}

/* -----------------------------------------------------------------------------
 * ANONYMISERING (ren): tar en kandidat + kontext och returnerar den anonymiserade
 * kandidaten, filer att radera, samt per-mål-resultat och vad som bevarades.
 * Idempotent: en redan anonymiserad kandidat (_anon) returneras oförändrad.
 * --------------------------------------------------------------------------- */
export function anonymizeCandidate(cand, ctx = {}) {
  const targets = {};
  const preserved = {};
  if (!cand) return { candidate: cand, files: [], targets, preserved, alreadyDone: false, changed: false };
  if (cand._anon) {
    return { candidate: cand, files: [], targets: { candidate: "already" }, preserved, alreadyDone: true, changed: false };
  }
  const anonId = "anon_" + String(cand.id || "").replace(/[^a-zA-Z0-9_]/g, "").slice(-10);
  const { answers, removedFiles } = scrubAnswers(cand.answers);
  const c = { ...cand };

  // Profil / kontaktpunkter
  c.name = "Anonymiserad kandidat"; targets.profile_name = "anonymized";
  c.email = null; c.phone = null; targets.contact = "removed";
  c.personId = null; c.linkedin = undefined; c.address = undefined; c.city = undefined; c.birth = undefined;

  // Formulärsvar (dokument tas bort, fritext maskas, numeriskt bevaras för statistik)
  c.answers = answers; targets.answers = "redacted";
  targets.documents = removedFiles.length ? "removed:" + removedFiles.length : "none";

  // Fritext-underlag som kan innehålla identifierande text
  if (Array.isArray(c.comments)) { c.comments = c.comments.map((x) => ({ ...x, text: REDACT, by: REDACT })); targets.comments = "redacted"; }
  if (Array.isArray(c.timeline)) {
    c.timeline = c.timeline.map((t) => ({ ...t, detail: scrubTimelineDetail(t.detail), actor: REDACT }));
    targets.timeline = "redacted";
  }
  c.reason = c.reason ? REDACT : c.reason;
  if (c.notes) c.notes = REDACT;
  if (c.portal) { c.portal = { ...c.portal, revoked: true }; targets.portal = "revoked"; }

  // Pooler: ta bort medlemskap (personuppgift)
  if (Array.isArray(c.pools)) { preserved.poolsCount = c.pools.length; c.pools = []; targets.pools = "removed"; }

  // Interna bedömningar (poäng/knockout) bevaras som anonym statistik: siffror utan identitet
  // (de innehåller inga direkta personuppgifter — endast beräknade tal). Behåll för statistik.
  preserved.scoreKept = typeof c.total === "number";

  c._anon = true;
  c._anonAt = ctx.now || null;
  c._anonBy = ctx.actorEmail || null;
  c._anonId = anonId;
  targets.candidate = "anonymized";

  return { candidate: c, files: removedFiles, targets, preserved, alreadyDone: false, changed: true };
}
function scrubTimelineDetail(detail) {
  // Behåll händelsetypens struktur men ta bort fritext efter kolon (kan innehålla namn/e-post)
  const s = String(detail || "");
  if (!s) return s;
  return s.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, REDACT); // maska ev. e-postadresser
}

/* Anonymisering av meddelanden till/från kandidaten (körs på state.messages). */
export function anonymizeMessages(messages, candId) {
  let changed = 0;
  const out = (messages || []).map((m) => {
    if (m && m.candidateId === candId) {
      changed++;
      return { ...m, to: null, body: REDACT, subject: m.subject ? REDACT : m.subject };
    }
    return m;
  });
  return { messages: out, changed };
}

/* -----------------------------------------------------------------------------
 * EXPORT (ren vitlista): bygger kandidatvänligt registerutdrag.
 * Vitlista — allt som inte uttryckligen tas med kommer aldrig ut.
 * Intern data (poäng, knockout, bedömningar, andra personers uppgifter, interna
 * anteckningar) exkluderas om inte policy uttryckligen tillåter.
 * --------------------------------------------------------------------------- */
export function buildExportPayload(state, cand, consents, policy = {}) {
  const job = (state.jobs || []).find((j) => j.id === cand.jobId) || {};
  const includeDocs = policy.includeDocuments !== false;
  const includeComms = policy.includeCommunication !== false;
  const includeInternal = policy.includeInternalNotes === true; // default: nej

  const answers = {};
  for (const [k, v] of Object.entries(cand.answers || {})) {
    if (isFileAnswer(v)) continue; // dokument listas separat
    answers[k] = v;
  }
  const documents = includeDocs
    ? Object.values(cand.answers || {}).filter(isFileAnswer).map((v) => ({ name: v.name || "Bilaga", url: v.url }))
    : [];
  const messages = includeComms
    ? (state.messages || []).filter((m) => m.candidateId === cand.id && m.status === "sent" && m.channel !== "note")
        .map((m) => ({ at: m.sentAt || m.at, subject: m.subject, body: m.body }))
    : [];
  const consentList = (consents || []).map((x) => ({
    area: x.area, purpose: x.purpose, lawful_basis: x.lawful_basis, status: x.status,
    given_at: x.given_at, withdrawn_at: x.withdrawn_at, expires_at: x.expires_at, version: x.definition_version, lang: x.lang,
  }));
  const historyFriendly = (cand.timeline || [])
    .filter((t) => ["application_received", "interview_booked", "message_delivered", "status_change", "hired"].includes(t.kind))
    .map((t) => ({ at: t.at, event: t.kind }));

  const payload = {
    exportType: "candidate_data_export",
    generatedAt: policy.now || null,
    organization: state.org && state.org.companyName ? state.org.companyName : null,
    profile: { name: cand.name, email: cand.email, phone: cand.phone || null, source: cand.source || null },
    application: { jobTitle: job.publicTitle || job.title || null, jobRef: job.ref || null, appliedAt: cand.appliedAt || cand.at || null, answers },
    documents,
    communication: messages,
    consents: consentList,
    talentPools: Array.isArray(cand.pools) ? cand.pools.slice() : [],
    processHistory: historyFriendly,
  };
  if (includeInternal) payload.internalNotes = (cand.comments || []).map((c) => ({ at: c.at, text: c.text }));
  return payload;
}

/* -----------------------------------------------------------------------------
 * RADERINGSKONTROLL (ren): avgör om radering får ske och vad som blockerar.
 * --------------------------------------------------------------------------- */
export function deletionPrecheck(state, cand, ctx = {}) {
  const reasons = [];
  const plan = { delete: [], anonymize: [], preserve: [] };
  if (!cand) { return { blocked: true, reasons: ["Kandidaten finns inte."], plan }; }

  if (ctx.legalHold) reasons.push("Legal hold är aktiv — radering blockeras tills den hävs.");
  if (ctx.openErasureElsewhere) reasons.push("Ett annat aktivt raderingsjobb finns för kandidaten.");
  if (ctx.activeExports) reasons.push("Ett aktivt exportpaket finns — återkalla det först.");

  // Anställningsrelaterad koppling: anställd kandidat kräver bevarande enligt lag
  const stageType = ctx.stageType || cand.status;
  if (stageType === "hired" || cand.hired) {
    reasons.push("Kandidaten är anställd — anställningsrelaterad data måste bevaras enligt rättslig skyldighet.");
    plan.preserve.push("Anställningsrelaterad grunddata (juridisk skyldighet)");
  }
  // Aktiv rekryteringsprocess: kandidat i icke-slutligt steg
  const FINAL = ["rejected", "withdrawn", "reserve", "hired"];
  if (!FINAL.includes(stageType)) {
    reasons.push("Kandidaten är i en aktiv rekryteringsprocess — avsluta processen först eller anonymisera i stället.");
  }
  if (ctx.legalObligationDays && ctx.sinceCloseDays != null && ctx.sinceCloseDays < ctx.legalObligationDays) {
    reasons.push("Rättslig skyldighet kräver bevarande i " + ctx.legalObligationDays + " dagar (" + ctx.sinceCloseDays + " har gått).");
  }

  const blocked = reasons.length > 0;
  if (!blocked) {
    plan.delete.push("Kandidatprofil, kontaktuppgifter, formulärsvar, dokument");
    plan.delete.push("Kandidatens meddelanden och portalprojektion");
    if (String(cand.id).indexOf("sb_") === 0) plan.delete.push("Ansökningsrad i applications-tabellen");
    plan.anonymize.push("Aktivitetslogg maskas (händelsetyper bevaras utan identitet)");
    plan.preserve.push("Anonym statistik och revisionsspår utan identifierande innehåll");
  }
  return { blocked, reasons, plan };
}

/* -----------------------------------------------------------------------------
 * RETENTION (ren): beräknar förfallodatum och status för en kandidat mot en
 * versionshanterad retentionregel.
 * --------------------------------------------------------------------------- */
export function startPointDate(cand, startPoint) {
  const g = (v) => { if (v == null || v === "") return null; const t = new Date(v).getTime(); return Number.isNaN(t) ? null : t; };
  switch (startPoint) {
    case "application_received": return g(cand.appliedAt ?? cand.at);
    case "process_closed": return g(cand.closedAt ?? cand.decidedAt ?? cand.appliedAt ?? cand.at);
    case "last_activity": return g(cand.updatedAt ?? cand.lastActivity ?? cand.appliedAt ?? cand.at);
    case "consent_given": return g(cand.consentAt);
    case "hire_date": return g(cand.hiredAt ?? cand.closedAt);
    default: return g(cand.appliedAt ?? cand.at);
  }
}
export function evaluateCandidateRetention(cand, ver, ctx = {}) {
  const now = ctx.now || 0;
  const base = startPointDate(cand, ver.start_point);
  if (base == null) return { due_at: null, status: "no_basis", reason: "Saknar startpunkt (" + ver.start_point + ").", action: null };
  const dueMs = base + Number(ver.retention_days) * 864e5;
  const warnMs = dueMs - Number(ver.warn_before_days || 0) * 864e5;
  if (ctx.legalHold) return { due_at: iso(dueMs), status: "hold", reason: "Legal hold aktiv.", action: null };
  if (ctx.paused) return { due_at: iso(dueMs), status: "paused", reason: "Retention pausad.", action: null };
  let status = "ok";
  if (now >= dueMs) status = ver.action_on_expiry === "manual_review" ? "manual_review" : "expired";
  else if (now >= warnMs) status = "warning";
  return { due_at: iso(dueMs), status, reason: null, action: status === "expired" || status === "manual_review" ? ver.action_on_expiry : null };
}
function iso(ms) { return ms == null ? null : new Date(ms).toISOString(); }

/* -----------------------------------------------------------------------------
 * I/O — rev-låst blob-sparning (optimistisk låsning som klienten använder).
 * Läser org_state, applicerar mutate(data), sparar villkorat på rev. Retry vid krock.
 * --------------------------------------------------------------------------- */
export async function withOrgState(orgId, mutate, tries = 4) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const rows = await sbAdmin("org_state?org_id=eq." + enc(orgId) + "&select=data,rev");
    if (!rows || !rows[0]) return { ok: false, error: "Kunde inte läsa org_state." };
    const cur = rows[0];
    const data = cur.data || {};
    const rev = Number(cur.rev || 0);
    let out;
    try { out = mutate(data); } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
    if (out && out.abort) return { ok: true, aborted: true, info: out.info };
    const next = rev + 1;
    const r = await fetch(SB_URL + "/rest/v1/org_state?org_id=eq." + enc(orgId) + "&rev=eq." + rev, {
      method: "PATCH",
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ data, rev: next, updated_at: new Date().toISOString() }),
    });
    if (r.ok) {
      const body = await r.json().catch(() => []);
      if (Array.isArray(body) && body.length) return { ok: true, info: out && out.info, rev: next };
      // 0 rader = rev-krock, försök igen
    }
  }
  return { ok: false, error: "Kunde inte spara — konflikt kvarstod efter flera försök." };
}

/* Storage: ladda upp export privat och skapa signerad, tidsbegränsad länk. */
export async function uploadExport(bucket, path, jsonText) {
  const r = await fetch(SB_URL + "/storage/v1/object/" + bucket + "/" + path, {
    method: "POST",
    headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json", "x-upsert": "true" },
    body: jsonText,
  });
  return r.ok;
}
export async function signExport(bucket, path, expiresInSec) {
  const r = await fetch(SB_URL + "/storage/v1/object/sign/" + bucket + "/" + path, {
    method: "POST",
    headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresInSec }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || !d.signedURL) return null;
  return SB_URL + "/storage/v1" + d.signedURL;
}
export async function deleteExportObject(bucket, path) {
  const r = await fetch(SB_URL + "/storage/v1/object/" + bucket + "/" + path, {
    method: "DELETE", headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE },
  });
  return r.ok;
}

/* Server-side audit + åtkomstlogg + integritetshändelse (service-nyckel, oberoende av RLS). */
export async function serverAccessLog(orgId, actor, candId, action, resource, result, reason, meta) {
  return sbAdminInsert("sensitive_access_logs", {
    org_id: orgId, actor_id: actor && actor.id, actor_email: actor && actor.email,
    candidate_id: candId, action, resource: resource || null, result: result || "allowed",
    reason: reason || null, meta: meta || null,
  });
}
export async function serverPrivacyEvent(orgId, actor, candId, entity, entityId, kind, detail, meta) {
  return sbAdminInsert("privacy_events", {
    org_id: orgId, candidate_id: candId, entity, entity_id: entityId == null ? null : String(entityId),
    kind, actor_id: actor && actor.id, actor_email: actor && actor.email, detail: detail || null, meta: meta || null,
  });
}

export { sbAdmin, sbAdminInsert, sbAdminPatch, sbAdminDelete };
