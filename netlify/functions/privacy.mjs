/* Rekyl — Fas 3C: integritetsmotorns API (server-verifierad, idempotent).
 *
 * En väg in för de tunga, destruktiva eller bevisbärande operationerna som ALDRIG
 * får ske enbart på klienten: registerutdrag (export), anonymisering, radering och
 * retention-utvärdering. Behörigheten verifieras server-side med service-nyckeln
 * (token -> members -> roll), precis som superadmin-API:t. Klienten kan bara BEGÄRA.
 *
 * POST + Authorization: Bearer <supabase-token>
 * Body: { action, ... }
 *
 * Miljövariabler: SUPABASE_SERVICE_ROLE_KEY (krävs), SUPABASE_URL/ANON (fallback finns).
 * Storage: en PRIVAT bucket "exports" krävs (se deploy-instruktionerna).
 */

import crypto from "node:crypto";
import {
  SB_URL, SB_SERVICE, enc, clean, json, verifyUser,
} from "../lib/mail.mjs";
import {
  roleCan, anonymizeCandidate, anonymizeMessages, buildExportPayload, deletionPrecheck,
  evaluateCandidateRetention, cvPathFromUrl, isFileAnswer,
  withOrgState, uploadExport, signExport, deleteExportObject,
  serverAccessLog, serverPrivacyEvent,
  sbAdmin, sbAdminInsert, sbAdminPatch,
} from "../lib/privacy.mjs";

const EXPORT_BUCKET = "exports";
const EXPORT_TTL_SEC = 72 * 3600;         // signerad länk giltig 72 h
const token = () => crypto.randomBytes(24).toString("hex"); // 48 tecken, oförutsägbar

/* ---- Behörighetsgrind ---- */
async function gate(req) {
  if (!SB_SERVICE) return { err: json(503, { error: "SUPABASE_SERVICE_ROLE_KEY saknas på servern." }) };
  const auth = req.headers.get("authorization") || "";
  const tk = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!tk) return { err: json(401, { error: "Saknar sessionstoken." }) };
  const user = await verifyUser(tk);
  if (!user) return { err: json(401, { error: "Ogiltig eller utgången session." }) };
  const rows = await sbAdmin("members?user_id=eq." + enc(user.id) + "&select=org_id,role,email");
  const m = rows && rows[0];
  if (!m || !m.org_id) return { err: json(403, { error: "Kontot tillhör ingen organisation." }) };
  return { user: { id: user.id, email: m.email || user.email }, orgId: m.org_id, role: m.role || "viewer" };
}

/* ---- Hjälp: hämta kandidat ur blobben ---- */
function findCand(data, id) {
  const cands = Array.isArray(data && data.candidates) ? data.candidates : [];
  return cands.find((c) => String(c.id) === String(id)) || null;
}
function stageTypeOf(data, cand) {
  const job = (data.jobs || []).find((j) => j.id === cand.jobId);
  if (job && job.pipeline && cand.stageId) {
    const st = (job.pipeline.stages || []).find((s) => s.id === cand.stageId);
    if (st && st.type) return st.type;
  }
  const map = { new: "review", shortlist: "shortlist", interview: "interview", reserve: "reserve", reject: "rejected", hired: "hired" };
  return map[cand.status] || cand.status || "review";
}

/* ======================= AKTIONER ======================= */

/* Registerutdrag: bygg vitlistad payload, ladda upp privat, signera tidsbegränsat. */
async function doExport(g, p) {
  if (!roleCan(g.role, "create_export")) return json(403, { error: "Behörighet saknas för export." });
  const candId = clean(p.candidate_id, 80);
  if (!candId) return json(400, { error: "candidate_id saknas." });
  const idem = clean(p.idempotency_key, 120) || ("exp_" + candId + "_" + (clean(p.request_id, 60) || "adhoc"));

  // Idempotens: finns redan ett giltigt paket för nyckeln?
  const existing = await sbAdmin("data_exports?org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem) + "&select=*");
  if (existing && existing[0] && existing[0].status === "completed" && !existing[0].revoked) {
    const url = await signExport(EXPORT_BUCKET, existing[0].storage_path, EXPORT_TTL_SEC);
    return json(200, { ok: true, idempotent: true, export_id: existing[0].id, token: existing[0].token, url, expires_at: existing[0].expires_at });
  }

  const rows = await sbAdmin("org_state?org_id=eq." + enc(g.orgId) + "&select=data");
  const data = rows && rows[0] && rows[0].data;
  if (!data) return json(503, { error: "Kunde inte läsa organisationens data." });
  const cand = findCand(data, candId);
  if (!cand) return json(404, { error: "Kandidaten finns inte." });

  const consents = await sbAdmin("candidate_consents?org_id=eq." + enc(g.orgId) + "&candidate_id=eq." + enc(candId) + "&select=area,purpose,lawful_basis,status,given_at,withdrawn_at,expires_at,definition_version,lang") || [];
  const payload = buildExportPayload(data, cand, consents, { now: new Date().toISOString(), ...(p.policy || {}) });
  const jsonText = JSON.stringify({ ...payload, _meta: { token: null, requestId: p.request_id || null } }, null, 2);

  const tk = token();
  const path = g.orgId + "/" + tk + ".json";
  const expiresAt = new Date(Date.now() + EXPORT_TTL_SEC * 1000).toISOString();

  // Skapa jobbrad (running) — unik på (org, idem)
  const insert = await sbAdminInsert("data_exports", {
    org_id: g.orgId, candidate_id: candId, request_id: p.request_id || null, status: "running",
    token: tk, storage_path: path, format: "json", scope: payload.__scope || {}, policy: p.policy || {},
    expires_at: expiresAt, idempotency_key: idem, created_by: g.user.id, started_at: new Date().toISOString(),
  });
  if (insert === "duplicate") {
    const again = await sbAdmin("data_exports?org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem) + "&select=*");
    const row = again && again[0];
    if (row && row.status === "completed") { const url = await signExport(EXPORT_BUCKET, row.storage_path, EXPORT_TTL_SEC); return json(200, { ok: true, idempotent: true, export_id: row.id, token: row.token, url, expires_at: row.expires_at }); }
    return json(409, { error: "Ett exportjobb pågår redan för samma nyckel." });
  }
  if (insert !== "ok") return json(502, { error: "Kunde inte skapa exportjobbet." });

  const up = await uploadExport(EXPORT_BUCKET, path, jsonText);
  if (!up) {
    await sbAdminPatch("data_exports", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem), { status: "failed", error: "Uppladdning misslyckades (kontrollera att den privata bucketen 'exports' finns)." });
    return json(502, { error: "Kunde inte lagra exportpaketet. Skapa en privat storage-bucket 'exports'." });
  }
  const size = Buffer.byteLength(jsonText);
  const sha = crypto.createHash("sha256").update(jsonText).digest("hex");
  await sbAdminPatch("data_exports", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem),
    { status: "completed", size_bytes: size, sha256: sha, progress: 100, finished_at: new Date().toISOString() });

  await serverAccessLog(g.orgId, g.user, candId, "create_export", "export:" + tk, "allowed", "Skapade registerutdrag");
  await serverPrivacyEvent(g.orgId, g.user, candId, "export", tk, "export_created", "Registerutdrag skapat");
  const url = await signExport(EXPORT_BUCKET, path, EXPORT_TTL_SEC);
  return json(200, { ok: true, export_id: idem, token: tk, url, expires_at: expiresAt, size_bytes: size, sha256: sha });
}

async function doRevokeExport(g, p) {
  if (!roleCan(g.role, "view_export")) return json(403, { error: "Behörighet saknas." });
  const tk = clean(p.token, 120);
  const rows = await sbAdmin("data_exports?org_id=eq." + enc(g.orgId) + "&token=eq." + enc(tk) + "&select=*");
  const row = rows && rows[0];
  if (!row) return json(404, { error: "Exporten finns inte." });
  if (row.storage_path) await deleteExportObject(EXPORT_BUCKET, row.storage_path);
  await sbAdminPatch("data_exports", "id=eq." + enc(row.id), { revoked: true, status: "cancelled" });
  await serverAccessLog(g.orgId, g.user, row.candidate_id, "revoke_export", "export:" + tk, "allowed", "Återkallade export");
  await serverPrivacyEvent(g.orgId, g.user, row.candidate_id, "export", tk, "export_revoked", null);
  return json(200, { ok: true });
}

/* Anonymisering: atomisk mot blobben, idempotent via idempotency_key + _anon-flagga. */
async function doAnonymize(g, p) {
  if (!roleCan(g.role, "anonymize")) return json(403, { error: "Behörighet saknas för anonymisering." });
  const candId = clean(p.candidate_id, 80);
  if (!candId) return json(400, { error: "candidate_id saknas." });
  const idem = clean(p.idempotency_key, 120) || ("anon_" + candId);

  const insert = await sbAdminInsert("anonymization_jobs", {
    org_id: g.orgId, candidate_id: candId, request_id: p.request_id || null, status: "running",
    idempotency_key: idem, scope: p.scope || {}, created_by: g.user.id, started_at: new Date().toISOString(),
  });
  if (insert === "duplicate") {
    const again = await sbAdmin("anonymization_jobs?org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem) + "&select=*");
    const row = again && again[0];
    if (row && (row.status === "completed" || row.status === "partial")) return json(200, { ok: true, idempotent: true, job: row });
    return json(409, { error: "Ett anonymiseringsjobb pågår redan." });
  }
  if (insert !== "ok") return json(502, { error: "Kunde inte skapa anonymiseringsjobbet." });

  // Legal hold blockerar
  const holds = await sbAdmin("legal_holds?org_id=eq." + enc(g.orgId) + "&candidate_id=eq." + enc(candId) + "&status=eq.active&select=id");
  if (holds && holds.length) {
    await sbAdminPatch("anonymization_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem), { status: "blocked", blocked_reason: "Legal hold aktiv." });
    return json(409, { error: "Legal hold är aktiv — anonymisering blockeras." });
  }

  let filesToDelete = []; let targets = {}; let preserved = {}; let already = false;
  const save = await withOrgState(g.orgId, (data) => {
    const cand = findCand(data, candId);
    if (!cand) throw new Error("Kandidaten finns inte.");
    const res = anonymizeCandidate(cand, { now: new Date().toISOString(), actorEmail: g.user.email });
    targets = res.targets; preserved = res.preserved; filesToDelete = res.files; already = res.alreadyDone;
    if (!res.changed) return { abort: true, info: { already: true } };
    const idx = data.candidates.findIndex((c) => String(c.id) === String(candId));
    data.candidates[idx] = res.candidate;
    const mm = anonymizeMessages(data.messages, candId);
    data.messages = mm.messages; targets.messages = "redacted:" + mm.changed;
    return { info: { changed: true } };
  });
  if (!save.ok) {
    await sbAdminPatch("anonymization_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem), { status: "failed", error: save.error });
    return json(502, { error: save.error });
  }

  // Radera CV-filer (delvis fel döljs inte)
  const fileResults = {};
  for (const path of filesToDelete) {
    const ok = await deleteCv(path);
    fileResults[path] = ok ? "deleted" : "failed";
  }
  const anyFail = Object.values(fileResults).some((v) => v === "failed");
  const finalStatus = anyFail ? "partial" : "completed";

  await sbAdminPatch("anonymization_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem),
    { status: finalStatus, progress: 100, targets: { ...targets, files: fileResults }, preserved, finished_at: new Date().toISOString(),
      error: anyFail ? "Vissa dokument kunde inte raderas ur storage." : null });
  await serverAccessLog(g.orgId, g.user, candId, "anonymize", "candidate:" + candId, "allowed", already ? "Redan anonymiserad" : "Anonymiserade kandidat");
  await serverPrivacyEvent(g.orgId, g.user, candId, "anonymization", idem, already ? "anon_noop" : "anon_completed", null, { targets: { ...targets, files: fileResults } });
  return json(200, { ok: true, status: finalStatus, already, targets: { ...targets, files: fileResults }, preserved });
}

/* Radering: precheck -> blockera eller radera. Idempotent (kandidat borta = klart). */
async function doDelete(g, p) {
  if (!roleCan(g.role, "delete")) return json(403, { error: "Behörighet saknas för radering." });
  const candId = clean(p.candidate_id, 80);
  if (!candId) return json(400, { error: "candidate_id saknas." });
  const idem = clean(p.idempotency_key, 120) || ("del_" + candId);

  const insert = await sbAdminInsert("deletion_jobs", {
    org_id: g.orgId, candidate_id: candId, request_id: p.request_id || null, status: "running",
    idempotency_key: idem, created_by: g.user.id, started_at: new Date().toISOString(),
  });
  if (insert === "duplicate") {
    const again = await sbAdmin("deletion_jobs?org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem) + "&select=*");
    const row = again && again[0];
    if (row && (row.status === "completed" || row.status === "blocked")) return json(200, { ok: row.status === "completed", idempotent: true, job: row });
    return json(409, { error: "Ett raderingsjobb pågår redan." });
  }
  if (insert !== "ok") return json(502, { error: "Kunde inte skapa raderingsjobbet." });

  const rows = await sbAdmin("org_state?org_id=eq." + enc(g.orgId) + "&select=data");
  const data0 = rows && rows[0] && rows[0].data;
  const cand0 = data0 && findCand(data0, candId);
  if (!cand0) {
    await sbAdminPatch("deletion_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem), { status: "completed", progress: 100, result: { note: "Kandidaten fanns inte (redan borta)." }, finished_at: new Date().toISOString() });
    return json(200, { ok: true, already: true });
  }

  const holds = await sbAdmin("legal_holds?org_id=eq." + enc(g.orgId) + "&candidate_id=eq." + enc(candId) + "&status=eq.active&select=id");
  const exps = await sbAdmin("data_exports?org_id=eq." + enc(g.orgId) + "&candidate_id=eq." + enc(candId) + "&revoked=eq.false&status=eq.completed&select=id");
  const ctx = {
    legalHold: !!(holds && holds.length),
    activeExports: !!(exps && exps.length),
    stageType: stageTypeOf(data0, cand0),
  };
  const pre = deletionPrecheck(data0, cand0, ctx);
  if (pre.blocked) {
    await sbAdminPatch("deletion_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem),
      { status: "blocked", blocked_reason: pre.reasons.join(" "), precheck: ctx, plan: pre.plan, finished_at: new Date().toISOString() });
    await serverAccessLog(g.orgId, g.user, candId, "delete", "candidate:" + candId, "denied", pre.reasons.join(" "));
    return json(409, { error: "Radering blockerad.", reasons: pre.reasons, plan: pre.plan });
  }

  // Samla filer först, radera sedan ur blobben atomiskt
  const files = Object.values(cand0.answers || {}).filter(isFileAnswer).map((v) => cvPathFromUrl(v.url)).filter(Boolean);
  const save = await withOrgState(g.orgId, (data) => {
    const idx = (data.candidates || []).findIndex((c) => String(c.id) === String(candId));
    if (idx < 0) return { abort: true, info: { already: true } };
    data.candidates.splice(idx, 1);
    data.messages = (data.messages || []).filter((m) => m.candidateId !== candId);
    // Bevara anonym statistik: räkna upp en raderingsräknare utan identitet
    data._privacy = data._privacy || {};
    data._privacy.deletedCount = (data._privacy.deletedCount || 0) + 1;
    return { info: { removed: true } };
  });
  if (!save.ok) {
    await sbAdminPatch("deletion_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem), { status: "failed", error: save.error });
    return json(502, { error: save.error });
  }

  const fileResults = {};
  for (const path of files) fileResults[path] = (await deleteCv(path)) ? "deleted" : "failed";
  if (String(candId).indexOf("sb_") === 0) { await deleteApplication(candId.slice(3)); fileResults["application_row"] = "deleted"; }

  const anyFail = Object.values(fileResults).some((v) => v === "failed");
  await sbAdminPatch("deletion_jobs", "org_id=eq." + enc(g.orgId) + "&idempotency_key=eq." + enc(idem),
    { status: anyFail ? "partial" : "completed", progress: 100, precheck: ctx, plan: pre.plan,
      result: { files: fileResults, preserved: pre.plan.preserve }, finished_at: new Date().toISOString(),
      error: anyFail ? "Vissa dokument kunde inte raderas ur storage." : null });
  await serverAccessLog(g.orgId, g.user, candId, "delete", "candidate:" + candId, "allowed", "Raderade kandidat");
  await serverPrivacyEvent(g.orgId, g.user, candId, "deletion", idem, "deletion_completed", null, { files: fileResults });
  return json(200, { ok: true, status: anyFail ? "partial" : "completed", plan: pre.plan, files: fileResults });
}

/* Retention-utvärdering: beräkna status per kandidat mot aktiva regler (idempotent upsert). */
async function doEvaluateRetention(g) {
  if (!roleCan(g.role, "view")) return json(403, { error: "Behörighet saknas." });
  const rows = await sbAdmin("org_state?org_id=eq." + enc(g.orgId) + "&select=data");
  const data = rows && rows[0] && rows[0].data;
  if (!data) return json(503, { error: "Kunde inte läsa organisationens data." });
  const policies = await sbAdmin("retention_policies?org_id=eq." + enc(g.orgId) + "&active=eq.true&select=id,data_type,active_version") || [];
  if (!policies.length) return json(200, { ok: true, evaluated: 0, note: "Inga aktiva retentionregler." });

  // Hämta senaste version per policy
  const vers = {};
  for (const pol of policies) {
    const v = await sbAdmin("retention_policy_versions?policy_id=eq." + enc(pol.id) + "&order=version.desc&limit=1&select=*");
    if (v && v[0]) vers[pol.id] = v[0];
  }
  const holds = await sbAdmin("legal_holds?org_id=eq." + enc(g.orgId) + "&status=eq.active&select=candidate_id") || [];
  const holdSet = new Set(holds.map((h) => h.candidate_id));
  const restr = await sbAdmin("processing_restrictions?org_id=eq." + enc(g.orgId) + "&active=eq.true&select=candidate_id") || [];
  const pausedSet = new Set(restr.map((r) => r.candidate_id));

  const cands = Array.isArray(data.candidates) ? data.candidates : [];
  const now = Date.now();
  let evaluated = 0; const errors = [];
  for (const cand of cands) {
    if (cand._anon) continue;
    const dtype = dataTypeOf(data, cand);
    for (const pol of policies) {
      if (pol.data_type !== dtype) continue;
      const ver = vers[pol.id]; if (!ver) continue;
      const ev = evaluateCandidateRetention(cand, ver, { now, legalHold: holdSet.has(cand.id), paused: pausedSet.has(cand.id) });
      const ok = await sbUpsertEval(g.orgId, cand.id, pol.id, ver.version, dtype, ev);
      if (ok) evaluated++; else errors.push(cand.id);
    }
  }
  await serverPrivacyEvent(g.orgId, g.user, null, "retention", null, "retention_evaluated", "Utvärderade " + evaluated + " poster");
  return json(200, { ok: true, evaluated, errors: errors.length });
}
function dataTypeOf(data, cand) {
  const t = stageTypeOf(data, cand);
  if (t === "hired") return "hired";
  if (t === "rejected") return "application_rejected";
  if (t === "withdrawn") return "application_withdrawn";
  if (["reserve"].includes(t) || cand.pools && cand.pools.length) return "talent_pool";
  if (["rejected", "withdrawn", "reserve", "hired"].includes(t)) return "application_closed";
  return "application_active";
}
async function sbUpsertEval(orgId, candId, policyId, ver, dtype, ev) {
  // Upsert på unikt index (org, candidate, policy)
  const r = await fetch(SB_URL + "/rest/v1/retention_evaluations?on_conflict=org_id,candidate_id,policy_id", {
    method: "POST",
    headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ org_id: orgId, candidate_id: candId, policy_id: policyId, policy_version: ver, data_type: dtype,
      due_at: ev.due_at, status: ev.status, reason: ev.reason, action: ev.action, evaluated_at: new Date().toISOString() }),
  });
  return r.ok;
}

/* Storage-hjälp för CV-bucketen (publik läsning, service-radering). */
async function deleteCv(path) {
  const r = await fetch(SB_URL + "/storage/v1/object/cv/" + path, {
    method: "DELETE", headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE },
  });
  return r.ok;
}
async function deleteApplication(id) {
  const r = await fetch(SB_URL + "/rest/v1/applications?id=eq." + enc(id), {
    method: "DELETE", headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, Prefer: "return=minimal" },
  });
  return r.ok;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Metod stöds inte" });
  const g = await gate(req);
  if (g.err) return g.err;
  let p; try { p = await req.json(); } catch (e) { return json(400, { error: "Felaktig begäran." }); }
  const action = String(p.action || "");
  try {
    if (action === "whoami") return json(200, { ok: true, role: g.role, org: g.orgId });
    if (action === "export") return await doExport(g, p);
    if (action === "revoke_export") return await doRevokeExport(g, p);
    if (action === "anonymize") return await doAnonymize(g, p);
    if (action === "delete") return await doDelete(g, p);
    if (action === "evaluate_retention") return await doEvaluateRetention(g);
    return json(400, { error: "Okänd åtgärd." });
  } catch (e) {
    return json(500, { error: "Serverfel: " + String((e && e.message) || e) });
  }
};
