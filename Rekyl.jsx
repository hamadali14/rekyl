import { Component, useState, useEffect, useMemo, useRef, useReducer, useCallback, Fragment } from "react";
import {
  Briefcase, GraduationCap, Clock, Wallet, MapPin, ShieldCheck, FileText, Award, Users,
  SlidersHorizontal, BarChart3, ClipboardList, Layers, Check, X, Star, RotateCcw, Search,
  TrendingUp, AlertTriangle, Zap, ChevronRight, ChevronDown, ChevronLeft, LayoutDashboard, Inbox,
  ArrowRight, Flame, Link2, Code2, QrCode, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Download,
  Copy, Tag, UserCheck, Activity, Sparkles, Building2, Gauge, Filter, Mail, GitCompare, Workflow,
  Phone, Upload, CalendarClock, ListChecks, Send, Bell, CircleAlert, Blocks, Settings2, History,
  ShieldAlert, Pin, PinOff, Server, AtSign, Info, CheckCircle2, Settings, ThumbsUp, ThumbsDown,
  HelpCircle, BadgeCheck, PauseCircle, CalendarCheck, Menu as MenuIcon, PanelLeftClose,
  RotateCw, Rocket, GripVertical, Lock, MousePointerClick, Share2, MessageCircle, Globe, LogOut, UserPlus,
  Video, CalendarX
} from "lucide-react";

// ---- Supabase (via REST, inget paket krävs) ----
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "https://eaditrzamfhylmlrmkca.supabase.co";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZGl0cnphbWZoeWxtbHJta2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODA4NjgsImV4cCI6MjA5OTE1Njg2OH0.jFzfeVow0P-46Vj7G-yTVjA1IHp8UN-Ts8Us719rYmE";
const sbEnabled = !!(SB_URL && SB_KEY);
let SB_TOKEN = SB_KEY, SB_REFRESH = null, SB_EXP = 0;
let SB_LAST = { status: 0, msg: "" };
let SB_REV = 0;
let SB_REV_OK = true; /* stängs av automatiskt om kolumnen `rev` inte finns */
function sbSetRev(r) { SB_REV = r || 0; }
function sbLastError() { return SB_LAST; }
function sbSetToken(t) { SB_TOKEN = t || SB_KEY; }
function sbSetAuth(token, refresh, exp) { SB_TOKEN = token || SB_KEY; SB_REFRESH = refresh || null; SB_EXP = exp || 0; }
async function sbAutoRefresh() { if (!SB_REFRESH) return false; const d = await sbRefresh(SB_REFRESH); if (d && d.access_token) { SB_TOKEN = d.access_token; SB_REFRESH = d.refresh_token || SB_REFRESH; SB_EXP = Date.now() + (d.expires_in || 3600) * 1000; try { const sv = store.get("rekyl_session", null); if (sv) store.set("rekyl_session", { ...sv, token: SB_TOKEN, refresh: SB_REFRESH, exp: SB_EXP }); } catch (e) {} return true; } return false; }
const sbHead = () => ({ apikey: SB_KEY, Authorization: "Bearer " + SB_TOKEN, "Content-Type": "application/json" });
async function sbFetch(url, method, headersFn, body) { let r = await fetch(url, { method, headers: headersFn(), body }); if (r.status === 401 && SB_REFRESH) { if (await sbAutoRefresh()) r = await fetch(url, { method, headers: headersFn(), body }); } return r; }
async function sbGet(path) { if (!sbEnabled) return null; try { const r = await sbFetch(SB_URL + "/rest/v1/" + path, "GET", sbHead); if (!r.ok) { SB_LAST = { status: r.status, msg: await r.text().catch(() => "") }; return null; } SB_LAST = { status: 200, msg: "" }; return await r.json(); } catch (e) { SB_LAST = { status: 0, msg: String((e && e.message) || e) }; return null; } }
async function sbUpsert(table, row) { if (!sbEnabled) return false; try { const r = await sbFetch(SB_URL + "/rest/v1/" + table, "POST", () => ({ ...sbHead(), Prefer: "resolution=merge-duplicates,return=minimal" }), JSON.stringify(row)); if (!r.ok) SB_LAST = { status: r.status, msg: await r.text().catch(() => "") }; else SB_LAST = { status: 200, msg: "" }; return r.ok; } catch (e) { SB_LAST = { status: 0, msg: String((e && e.message) || e) }; return false; } }
async function sbInsert(table, row) { if (!sbEnabled) return false; try { const r = await sbFetch(SB_URL + "/rest/v1/" + table, "POST", () => ({ ...sbHead(), Prefer: "return=minimal" }), JSON.stringify(row)); return r.ok; } catch (e) { return false; } }
async function sbUpload(bucket, path, file) { if (!sbEnabled || !file) return null; const enc = path.split("/").map(encodeURIComponent).join("/"); try { const r = await fetch(SB_URL + "/storage/v1/object/" + bucket + "/" + enc, { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_TOKEN, "x-upsert": "true" }, body: file }); if (!r.ok) return null; return SB_URL + "/storage/v1/object/public/" + bucket + "/" + enc; } catch (e) { return null; } }
let SB_UPLOAD_ORG = null;
function sbSetUploadOrg(o) { SB_UPLOAD_ORG = o || null; }
async function sbDelete(table, filter) { if (!sbEnabled) return false; try { const r = await sbFetch(SB_URL + "/rest/v1/" + table + "?" + filter, "DELETE", () => ({ ...sbHead(), Prefer: "return=minimal" }), undefined); return r.ok; } catch (e) { return false; } }
async function sbDeleteFile(bucket, path) { if (!sbEnabled || !path) return false; try { const r = await fetch(SB_URL + "/storage/v1/object/" + bucket + "/" + path.split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_TOKEN } }); return r.ok; } catch (e) { return false; } }
function cvPathFromUrl(url) { if (!url) return null; const m = String(url).split("/object/public/cv/")[1]; return m ? m.split("/").map(decodeURIComponent).join("/") : null; }
function downloadCSV(rows, name) {
  const esc = (v) => { const t = String(v == null ? "" : v); return /[",;\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadJSON(filename, obj) { try { const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (e) {} }
async function eraseCandidate(c, D) { try { if (String(c.id).indexOf("sb_") === 0) await sbDelete("applications", "id=eq." + c.id.slice(3)); const files = Object.values(c.answers || {}).filter((v) => v && typeof v === "object" && v.url).map((v) => cvPathFromUrl(v.url)).filter(Boolean); for (const p of files) await sbDeleteFile("cv", p); } catch (e) {} D({ type: "REMOVE_CANDIDATE", id: c.id }); }
function jobRow(job, org, published) { return { slug: job.slug, title: job.title, company: org.companyName, org, form: { criteria: job.criteria, pages: getPages(job), pageLabels: job.pageLabels || {}, version: job.version, annons: job.annons, team: job.team }, published, org_id: SB_ORG }; }
async function deleteJobFull(job, allCands, D) {
  try {
    if (sbEnabled) {
      const files = (allCands || []).filter((c) => c.jobId === job.id).flatMap((c) => Object.values(c.answers || {}).filter((v) => v && typeof v === "object" && v.url).map((v) => cvPathFromUrl(v.url))).filter(Boolean);
      for (const p of files) await sbDeleteFile("cv", p);
      await sbDelete("applications", "job_slug=eq." + encodeURIComponent(job.slug));
      await sbDelete("jobs", "slug=eq." + encodeURIComponent(job.slug));
    }
  } catch (e) {}
  D({ type: "DELETE_JOB", jobId: job.id });
}
async function sbLogin(email, password) { const r = await fetch(SB_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const d = await r.json().catch(() => ({})); if (r.ok && d.access_token) return d; throw new Error(d.error_description || d.msg || (d.error && d.error.message) || "Fel e-post eller lösenord."); }
async function sbSignup(email, password) { const r = await fetch(SB_URL + "/auth/v1/signup", { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const d = await r.json().catch(() => ({})); if (r.ok) return d; throw new Error(d.error_description || d.msg || (d.error && d.error.message) || "Kunde inte skapa konto."); }
let SB_ORG = null;
function sbSetOrg(u) { SB_ORG = u || null; }
async function sbRpc(fn, args) { const r = await sbFetch(SB_URL + "/rest/v1/rpc/" + fn, "POST", sbHead, JSON.stringify(args || {})); const d = await r.json().catch(() => null); if (!r.ok) throw new Error((d && (d.message || d.hint || d.error)) || "Serverfel"); return d; }
async function sbRefresh(refresh_token) { try { const r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token }) }); const d = await r.json().catch(() => ({})); if (r.ok && d.access_token) return d; return null; } catch (e) { return null; } }

/* ---- E-postutskick via serverless-funktion (Netlify) ---- */
const MAIL_FN = "/.netlify/functions/send-email";
const MAIL_INFLIGHT = new Set();
async function mailConfig() { try { const r = await fetch(MAIL_FN, { headers: { Accept: "application/json" } }); if (!r.ok) return { configured: false }; const d = await r.json(); return d && typeof d === "object" ? d : { configured: false }; } catch (e) { return { configured: false }; } }
const ADMIN_FN = "/.netlify/functions/admin";
async function adminCall(action, args) { try { const r = await sbFetch(ADMIN_FN, "POST", () => ({ "Content-Type": "application/json", Authorization: "Bearer " + SB_TOKEN }), JSON.stringify({ action, ...(args || {}) })); const d = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, error: (d && d.error) || ("Fel (" + r.status + ")") }; return { ok: true, ...d }; } catch (e) { return { ok: false, error: "Ingen kontakt med admin-tjänsten." }; } }
const PLAN_LABEL = { start: "Start", pro: "Pro", enterprise: "Enterprise" };
const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : n > 1024 ? Math.round(n / 1024) + " kB" : n + " B");
async function runRemindersNow() { try { const r = await sbFetch(MAIL_FN, "POST", () => ({ "Content-Type": "application/json", Authorization: "Bearer " + SB_TOKEN }), JSON.stringify({ action: "run-reminders" })); const d = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, error: (d && d.error) || ("Fel (" + r.status + ")") }; return { ok: true, ...d }; } catch (e) { return { ok: false, error: "Ingen kontakt med utskickstjänsten." }; } }
async function sendMail(payload) { try { const r = await sbFetch(MAIL_FN, "POST", () => ({ "Content-Type": "application/json", Authorization: "Bearer " + SB_TOKEN }), JSON.stringify(payload)); const d = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, error: (d && d.error) || ("Utskicksfel (" + r.status + ")") }; return { ok: true, id: (d && d.id) || null }; } catch (e) { return { ok: false, error: "Ingen kontakt med utskickstjänsten." }; } }


/* ================================================================== *
 *  REKYL v4 — deterministisk ATS, produktpolerad. En fil.
 *  Motorn (scoring/knockout/conditional) är oforändrad från v3.
 * ================================================================== */


/* ================================================================== *
 *  REKYL v3 — deterministisk ATS: form builder, scoring, swipe,
 *  timeline, meddelanden, jämförelse, auto-pipeline. Ingen AI, en fil.
 * ================================================================== */

/* ---------- Verifierad QR-generator (v3-M, mask 0, byte) ---------- */
const QEXP = new Array(256), QLOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { QEXP[i] = x; QLOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } QEXP[255] = QEXP[0]; })();
const qmul = (a, b) => (a === 0 || b === 0) ? 0 : QEXP[(QLOG[a] + QLOG[b]) % 255];
function qGen(n) { let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= qmul(g[j], QEXP[i]); ng[j + 1] ^= g[j]; } g = ng; } return g.reverse(); }
function qRs(data, ecLen) { const gen = qGen(ecLen); const res = new Array(ecLen).fill(0); for (const d of data) { const f = d ^ res[0]; res.shift(); res.push(0); if (f !== 0) for (let i = 0; i < ecLen; i++) res[i] ^= qmul(gen[i + 1], f); } return res; }
function generateQR(text) {
  const SIZE = 29, DATA_CW = 44, EC_CW = 26;
  let bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > 42) { text = text.slice(0, 42); bytes = Array.from(new TextEncoder().encode(text)).slice(0, 42); }
  const bits = []; const push = (v, l) => { for (let i = l - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  push(0b0100, 4); push(bytes.length, 8); for (const b of bytes) push(b, 8);
  const cap = DATA_CW * 8; for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; cw.push(v); }
  const pads = [0xEC, 0x11]; let pi = 0; while (cw.length < DATA_CW) cw.push(pads[pi++ % 2]);
  const all = cw.concat(qRs(cw, EC_CW));
  const dataBits = []; for (const c of all) for (let i = 7; i >= 0; i--) dataBits.push((c >> i) & 1);
  const m = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
  const fn = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
  const set = (r, c, v) => { m[r][c] = v; fn[r][c] = true; };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const rr = r + i, cc = c + j; if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue; const ring = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)); const core = i >= 2 && i <= 4 && j >= 2 && j <= 4; set(rr, cc, ring || core ? 1 : 0); } };
  finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0);
  for (let i = 8; i < SIZE - 8; i++) { const v = i % 2 === 0 ? 1 : 0; set(6, i, v); set(i, 6, v); }
  const ac = 22; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(ac + i, ac + j, Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0);
  set(SIZE - 8, 8, 1);
  const fmtCells = [];
  for (let i = 0; i <= 5; i++) fmtCells.push([i, 8, i]);
  fmtCells.push([7, 8, 6], [8, 8, 7], [8, 7, 8]);
  for (let i = 9; i <= 14; i++) fmtCells.push([8, 14 - i, i]);
  for (let i = 0; i <= 7; i++) fmtCells.push([8, SIZE - 1 - i, i]);
  for (let i = 8; i <= 14; i++) fmtCells.push([SIZE - 15 + i, 8, i]);
  for (const [r, c] of fmtCells) fn[r][c] = true;
  let bi = 0, up = true;
  for (let col = SIZE - 1; col > 0; col -= 2) { if (col === 6) col = 5; for (let k = 0; k < SIZE; k++) { const row = up ? SIZE - 1 - k : k; for (let c2 = 0; c2 < 2; c2++) { const cc = col - c2; if (fn[row][cc]) continue; let bit = bi < dataBits.length ? dataBits[bi++] : 0; if ((row + cc) % 2 === 0) bit ^= 1; m[row][cc] = bit; } } up = !up; }
  const fmt = 0; let rem = fmt; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  const format = ((fmt << 10) | (rem & 0x3ff)) ^ 0x5412;
  for (const [r, c, i] of fmtCells) m[r][c] = (format >> i) & 1;
  return m;
}

const ICONS = { Briefcase, GraduationCap, Clock, Wallet, MapPin, ShieldCheck, FileText, Award, Zap, Sparkles, Gauge, Users, Phone, Mail, Upload, CalendarClock, ListChecks, Building2 };
const sek = (n) => Number(n || 0).toLocaleString("sv-SE");
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- Blocktyper ---------- */
const BLOCKS = {
  experience: "Erfarenhet", skills: "Kompetenser", availability: "Tillgänglighet", salary: "Lön",
  cert: "Certifikat", yesno: "Ja/nej", choice: "Flerval", ranking: "Rangordning", text: "Fritext",
  file: "Filuppladdning", schedule: "Kalender/tider",
};
const TYPE_LABEL = { number: "Tal", budget: "Belopp", ordinal: "Nivå", multiselect: "Flerval", match: "Matchning", boolean: "Ja/nej", select: "Val", ranking: "Rangordning", text: "Fritext", file: "Fil", schedule: "Tider" };

/* Fältfabriker. Varje fält: scored (påverkar poäng), display (syns på kort),
   required, knockout (+koValue), showIf (villkor), step. */
function mk(o) { return { scored: o.weight != null, display: true, required: false, knockout: false, koValue: false, showIf: null, step: 2, ...o }; }
const FIELD = {
  years: (w = 24, ideal = 4) => mk({ id: "experience", label: "Års erfarenhet", block: "experience", type: "number", icon: "Briefcase", weight: w, ideal, unit: "år", step: 2 }),
  salary: (w = 13, budget = 42000) => mk({ id: "salary", label: "Löneanspråk", block: "salary", type: "budget", icon: "Wallet", weight: w, budget, unit: "kr/mån", step: 4, display: true }),
  edu: (w = 9) => mk({ id: "education", label: "Utbildningsnivå", block: "experience", type: "ordinal", icon: "GraduationCap", weight: w, direction: "asc", scale: ["Gymnasium", "Yrkeshögskola", "Kandidatexamen", "Masterexamen"], step: 2 }),
  avail: (w = 12) => mk({ id: "availability", label: "Kan börja", block: "availability", type: "ordinal", icon: "Clock", weight: w, direction: "desc", scale: ["Omgående", "Inom 1 månad", "1-3 månader", "Mer än 3 månader"], step: 4 }),
  mode: (w = 6, preferred = "Hybrid") => mk({ id: "workmode", label: "Arbetsform", block: "availability", type: "match", icon: "MapPin", weight: w, preferred, options: ["På plats", "Hybrid", "Distans"], step: 4 }),
  skills: (w, opts) => mk({ id: "skills", label: "Nyckelkompetenser", block: "skills", type: "multiselect", icon: "Zap", weight: w, options: opts.map((o) => typeof o === "string" ? { value: o, must: false } : o), step: 3 }),
  license: () => mk({ id: "license", label: "Har B-körkort", block: "yesno", type: "boolean", icon: "ShieldCheck", knockout: true, koValue: false, required: true, scored: false, step: 3 }),
  cert: (id, label) => mk({ id, label, block: "cert", type: "boolean", icon: "ShieldCheck", knockout: true, koValue: false, required: true, scored: false, step: 3 }),
  weekend: () => mk({ id: "weekend", label: "Kan jobba helg", block: "yesno", type: "boolean", icon: "CalendarClock", knockout: true, koValue: false, scored: false, required: true, step: 4 }),
  motivation: () => mk({ id: "motivation", label: "Motivering", block: "text", type: "text", icon: "FileText", scored: false, step: 5, placeholder: "Kort om varför du passar..." }),
  cv: () => mk({ id: "cv", label: "Ladda upp CV", block: "file", type: "file", icon: "Upload", scored: false, display: false, step: 5 }),
};

const TEMPLATES = [
  { id: "säljare", name: "Säljare / Account Manager", icon: "Briefcase", desc: "B2B-sälj, provision, relationer",
    build: () => [FIELD.years(24, 4), FIELD.skills(28, ["B2B-försäljning", "CRM-system", "Förhandling", "Presentationsteknik", "Engelska", "Projektledning"]), FIELD.edu(9), FIELD.avail(12), FIELD.salary(13, 42000), FIELD.mode(6, "Hybrid"), FIELD.license(), FIELD.motivation(), FIELD.cv()] },
  { id: "lager", name: "Lagerarbetare / Truckförare", icon: "Briefcase", desc: "Truckkort, skift, conditional logic",
    build: () => [
      FIELD.years(18, 2),
      mk({ id: "truck", label: "Har truckkort", block: "yesno", type: "boolean", icon: "ShieldCheck", knockout: true, koValue: false, required: true, scored: false, step: 3 }),
      mk({ id: "truck_beh", label: "Truckbehörigheter", block: "choice", type: "multiselect", icon: "ListChecks", weight: 20, options: [{ value: "A1", must: false }, { value: "A2", must: false }, { value: "B1", must: false }, { value: "B2", must: false }], showIf: { field: "truck", equals: true }, step: 3 }),
      FIELD.skills(16, ["Plockning", "Inleverans", "WMS-system", "Ordersystem", "Engelska"]),
      FIELD.weekend(), FIELD.avail(16), FIELD.salary(12, 32000), FIELD.motivation(), FIELD.cv()] },
  { id: "lss", name: "LSS-personal", icon: "ShieldCheck", desc: "Omsorg, delegering, conditional",
    build: () => [
      FIELD.years(18, 3),
      mk({ id: "område", label: "Område", block: "choice", type: "select", icon: "ListChecks", weight: 10, options: ["LSS-boende", "Personlig assistans", "Daglig verksamhet"], step: 3 }),
      mk({ id: "delegering", label: "Har delegering för läkemedel", block: "yesno", type: "boolean", icon: "ShieldCheck", weight: 14, scored: true, koValue: false, showIf: { field: "område", equals: "LSS-boende" }, step: 3 }),
      FIELD.skills(18, ["Omvårdnad", "Dokumentation", "Hantering av utåtagerande", "Handledning", "Körkort"]),
      mk({ id: "license", label: "Har B-körkort", block: "yesno", type: "boolean", icon: "ShieldCheck", knockout: true, koValue: false, required: true, scored: false, step: 4 }),
      FIELD.avail(16), FIELD.salary(12, 31000), FIELD.motivation(), FIELD.cv()] },
  { id: "sköterska", name: "Sjuksköterska", icon: "ShieldCheck", desc: "Legitimation krävs",
    build: () => [FIELD.years(20, 3), FIELD.cert("legitimation", "Legitimerad sjuksköterska"), FIELD.skills(24, ["Akutsjukvård", "Journalsystem", "Läkemedelshantering", "Handledning", "Engelska"]), FIELD.weekend(), FIELD.avail(16), FIELD.salary(14, 38000), FIELD.motivation(), FIELD.cv()] },
  { id: "utvecklare", name: "Utvecklare (Frontend)", icon: "Code2", desc: "React, TypeScript, distans",
    build: () => [FIELD.years(26, 5), FIELD.skills(30, ["React", "TypeScript", "Node.js", "CSS/Tailwind", "Testning", "Git"]), FIELD.edu(7), FIELD.avail(11), FIELD.salary(14, 52000), FIELD.mode(6, "Distans"), FIELD.motivation(), FIELD.cv()] },
  { id: "kundtjänst", name: "Kundtjänst", icon: "Users", desc: "Service, system, skift",
    build: () => [FIELD.years(16, 2), FIELD.skills(28, ["Ärendesystem", "Telefonvana", "Skriftlig kommunikation", "Merförsäljning", "Engelska"]), FIELD.avail(18), FIELD.weekend(), FIELD.salary(12, 30000), FIELD.motivation(), FIELD.cv()] },
  { id: "butik", name: "Butikssäljare", icon: "Users", desc: "Kassa, service, helger",
    build: () => [FIELD.years(16, 2), FIELD.skills(30, ["Kassasystem", "Merförsäljning", "Kundservice", "Lagerhantering", "Engelska"]), FIELD.avail(20), FIELD.weekend(), FIELD.salary(14, 30000), FIELD.motivation(), FIELD.cv()] },
];

/* ---------- Conditional logic ---------- */
function isVisible(field, a) {
  if (!field.showIf) return true;
  const v = a[field.showIf.field];
  const target = field.showIf.equals;
  if (Array.isArray(v)) return v.includes(target);
  return v === target;
}

/* ---------- Scoringmotor ---------- */
function weightOf(job, c) { const p = job.profiles?.find((x) => x.id === job.activeProfileId); const w = p?.weights?.[c.id]; return (w == null) ? (c.weight || 0) : w; }
function evalTagRules(job, total, a) {
  const tags = [];
  for (const r of job.rules || []) { const val = r.field === "total" ? total : Number(a[r.field]); if (Number.isNaN(val)) continue; const ok = r.op === ">" ? val > r.value : r.op === "<" ? val < r.value : r.op === ">=" ? val >= r.value : val <= r.value; if (ok) tags.push(r.tag); }
  return tags;
}
function scoreCandidate(job, a) {
  const parts = [], knockoutReasons = []; let earned = 0, wsum = 0;
  for (const c of job.criteria) {
    if (!isVisible(c, a)) continue;
    if (c.type === "boolean") {
      const val = !!a[c.id];
      if (c.knockout && val === !!c.koValue) knockoutReasons.push(c.koValue ? `${c.label}: diskvalificerande svar` : `Saknar ${c.label.replace(/^Har /, "").toLowerCase()}`);
      if (c.scored && weightOf(job, c) > 0) { const w = weightOf(job, c); wsum += w; const frac = val ? 1 : 0; earned += frac * w; parts.push({ id: c.id, label: c.label, kind: "scored", frac, earned: frac * w, detail: val ? "Ja" : "Nej", icon: c.icon }); }
      else parts.push({ id: c.id, label: c.label, kind: "must", ok: c.knockout ? val !== !!c.koValue : val, icon: c.icon });
      continue;
    }
    if (c.type === "text" || c.type === "file") { parts.push({ id: c.id, label: c.label, kind: c.type, value: a[c.id] || "", icon: c.icon }); continue; }
    if (!c.scored) { parts.push({ id: c.id, label: c.label, kind: "info", value: Array.isArray(a[c.id]) ? a[c.id].join(", ") : (a[c.id] ?? "—"), icon: c.icon }); continue; }
    const w = weightOf(job, c); if (w <= 0) { continue; } wsum += w;
    let frac = 0, detail = "";
    if (c.type === "number") { const v = Number(a[c.id] || 0); frac = clamp01(v / c.ideal); detail = `${v} ${c.unit} · mål ${c.ideal}`; }
    else if (c.type === "budget") { const v = Number(a[c.id] || 0); frac = v <= c.budget ? 1 : clamp01(1 - (v - c.budget) / (c.budget * 0.3)); detail = `${sek(v)} · tak ${sek(c.budget)}`; }
    else if (c.type === "ordinal") { const idx = Math.max(0, c.scale.indexOf(a[c.id])); const last = c.scale.length - 1; frac = c.direction === "desc" ? 1 - idx / last : idx / last; detail = a[c.id] || "—"; }
    else if (c.type === "multiselect") { const sel = Array.isArray(a[c.id]) ? a[c.id] : []; for (const o of c.options) if (o.must && !sel.includes(o.value)) knockoutReasons.push(`Saknar ${o.value}`); const hit = sel.filter((s) => c.options.some((o) => o.value === s)).length; frac = c.options.length ? clamp01(hit / c.options.length) : 0; detail = `${hit}/${c.options.length}`; }
    else if (c.type === "match") { const v = a[c.id]; if (v === c.preferred) frac = 1; else { const d = Math.abs(c.options.indexOf(v) - c.options.indexOf(c.preferred)); frac = d === 1 ? 0.5 : 0.2; } detail = v || "—"; }
    else if (c.type === "select") { const idx = Math.max(0, (c.options || []).indexOf(a[c.id])); frac = c.options?.length > 1 ? idx / (c.options.length - 1) : (a[c.id] ? 1 : 0); detail = a[c.id] || "—"; }
    earned += frac * w; parts.push({ id: c.id, label: c.label, kind: "scored", frac, weight: w, earned: frac * w, detail, icon: c.icon });
  }
  const total = wsum > 0 ? Math.round((earned / wsum) * 100) : 0;
  const knockout = knockoutReasons.length > 0;
  const tags = evalTagRules(job, total, a);
  const belowThreshold = !knockout && job.autoRejectBelow != null && total < job.autoRejectBelow;
  return { total, parts, knockout, knockoutReasons, tags, belowThreshold };
}

/* ---------- Missing info ---------- */
function missingInfo(job, cand) {
  const a = cand.answers, out = [];
  if (!cand.email) out.push("E-post"); if (!cand.phone) out.push("Telefon");
  for (const c of job.criteria) {
    if (!isVisible(c, a)) continue;
    if (c.type === "file" && !a[c.id]) { if (c.id === "cv") out.push("CV"); else out.push(c.label); continue; }
    if (c.required) { const v = a[c.id]; const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0); if (empty && c.type !== "boolean") out.push(c.label); }
  }
  return out;
}

/* ---------- Auto-pipeline ---------- */
function evalAutoRules(job, cand) {
  const hits = [];
  for (const r of job.autoRules || []) {
    let val;
    if (r.field === "total") val = cand.total; else if (r.field === "knockout") val = cand.knockout ? 1 : 0; else val = Number(cand.answers[r.field]);
    if (val == null || Number.isNaN(val)) continue;
    const ok = r.op === ">" ? val > r.value : r.op === "<" ? val < r.value : r.op === ">=" ? val >= r.value : r.op === "<=" ? val <= r.value : val === r.value;
    if (ok) hits.push(r);
  }
  return hits;
}
const ACTION_LABEL = { shortlist: "Shortlist", reject: "Avslagspool", maybe: "Reservlista", flag: "Flagga", completion: "Begär komplettering" };

/* ---------- Team ---------- */
const _MOCKTEAM0 = [
  { id: "u1", name: "Du", role: "recruiter", initials: "DU" },
  { id: "u2", name: "Mona Berg", role: "manager", initials: "MB" },
  { id: "u3", name: "Ali Reza", role: "recruiter", initials: "AR" },
  { id: "u4", name: "Karin Ek", role: "viewer", initials: "KE" },
];
const ROLE_LABEL = { admin: "Admin", recruiter: "Rekryterare", manager: "Rekryterande chef", viewer: "Insyn" };
const JOB_STATUS = { open: "Öppen", paused: "Pausad", closed: "Tillsatt", archived: "Arkiverad" };

/* ---------- Tjänster ---------- */
function makeJob(id, title, team, slug, tmplId, extra = {}) {
  return {
    id, title, team, slug, company: extra.company || "Nordpuls AB",
    publicTitle: title, ref: "REK-" + String(id).slice(-4).toUpperCase(),
    unit: "", extent: "Heltid", category: "", priority: "normal",
    ownerId: null, managerId: null, teamIds: [], tags: [], internal: false,
    _m: 2, status: "draft", published: false, createdAt: Date.now(), updatedAt: Date.now(), pipeline: defaultPipeline(),
    publishedAt: null, closedAt: null, closedReason: "", hiredId: null, activity: [],
    criteria: TEMPLATES.find((t) => t.id === tmplId).build(),
    profiles: [{ id: "std", name: "Standard", weights: {} }, ...(extra.profiles || [])], activeProfileId: "std",
    rules: extra.rules || [], autoRules: extra.autoRules || [], autoRejectBelow: extra.autoRejectBelow ?? 40,
    brand: { company: extra.company || "Nordpuls AB" },
    version: 3, versions: [{ v: 1, at: Date.now() - 40 * 864e5, by: "Du", note: "Skapade formuläret från mall" }, { v: 2, at: Date.now() - 12 * 864e5, by: "Mona Berg", note: "Justerade vikter" }, { v: 3, at: Date.now() - 3 * 864e5, by: "Du", note: "Lade till knockout-regel" }],
    stats: extra.stats || { started: 0, submitted: 0 },
    annons: { location: "Stockholm", workmode: "Hybrid", employment: "Heltid · tillsvidare", salary: "", start: "Enligt överenskommelse", deadline: "", pitch: "", description: "", requirements: [], meriter: [], benefits: ["Kollektivavtal", "Tjänstepension", "Friskvårdsbidrag", "Flexibla arbetstider"], process: ["Ansökan via formuläret", "Urval & telefonavstämning", "Intervju", "Referenstagning", "Erbjudande"], contact: { name: "", email: "" }, faq: [], ...(extra.annons || {}) },
  };
}
const JOBS0 = [];

function tl(kind, detail, h, actor = "System") { return { id: uid(), kind, detail, at: Date.now() - h * 3600e3, actor }; }
function C(jobId, id, name, ans, o = {}) {
  const appliedAt = Date.now() - (o.h ?? 6) * 3600e3;
  return { id, jobId, name, email: o.email ?? (name.toLowerCase().replace(/[^a-za-o ]/g, "").replace(/ /g, ".") + "@mejl.se"), phone: o.phone ?? null,
    appliedAt, status: "new", managerStatus: null, starred: false, answers: ans, rating: o.rating || 0, comments: o.comments || [], reviews: o.reviews || {}, source: o.source || "Direkt", reason: null, formVersion: o.fv ?? 3,
    timeline: [tl("application_received", "Ansökan mottagen via " + (o.source || "Direkt"), o.h ?? 6), tl("score_computed", "Matchning beräknad (regelverk v3)", (o.h ?? 6) - 0.01)] };
}
const CANDIDATES0 = [];

/* ---------- Säkert localStorage (fallback in-memory så artifact ej kraschar) ---------- */
const _mem = {};
const store = {
  get(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in _mem ? _mem[k] : d; } },
  set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { _mem[k] = v; } },
};

/* ---------- Statusar / pipeline ---------- */
const STAGES = [
  { id: "new", label: "Nya", tone: "neutral" },
  { id: "shortlist", label: "Shortlist", tone: "green" },
  { id: "interview", label: "Intervju", tone: "petrol" },
  { id: "reserve", label: "Reservlista", tone: "amber" },
  { id: "reject", label: "Avslag", tone: "brick" },
  { id: "hired", label: "Anställd", tone: "gold" },
];
function statusLabel(s) { return STAGES.find((x) => x.id === s)?.label || s; }
function timeAgo(ts) { const h = Math.round((Date.now() - ts) / 3600000); if (h < 1) return "nyss"; if (h < 24) return h + " h sedan"; return Math.round(h / 24) + " d sedan"; }
function initials(name) { return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
function tierOf(c) { return c.knockout ? "ko" : c.total >= 78 ? "high" : c.total >= 55 ? "mid" : "low"; }
function can(role, what) { const R = { recruiter: ["decide", "edit", "comment", "export", "message", "vote", "publish", "tags"], admin: ["decide", "edit", "comment", "export", "message", "vote", "settings", "publish", "approve", "tags", "delete_job"], manager: ["vote", "comment", "export", "message", "decide", "approve"], viewer: ["export"] }; return (R[role] || []).includes(what); }
const TL_LABEL = { application_received: "Ansökan mottagen", score_computed: "Matchning beräknad", knockout: "Diskvalificerad", status_change: "Status ändrad", message_sent: "Mejl köat", message_delivered: "Mejl skickat", interview_booked: "Intervju bokad", interview_cancelled: "Intervju avbokad", note: "Kommentar", completion_requested: "Komplettering begärd", auto_rule: "Auto-regel", vote: "Team review", hired: "Anställd" };
const validEmail = (e) => !!e && /.+@.+\..+/.test(e);
const MSG_LABEL = { queued: "Köad", sending: "Skickar…", sent: "Skickad", failed: "Fel" };

/* ---------- Meddelandemallar (variabler enligt spec) ---------- */
const DEFAULT_TEMPLATES = [
  { id: "t_received", name: "Tack för ansökan", trigger: "received", active: true, subject: "Tack för din ansökan till {{jobTitle}}", body: "Hej {{candidateName}},\n\nTack för din ansökan till {{jobTitle}} hos {{companyName}}. Vi har tagit emot den och går igenom alla ansökningar löpande. Du hör från oss.\n\nVänliga hälsningar,\n{{hrName}}\n{{companyName}}" },
  { id: "t_shortlist", name: "Intressant profil", trigger: "shortlist", active: true, subject: "Din ansökan till {{jobTitle}} går vidare", body: "Hej {{candidateName}},\n\nVi tycker din profil verkar intressant för {{jobTitle}} hos {{companyName}} och vill gärna ta det vidare. Vi återkommer inom kort med nästa steg.\n\nVänliga hälsningar,\n{{hrName}}" },
  { id: "t_interview", name: "Boka intervju", trigger: "interview", active: true, subject: "Vi vill träffa dig - {{jobTitle}}", body: "Hej {{candidateName}},\n\nVi vill gärna träffa dig för {{jobTitle}} hos {{companyName}}. Förslag på tid: {{interviewTime}}. Passar det, eller föreslår du en annan tid?\n\nSvara på detta mejl så bokar vi.\n\nVänliga hälsningar,\n{{hrName}}\n{{hrEmail}}" },
  { id: "t_reserve", name: "Reservlista", trigger: "reserve", active: true, subject: "Din ansökan - {{jobTitle}}", body: "Hej {{candidateName}},\n\nTack för din ansökan till {{jobTitle}}. Vi har lagt din profil på vår reservlista och hör av oss om en passande roll blir aktuell.\n\nVänliga hälsningar,\n{{hrName}}" },
  { id: "t_reject", name: "Avslag", trigger: "reject", active: true, subject: "Besked om din ansökan till {{jobTitle}}", body: "Hej {{candidateName}},\n\nTack för din ansökan till {{jobTitle}} hos {{companyName}}. Den här gången går vi vidare med andra kandidater ({{rejectionReason}}). Vi önskar dig lycka till framöver.\n\nVänliga hälsningar,\n{{hrName}}" },
  { id: "t_completion", name: "Begär komplettering", trigger: "completion", active: true, subject: "Komplettering behövs - {{jobTitle}}", body: "Hej {{candidateName}},\n\nDin ansökan ser bra ut, men vi saknar: {{missingField}}. Kan du komplettera genom att svara på detta mejl?\n\nTack,\n{{hrName}}" },
  { id: "t_offer", name: "Erbjudande", trigger: "offer", active: true, subject: "Erbjudande - {{jobTitle}} hos {{companyName}}", body: "Hej {{candidateName}},\n\nVi är glada att erbjuda dig rollen som {{jobTitle}} hos {{companyName}}. Vi mejlar detaljerna separat. Hör gärna av dig till {{hrName}} på {{hrEmail}} vid frågor.\n\nVarmt välkommen!\n{{hrName}}" },
  { id: "t_interview_reminder", name: "Påminnelse intervju", trigger: "interview_reminder", active: true, subject: "Påminnelse: intervju imorgon - {{jobTitle}}", body: "Hej {{candidateName}},\n\nEn vänlig påminnelse om din intervju för {{jobTitle}} hos {{companyName}}.\n\nTid: {{interviewTime}}\n\nHör av dig om något har kommit emellan.\n\nVänliga hälsningar,\n{{hrName}}\n{{companyName}}" },
  { id: "t_interview_cancelled", name: "Avbokad intervju", trigger: "interview_cancelled", active: true, subject: "Ändrad tid - {{jobTitle}}", body: "Hej {{candidateName}},\n\nTyvärr måste vi avboka den inplanerade intervjun för {{jobTitle}} hos {{companyName}}. Kalenderinbjudan tas bort automatiskt.\n\nVi återkommer med ett nytt tidsförslag så snart vi kan.\n\nVänliga hälsningar,\n{{hrName}}\n{{companyName}}" },
  { id: "t_reminder", name: "Påminnelse", trigger: "reminder", active: true, subject: "Påminnelse — {{jobTitle}}", body: "Hej {{candidateName}},\n\nEn liten påminnelse angående din ansökan till {{jobTitle}}. Hör av dig till {{hrName}} ({{hrEmail}}) om du har frågor.\n\nVänliga hälsningar,\n{{hrName}}" },
];
function renderTpl(str, vars) { return (str || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars[k] == null || vars[k] === "" ? `{{${k}}}` : vars[k])); }
function tplVars(state, cand, job) { return { candidateName: cand.name, jobTitle: job.title, companyName: state.org.companyName, hrName: state.org.hrName, hrEmail: state.org.hrEmail, missingField: (missingInfo(job, cand)[0] || "efterfrågad uppgift"), interviewTime: cand.interviewTime || state.org.defaultInterviewTime, rejectionReason: cand.reason ? cand.reason.toLowerCase() : "andra kandidater gick vidare" }; }
const INTERVIEW_MODES = { video: { label: "Videomöte", icon: Video, locLabel: "Möteslänk", ph: "https://meet.google.com/..." }, onsite: { label: "På plats", icon: MapPin, locLabel: "Adress", ph: "Storgatan 1, Växjö" }, phone: { label: "Telefon", icon: Phone, locLabel: "Telefonnummer (valfritt)", ph: "Vi ringer numret i ansökan" } };
const DAY_NAMES = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
const pad2 = (n) => String(n).padStart(2, "0");
function fmtInterview(at) { if (!at) return ""; const d = new Date(at); if (isNaN(d)) return ""; return `${DAY_NAMES[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} kl ${pad2(d.getHours())}.${pad2(d.getMinutes())}`; }
function ivEnd(iv) { return new Date(new Date(iv.at).getTime() + (iv.duration || 45) * 60000).getTime(); }
function ivActive(c) { return !!(c && c.interview && c.interview.at && !c.interview.cancelled); }
function ivOverlap(a, b) { const s1 = new Date(a.at).getTime(), e1 = ivEnd(a), s2 = new Date(b.at).getTime(), e2 = ivEnd(b); return s1 < e2 && s2 < e1; }
function icsEsc(v) { return String(v == null ? "" : v).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function icsTime(d) { return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + "Z"; }
function buildICS(o) {
  const start = new Date(o.at);
  const end = new Date(start.getTime() + (o.duration || 45) * 60000);
  const cancel = o.method === "CANCEL";
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rekyl//ATS//SV", "CALSCALE:GREGORIAN",
    "METHOD:" + (cancel ? "CANCEL" : "REQUEST"),
    "BEGIN:VEVENT",
    "UID:" + o.uid,
    "SEQUENCE:" + (o.seq || 0),
    "DTSTAMP:" + icsTime(new Date()),
    "DTSTART:" + icsTime(start),
    "DTEND:" + icsTime(end),
    "SUMMARY:" + icsEsc(o.summary),
    "DESCRIPTION:" + icsEsc(o.description || ""),
    "LOCATION:" + icsEsc(o.location || ""),
    "ORGANIZER;CN=" + icsEsc(o.organizerName) + ":mailto:" + o.organizerEmail,
    "ATTENDEE;CN=" + icsEsc(o.attendeeName) + ";RSVP=TRUE:mailto:" + o.attendeeEmail,
    "STATUS:" + (cancel ? "CANCELLED" : "CONFIRMED"),
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
function b64utf8(str) { const bytes = new TextEncoder().encode(str); let bin = ""; bytes.forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); }
/* Bygger kalenderinbjudan for ett meddelande, eller null om det inte ar ett intervjumejl. */
function icsForMessage(msg, cand, job, org) {
  if (!cand || !job || !cand.interview || !cand.interview.at) return null;
  if (msg.trigger !== "interview" && msg.trigger !== "interview_cancelled") return null;
  const iv = cand.interview;
  const mode = INTERVIEW_MODES[iv.mode] || INTERVIEW_MODES.video;
  const ics = buildICS({
    uid: "rekyl-" + cand.id + "@rekyl.app",
    seq: iv.seq || 0,
    at: iv.at,
    duration: iv.duration,
    method: msg.trigger === "interview_cancelled" ? "CANCEL" : "REQUEST",
    summary: "Intervju: " + job.title + " · " + org.companyName,
    description: mode.label + (iv.location ? " · " + iv.location : "") + "\n\nKontakt: " + org.hrName + " (" + org.hrEmail + ")",
    location: iv.location || mode.label,
    organizerName: org.hrName, organizerEmail: org.hrEmail,
    attendeeName: cand.name, attendeeEmail: cand.email,
  });
  return { name: "intervju.ics", content: b64utf8(ics) };
}
const TRIGGER_FOR = { shortlist: "shortlist", interview: "interview", reserve: "reserve", reject: "reject", hired: "offer" };

/* ---------- Reducer-hjalpare ---------- */
function withLog(state, action, detail) { const who = state.team.find((r) => r.id === state.currentUserId)?.name || "—"; return [{ id: uid(), at: Date.now(), who, action, detail }, ...state.log].slice(0, 200); }
function updateActiveJob(state, fn) { return { ...state, jobs: state.jobs.map((j) => (j.id === state.activeJobId ? fn(j) : j)) }; }
function bumpVersion(job, note, who) { const v = (job.version || 1) + 1; return { ...job, version: v, versions: [...job.versions, { v, at: Date.now(), by: who, note }] }; }
let _TEAM = [];
function addTL(cand, kind, detail, actorId) { const actor = _TEAM.find((r) => r.id === actorId)?.name || "System"; return { ...cand, timeline: [{ id: uid(), kind, detail, at: Date.now(), actor }, ...(cand.timeline || [])] }; }
function mapCand(state, id, fn) { return { ...state, candidates: state.candidates.map((c) => (c.id === id ? fn(c) : c)) }; }
function buildMessage(state, cand, job, trigger, who) {
  const tpl = state.templates.find((t) => t.trigger === trigger && t.active) || state.templates.find((t) => t.trigger === trigger);
  const vars = tplVars(state, cand, job);
  const ok = validEmail(cand.email);
  return { id: uid(), candidateId: cand.id, candidateName: cand.name, jobId: job.id, to: cand.email || "(saknar e-post)", subject: tpl ? renderTpl(tpl.subject, vars) : "Angående din ansökan", body: tpl ? renderTpl(tpl.body, vars) : "", trigger, tplName: tpl?.name || trigger, status: ok ? "queued" : "failed", error: ok ? null : "Saknar giltig e-post", at: Date.now(), by: who };
}
function applyDecision(state, cand, job, status, reason, who, extra) {
  const _note = statusLabel(status) + (reason ? " · " + reason : "") + (extra && extra.interviewTime ? " · " + extra.interviewTime : "");
  let c2 = addTL({ ...cand, status, reason: reason ?? cand.reason, ...(extra || {}) }, status === "hired" ? "hired" : "status_change", _note, who);
  const trigger = TRIGGER_FOR[status];
  let msg = null;
  if (trigger) { msg = buildMessage(state, c2, job, trigger, who); c2 = addTL(c2, "message_sent", `${msg.subject}${msg.status === "failed" ? " · FEL: saknar e-post" : " · köad för utskick"}`, who); }
  return { c2, msg };
}

function reducer(state, ac) {
  _TEAM = state.team || [];
  const who = state.currentUserId;
  switch (ac.type) {
    case "DECIDE": {
      const cand = state.candidates.find((c) => c.id === ac.id); if (!cand) return state;
      const job = state.jobs.find((j) => j.id === cand.jobId);
      const extra = (ac.interviewTime || ac.interview) ? { ...(ac.interviewTime ? { interviewTime: ac.interviewTime } : {}), ...(ac.interview ? { interview: ac.interview } : {}) } : null;
      const { c2, msg } = applyDecision(state, cand, job, ac.status, ac.reason, who, extra);
      const s2 = mapCand(state, ac.id, () => c2);
      return { ...s2, messages: msg ? [msg, ...state.messages] : state.messages, history: [...state.history, { id: ac.id, prev: cand.status }], log: withLog(s2, "Beslut", `${statusLabel(ac.status)} · ${cand.name}`) };
    }
    case "UNDO": { if (!state.history.length) return state; const last = state.history[state.history.length - 1]; return { ...mapCand(state, last.id, (c) => ({ ...c, status: last.prev })), history: state.history.slice(0, -1) }; }
    case "STAR": return mapCand(state, ac.id, (c) => ({ ...c, starred: !c.starred }));
    case "REMOVE_CANDIDATE": { const cc = state.candidates.find((x) => x.id === ac.id); const s2 = { ...state, candidates: state.candidates.filter((x) => x.id !== ac.id) }; return { ...s2, log: withLog(s2, "Kandidat raderad (GDPR)", cc ? cc.name : "") }; }
    case "RATE": return mapCand(state, ac.id, (c) => ({ ...c, rating: ac.rating }));
    case "COMMENT": { const s2 = mapCand(state, ac.id, (c) => addTL({ ...c, comments: [...c.comments, { id: uid(), by: who, text: ac.text, at: Date.now() }] }, "note", ac.text, who)); return { ...s2, log: withLog(s2, "Kommentar", state.candidates.find((c) => c.id === ac.id)?.name) }; }
    case "REVIEW": return mapCand(state, ac.id, (c) => addTL({ ...c, reviews: { ...c.reviews, [who]: ac.verdict } }, "vote", (ac.verdict === "yes" ? "Ja" : ac.verdict === "no" ? "Nej" : "Osäker") + " (team review)", who));
    case "APPLY": {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const cand = { ...ac.cand, jobId: state.activeJobId, timeline: [{ id: uid(), kind: "score_computed", detail: "Matchning beräknad (regelverk v" + job.version + ")", at: Date.now(), actor: "System" }, { id: uid(), kind: "application_received", detail: "Ansökan mottagen via " + ac.cand.source, at: Date.now(), actor: "System" }] };
      const msg = buildMessage({ ...state }, cand, job, "received", who);
      const withMsgTL = addTL(cand, "message_sent", `${msg.subject}${msg.status === "failed" ? " · FEL" : " · köad"}`, "System");
      const s2 = { ...state, candidates: [withMsgTL, ...state.candidates], messages: [msg, ...state.messages], jobs: state.jobs.map((j) => j.id === state.activeJobId ? { ...j, stats: { started: j.stats.started + 1, submitted: j.stats.submitted + 1 } } : j) };
      return { ...s2, log: withLog(s2, "Ny ansökan", ac.cand.name) };
    }
    case "SEND_MESSAGE": {
      const cand = state.candidates.find((c) => c.id === ac.id); const job = state.jobs.find((j) => j.id === cand.jobId);
      const msg = ac.subject ? { id: uid(), candidateId: cand.id, candidateName: cand.name, jobId: job.id, to: cand.email || "(saknar e-post)", subject: ac.subject, body: ac.body, trigger: ac.trigger || "manual", tplName: ac.trigger || "manual", status: validEmail(cand.email) ? "queued" : "failed", error: validEmail(cand.email) ? null : "Saknar giltig e-post", at: Date.now(), by: who } : buildMessage(state, cand, job, ac.trigger, who);
      const s2 = mapCand(state, ac.id, (c) => addTL(c, ac.trigger === "completion" ? "completion_requested" : "message_sent", `${msg.subject}${msg.status === "failed" ? " · FEL" : " · köad"}`, who));
      return { ...s2, messages: [msg, ...state.messages], log: withLog(s2, "Mejl", `${msg.trigger} · ${cand.name}`) };
    }
    case "JOB_PATCH": { const jj = state.jobs.find((j) => j.id === ac.id); if (!jj || isReadonly(jj)) return state; const s2 = { ...state, jobs: state.jobs.map((j) => j.id === ac.id ? jlog({ ...j, ...ac.patch }, ac.kind || "edited", ac.note || "", who) : j) }; return { ...s2, log: withLog(s2, JOB_ACT[ac.kind || "edited"], jj.title) }; }
    case "JOB_STATUS": {
      const jj = state.jobs.find((j) => j.id === ac.id); if (!jj) return state;
      if (!canMove(jj.status, ac.status)) return state;
      const L = JOB_LIFE[ac.status];
      const patch = { status: ac.status };
      if (ac.status === "published") { patch.publishedAt = jj.publishedAt || Date.now(); patch.published = true; }
      if (!L.public) patch.published = false;
      if (["closed", "filled", "cancelled"].includes(ac.status)) patch.closedAt = Date.now();
      if (L.reason || ac.reason) patch.closedReason = ac.reason || "";
      if (ac.status === "filled" && ac.hiredId) patch.hiredId = ac.hiredId;
      const note = JOB_LIFE[jj.status].label + " → " + L.label + (ac.reason ? " · " + ac.reason : "");
      const s2 = { ...state, jobs: state.jobs.map((j) => j.id === ac.id ? jlog({ ...j, ...patch }, "status", note, who) : j) };
      return { ...s2, log: withLog(s2, "Jobbstatus", jj.title + " · " + L.label) };
    }
    case "JOB_BULK": {
      const ids = new Set(ac.ids);
      const jobs = state.jobs.map((j) => {
        if (!ids.has(j.id)) return j;
        if (isReadonly(j) && ac.op !== "restore") return j;
        if (ac.op === "status") { if (!canMove(j.status, ac.value)) return j; const L = JOB_LIFE[ac.value]; return jlog({ ...j, status: ac.value, published: !!L.public, ...(ac.value === "published" ? { publishedAt: j.publishedAt || Date.now() } : {}) }, "bulk", "Status → " + L.label, who); }
        if (ac.op === "owner") return jlog({ ...j, ownerId: ac.value || null }, "bulk", "Ansvarig ändrad", who);
        if (ac.op === "tag_add") return j.tags.includes(ac.value) ? j : jlog({ ...j, tags: [...j.tags, ac.value] }, "bulk", "Tagg tillagd", who);
        if (ac.op === "tag_del") return jlog({ ...j, tags: j.tags.filter((t) => t !== ac.value) }, "bulk", "Tagg borttagen", who);
        if (ac.op === "restore") return jlog({ ...j, status: "draft", published: false }, "restored", "Återställd från arkivet", who);
        return j;
      });
      const s2 = { ...state, jobs };
      return { ...s2, log: withLog(s2, "Bulkåtgärd", ac.ids.length + " tjänster") };
    }
    case "TAG_ADD": { const n = normTag(ac.name); if (!n || state.tags.some((t) => normTag(t.name) === n)) return state; return { ...state, tags: [...state.tags, { id: "t" + uid(), name: ac.name.trim(), color: ac.color || TAG_COLORS[state.tags.length % TAG_COLORS.length], archived: false }] }; }
    case "TAG_SET": return { ...state, tags: state.tags.map((t) => t.id === ac.id ? { ...t, ...ac.patch } : t) };
    case "TAG_DEL": return { ...state, tags: state.tags.filter((t) => t.id !== ac.id), jobs: state.jobs.map((j) => ({ ...j, tags: j.tags.filter((x) => x !== ac.id) })) };
    case "VIEW_ADD": return { ...state, jobViews: [...state.jobViews, { id: "v" + uid(), name: ac.name, f: ac.f }] };
    case "VIEW_DEL": return { ...state, jobViews: state.jobViews.filter((v) => v.id !== ac.id) };
    case "SET_INTERVIEW": {
      const cand = state.candidates.find((c) => c.id === ac.id); if (!cand) return state;
      const job = state.jobs.find((j) => j.id === cand.jobId); if (!job) return state;
      const prev = cand.interview;
      const seq = prev && prev.at ? (prev.seq || 0) + 1 : 0;
      const iv = { ...ac.interview, seq, cancelled: false };
      const note = fmtInterview(iv.at) + " · " + ((INTERVIEW_MODES[iv.mode] || {}).label || iv.mode);
      let c2 = addTL({ ...cand, status: "interview", interview: iv, interviewTime: fmtInterview(iv.at) }, "interview_booked", (seq > 0 ? "Ombokad till " : "") + note, who);
      const msg = buildMessage(state, c2, job, "interview", who);
      c2 = addTL(c2, "message_sent", msg.subject + (msg.status === "failed" ? " · FEL: saknar e-post" : " · köad för utskick"), who);
      const s2 = mapCand(state, ac.id, () => c2);
      return { ...s2, messages: [msg, ...state.messages], log: withLog(s2, seq > 0 ? "Intervju ombokad" : "Intervju bokad", cand.name + " · " + note) };
    }
    case "CANCEL_INTERVIEW": {
      const cand = state.candidates.find((c) => c.id === ac.id); if (!cand || !ivActive(cand)) return state;
      const job = state.jobs.find((j) => j.id === cand.jobId); if (!job) return state;
      const iv = { ...cand.interview, seq: (cand.interview.seq || 0) + 1, cancelled: true };
      let c2 = addTL({ ...cand, interview: iv, interviewTime: "" }, "interview_cancelled", fmtInterview(iv.at), who);
      const msg = buildMessage(state, c2, job, "interview_cancelled", who);
      c2 = addTL(c2, "message_sent", msg.subject + (msg.status === "failed" ? " · FEL: saknar e-post" : " · köad för utskick"), who);
      const s2 = mapCand(state, ac.id, () => c2);
      return { ...s2, messages: [msg, ...state.messages], log: withLog(s2, "Intervju avbokad", cand.name) };
    }
    case "CAREER_INIT": return { ...state, career: state.career || defaultCareer(state.org) };
    case "CAREER_SET": return { ...state, career: { ...state.career, ...ac.patch } };
    case "CAREER_PAGE_ADD": { const p = { id: "p" + uid(), slug: slugify(ac.name) || "sida-" + uid().slice(0, 3), name: ac.name, seoTitle: "", seoDesc: "", published: false, inNav: true, blocks: [newBlock("hero"), newBlock("text")] }; return { ...state, career: { ...state.career, pages: [...state.career.pages, p] } }; }
    case "CAREER_PAGE_SET": return { ...state, career: { ...state.career, pages: state.career.pages.map((p) => p.id === ac.id ? { ...p, ...ac.patch } : p) } };
    case "CAREER_PAGE_DEL": return { ...state, career: { ...state.career, pages: state.career.pages.filter((p) => p.id !== ac.id || p.id === "p_start") } };
    case "CAREER_BLOCK_ADD": return { ...state, career: { ...state.career, pages: state.career.pages.map((p) => p.id === ac.pageId ? { ...p, blocks: [...p.blocks, newBlock(ac.block)] } : p) } };
    case "CAREER_BLOCK_SET": return { ...state, career: { ...state.career, pages: state.career.pages.map((p) => p.id === ac.pageId ? { ...p, blocks: p.blocks.map((b) => b.id === ac.id ? { ...b, ...ac.patch } : b) } : p) } };
    case "CAREER_BLOCK_DEL": return { ...state, career: { ...state.career, pages: state.career.pages.map((p) => p.id === ac.pageId ? { ...p, blocks: p.blocks.filter((b) => b.id !== ac.id) } : p) } };
    case "CAREER_BLOCK_DUP": return { ...state, career: { ...state.career, pages: state.career.pages.map((p) => { if (p.id !== ac.pageId) return p; const i = p.blocks.findIndex((b) => b.id === ac.id); if (i < 0) return p; const c = { ...JSON.parse(JSON.stringify(p.blocks[i])), id: "b" + uid() }; const bs = [...p.blocks]; bs.splice(i + 1, 0, c); return { ...p, blocks: bs }; }) } };
    case "CAREER_BLOCK_MOVE": return { ...state, career: { ...state.career, pages: state.career.pages.map((p) => { if (p.id !== ac.pageId) return p; const i = p.blocks.findIndex((b) => b.id === ac.id); const j = i + ac.dir; if (i < 0 || j < 0 || j >= p.blocks.length) return p; const bs = [...p.blocks]; const [m] = bs.splice(i, 1); bs.splice(j, 0, m); return { ...p, blocks: bs }; }) } };
    case "ADD_CANDIDATE": { const job0 = state.jobs.find((j) => j.id === ac.jobId); if (!job0) return state; const pipe0 = (ensurePipeline(job0)).pipeline; const st0 = startStage(pipe0);
      const c0 = migrateCandidate({ ...ac.cand, jobId: ac.jobId, status: "new", timeline: [], at: Date.now() }, pipe0);
      const jb = ensureScoring(ensurePipeline(job0));
      const av0 = activeVersion(jb);
      let cNew = { ...c0, stageId: st0.id, ownerId: job0.ownerId || null, pipeVersion: pipe0.version };
      if (av0) { const r0 = runScoring(av0.ver, cNew, jb); cNew = { ...cNew, scores: [{ runId: "run" + uid(), key: runKey(av0.profile.id, av0.ver.v, cNew), at: Date.now(), by: null, byName: "System", reason: "ny ansökan", profileId: av0.profile.id, profileName: av0.profile.name, version: av0.ver.v, current: true, ...r0 }] }; }
      const s2 = { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jb : j), candidates: [cNew, ...state.candidates] };
      return { ...s2, log: withLog(s2, "Ansökan mottagen", ac.cand.name) };
    }
    case "PIPE_INIT": return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? ensurePipeline(j) : j) };
    case "PIPE_SET": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...j.pipeline, ...ac.patch, dirty: true, updatedAt: Date.now() } }, "pipeline", ac.note || "Pipeline ändrad", who) : j) }; }
    case "STAGE_ADD": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.pipeline; const st = mkStage({ key: "k" + uid(), name: ac.name || "Nytt steg", type: ac.stageType || "custom", color: STAGE_COLORS[p.stages.length % STAGE_COLORS.length] });
      st.order = Math.max(...p.stages.filter((x) => !STAGE_TYPES[x.type].final).map((x) => x.order), -1) + 1;
      const stages = [...p.stages.map((x) => x.order >= st.order && !STAGE_TYPES[x.type].final ? x : x), st].map((x) => x);
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...p, stages, dirty: true } }, "pipeline", "Steg tillagt: " + st.name, who) : j) }; }
    case "STAGE_SET": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...j.pipeline, dirty: true, stages: j.pipeline.stages.map((st) => st.id === ac.id ? { ...st, ...ac.patch, updatedAt: Date.now() } : st) } }, "pipeline", "Steg ändrat", who) : j) }; }
    case "STAGE_MOVE": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.pipeline; const flow = p.stages.filter((st) => !STAGE_TYPES[st.type].final).sort((a, b) => a.order - b.order);
      const i = flow.findIndex((st) => st.id === ac.id); const k = i + ac.dir;
      if (i < 0 || k < 0 || k >= flow.length) return state;
      const arr = [...flow]; const [m] = arr.splice(i, 1); arr.splice(k, 0, m);
      const orders = {}; arr.forEach((st, n) => { orders[st.id] = n; });
      const stages = p.stages.map((st) => orders[st.id] != null ? { ...st, order: orders[st.id] } : st);
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...p, stages, dirty: true } }, "pipeline", "Stegordning ändrad", who) : j) }; }
    case "STAGE_DUP": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.pipeline; const src = stageById(p, ac.id); if (!src) return state;
      const c = { ...JSON.parse(JSON.stringify(src)), id: "s" + uid(), key: "k" + uid(), name: src.name + " (kopia)", system: false, locked: false, order: src.order + 0.5 };
      const stages = [...p.stages, c].sort((a, b) => a.order - b.order).map((st, i) => ({ ...st, order: i }));
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...p, stages, dirty: true } }, "pipeline", "Steg duplicerat", who) : j) }; }
    case "STAGE_ARCHIVE": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.pipeline; const st = stageById(p, ac.id); if (!st || st.system) return state;
      /* Kandidater i steget MÅSTE flyttas — annars vägrar systemet. */
      const stuck = state.candidates.filter((c) => c.jobId === ac.jobId && c.stageId === ac.id);
      if (stuck.length && !ac.moveTo) return state;
      let s2 = { ...state };
      if (stuck.length) { const to = stageById(p, ac.moveTo); if (!to) return state;
        s2 = { ...s2, candidates: s2.candidates.map((c) => c.stageId === ac.id && c.jobId === ac.jobId
          ? { ...c, stageId: to.id, status: legacyOf(to), rev: (c.rev || 0) + 1,
              visits: [{ id: "v" + uid(), stageId: to.id, stageKey: to.key, stageName: to.name, enteredAt: Date.now(), exitedAt: null, movedBy: who, reason: "Steget arkiverades", comment: "", pauses: [], exception: null, pipeVersion: p.version },
                ...(c.visits || []).map((v) => v.exitedAt ? v : { ...v, exitedAt: Date.now() })] }
          : c) }; }
      const stages = p.stages.map((x) => x.id === ac.id ? { ...x, archived: !x.archived, archivedAt: Date.now() } : x);
      return { ...s2, jobs: s2.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...p, stages, dirty: true } }, "pipeline", (st.archived ? "Steg återställt: " : "Steg arkiverat: ") + st.name + (stuck.length ? " · " + stuck.length + " kandidater flyttades" : ""), who) : j) }; }
    case "PIPE_PUBLISH": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.pipeline; const v = p.version + 1;
      const snap = { v, at: Date.now(), by: (_TEAM.find((m) => m.id === who) || {}).name || "System", note: ac.note || "", stages: JSON.parse(JSON.stringify(p.stages)) };
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...p, version: v, dirty: false, versions: [snap, ...(p.versions || [])].slice(0, 30) } }, "pipeline", "Pipeline publicerad · v" + v, who) : j) }; }
    case "PIPE_RESTORE": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.pipeline; const snap = (p.versions || []).find((x) => x.v === ac.v); if (!snap) return state;
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...j, pipeline: { ...p, stages: JSON.parse(JSON.stringify(snap.stages)), dirty: true } }, "pipeline", "Återställd till v" + ac.v, who) : j) }; }

    case "MOVE_CANDIDATE": {
      if (ac.reqId && (state.moveIds || []).includes(ac.reqId)) return state; /* idempotens */
      const cand = state.candidates.find((c) => c.id === ac.id); if (!cand) return state;
      const job = state.jobs.find((j) => j.id === cand.jobId); if (!job || !job.pipeline) return state;
      const to = stageById(job.pipeline, ac.stageId); if (!to) return state;
      const me2 = _TEAM.find((m) => m.id === who) || { role: "admin" };
      const blockers = moveBlockers(state, cand, job, to, me2, ac);
      if (blockers.length) return state; /* motorn vägrar — aldrig delvis genomförd flytt */
      const from = stageById(job.pipeline, cand.stageId);
      const now = Date.now();
      const owner = ownerFor(to, job, cand, ac);
      const visits = [{ id: "v" + uid(), stageId: to.id, stageKey: to.key, stageName: to.name, enteredAt: now, exitedAt: null, movedBy: who, reason: ac.reason || "", comment: ac.comment || "", pauses: [], exception: null, pipeVersion: job.pipeline.version },
        ...(cand.visits || []).map((v) => v.exitedAt ? v : { ...v, exitedAt: now })];
      const legacy = legacyOf(to);
      let c2 = { ...cand, stageId: to.id, status: legacy, ownerId: owner, rev: (cand.rev || 0) + 1, visits,
        reason: to.type === "rejected" ? (ac.reason || cand.reason) : cand.reason,
        ...(to.type === "hired" ? { hiredAt: now } : {}) };
      c2 = addTL(c2, "status_change", to.name + (ac.reason ? " · " + ac.reason : "") + (ac.comment ? " · " + ac.comment : ""), who);
      /* Meddelande enligt gamla mallmotorn — endast när målsteget har en legacy-trigger. */
      const trig = TRIGGER_FOR[legacy];
      let msg = null;
      if (trig && ac.notify !== false && from && legacyOf(from) !== legacy) { msg = buildMessage(state, c2, job, trig, who); c2 = addTL(c2, "message_sent", msg.subject + (msg.status === "failed" ? " · FEL: saknar e-post" : " · köad för utskick"), who); }
      const ev = { id: "m" + uid(), reqId: ac.reqId || ("r" + uid()), candId: cand.id, candName: cand.name, jobId: job.id, at: now,
        fromId: from ? from.id : null, fromName: from ? from.name : "—", toId: to.id, toName: to.name,
        by: who, byName: (_TEAM.find((m) => m.id === who) || {}).name || "System", source: ac.source || "manual",
        reason: ac.reason || "", comment: ac.comment || "", bulkId: ac.bulkId || null, undoOf: ac.undoOf || null,
        pipeVersion: job.pipeline.version, msgId: msg ? msg.id : null };
      const s2 = { ...state, candidates: state.candidates.map((c) => c.id === cand.id ? c2 : c),
        moves: [ev, ...(state.moves || [])].slice(0, 2000),
        moveIds: [ac.reqId, ...(state.moveIds || [])].filter(Boolean).slice(0, 300),
        messages: msg ? [msg, ...state.messages] : state.messages,
        jobs: state.jobs.map((j) => j.id === job.id ? jlog(j, "status", "Kandidat flyttad: " + cand.name + " → " + to.name, who) : j) };
      return { ...s2, log: withLog(s2, "Kandidat flyttad", cand.name + " → " + to.name) };
    }
    case "SLA_PAUSE": { const c = state.candidates.find((x) => x.id === ac.id); if (!c) return state;
      return { ...state, candidates: state.candidates.map((x) => x.id !== ac.id ? x : { ...x, rev: (x.rev || 0) + 1, visits: (x.visits || []).map((v) => v.exitedAt ? v : { ...v, pauses: ac.end
        ? (v.pauses || []).map((p) => p.to ? p : { ...p, to: Date.now() })
        : [...(v.pauses || []), { from: Date.now(), to: null, reason: ac.reason || "", by: who }] }) }) }; }
    case "SLA_EXCEPT": { const c = state.candidates.find((x) => x.id === ac.id); if (!c) return state;
      return { ...state, candidates: state.candidates.map((x) => x.id !== ac.id ? x : { ...x, rev: (x.rev || 0) + 1, visits: (x.visits || []).map((v) => v.exitedAt ? v : { ...v, exception: ac.clear ? null : { dueAt: ac.dueAt || null, exempt: !!ac.exempt, reason: ac.reason || "", by: who, at: Date.now() } }) }) }; }
    case "SET_CAND_OWNER": return { ...state, candidates: state.candidates.map((c) => c.id === ac.id ? addTL({ ...c, ownerId: ac.ownerId || null, rev: (c.rev || 0) + 1 }, "note", "Ansvarig: " + ((_TEAM.find((m) => m.id === ac.ownerId) || {}).name || "ingen"), who) : c) };
    case "SCORING_INIT": return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? ensureScoring(j) : j) };
    case "SP_ADD": { const jj = ensureScoring(state.jobs.find((j) => j.id === ac.jobId) || {}); if (!jj.id || isReadonly(jj)) return state;
      const base = ac.from ? JSON.parse(JSON.stringify(jj.scoring.profiles.find((p) => p.id === ac.from))) : null;
      const p = base ? { ...base, id: "sp" + uid(), name: ac.name, primary: false, version: 0, versions: [], draft: { ...base.draft, updatedAt: Date.now() }, createdAt: Date.now() } : { ...defaultProfile(jj, ac.name), primary: false };
      return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? jlog({ ...jj, scoring: { profiles: [...jj.scoring.profiles, p] } }, "scoring", "Profil skapad: " + p.name, who) : j) }; }
    case "SP_SET": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      return { ...state, jobs: state.jobs.map((j) => j.id !== ac.jobId ? j : jlog({ ...j, scoring: { profiles: j.scoring.profiles.map((p) => p.id === ac.id ? { ...p, ...ac.patch, updatedAt: Date.now() } : (ac.patch.primary ? { ...p, primary: false } : p)) } }, "scoring", ac.note || "Profil ändrad", who)) }; }
    case "SP_DRAFT": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      return { ...state, jobs: state.jobs.map((j) => j.id !== ac.jobId ? j : { ...j, scoring: { profiles: j.scoring.profiles.map((p) => p.id === ac.id ? { ...p, draft: { ...p.draft, ...ac.patch, updatedAt: Date.now() } } : p) } }) }; }
    case "SP_PUBLISH": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.scoring.profiles.find((x) => x.id === ac.id); if (!p) return state;
      if (profileWarnings(p.draft, jj).some((w) => w.kind === "err")) return state; /* aldrig publicera en profil som inte går att beräkna */
      const v = p.version + 1;
      const snap = JSON.parse(JSON.stringify({ v, at: Date.now(), by: (_TEAM.find((m) => m.id === who) || {}).name || "System", note: ac.note || "", groups: p.draft.groups, criteria: p.draft.criteria, norm: p.draft.norm || p.norm }));
      return { ...state, jobs: state.jobs.map((j) => j.id !== ac.jobId ? j : jlog({ ...j, scoring: { profiles: j.scoring.profiles.map((x) => x.id === ac.id ? { ...x, version: v, versions: [snap, ...(x.versions || [])].slice(0, 30) } : x) } }, "scoring", "Scoringversion publicerad · v" + v, who)) }; }
    case "SP_RESTORE": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const p = jj.scoring.profiles.find((x) => x.id === ac.id); const snap = p && (p.versions || []).find((x) => x.v === ac.v); if (!snap) return state;
      return { ...state, jobs: state.jobs.map((j) => j.id !== ac.jobId ? j : jlog({ ...j, scoring: { profiles: j.scoring.profiles.map((x) => x.id === ac.id ? { ...x, draft: JSON.parse(JSON.stringify({ groups: snap.groups, criteria: snap.criteria, norm: snap.norm, updatedAt: Date.now() })) } : x) } }, "scoring", "Utkast från v" + ac.v, who)) }; }
    case "SP_DEL": { const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const rest = jj.scoring.profiles.filter((p) => p.id !== ac.id);
      if (!rest.length) return state; /* minst en profil måste finnas */
      if (!rest.some((p) => p.primary)) rest[0] = { ...rest[0], primary: true };
      return { ...state, jobs: state.jobs.map((j) => j.id !== ac.jobId ? j : jlog({ ...j, scoring: { profiles: rest } }, "scoring", "Profil borttagen", who)) }; }
    case "SG_ADD": case "SG_SET": case "SG_DEL": case "SG_MOVE":
    case "SC_ADD": case "SC_SET": case "SC_DEL": case "SC_MOVE": case "SC_DUP": {
      const jj = state.jobs.find((j) => j.id === ac.jobId); if (!jj || isReadonly(jj)) return state;
      const upd = (d) => {
        let groups = [...(d.groups || [])], criteria = [...(d.criteria || [])];
        if (ac.type === "SG_ADD") groups = [...groups, { id: "sg" + uid(), name: ac.name || "Ny grupp", desc: "", order: groups.length, weight: 1, agg: "sum", active: true }];
        if (ac.type === "SG_SET") groups = groups.map((g) => g.id === ac.id ? { ...g, ...ac.patch } : g);
        if (ac.type === "SG_DEL") { groups = groups.filter((g) => g.id !== ac.id); criteria = criteria.map((c) => c.groupId === ac.id ? { ...c, groupId: (groups[0] || {}).id || null } : c); }
        if (ac.type === "SG_MOVE") { const i = groups.findIndex((g) => g.id === ac.id), k = i + ac.dir; if (i >= 0 && k >= 0 && k < groups.length) { const [m] = groups.splice(i, 1); groups.splice(k, 0, m); groups = groups.map((g, n) => ({ ...g, order: n })); } }
        if (ac.type === "SC_ADD") { const f = (jj.criteria || []).find((x) => x.id === ac.source); if (f) criteria = [...criteria, mkCriterion(f, ac.groupId, criteria.length)]; }
        if (ac.type === "SC_SET") criteria = criteria.map((c) => c.id === ac.id ? { ...c, ...ac.patch } : c);
        if (ac.type === "SC_DEL") criteria = criteria.filter((c) => c.id !== ac.id);
        if (ac.type === "SC_DUP") { const c = criteria.find((x) => x.id === ac.id); if (c) criteria = [...criteria, { ...JSON.parse(JSON.stringify(c)), id: "sc" + uid(), name: c.name + " (kopia)", order: criteria.length }]; }
        if (ac.type === "SC_MOVE") criteria = criteria.map((c) => c.id === ac.id ? { ...c, groupId: ac.groupId } : c);
        return { ...d, groups, criteria, updatedAt: Date.now() };
      };
      return { ...state, jobs: state.jobs.map((j) => j.id !== ac.jobId ? j : { ...j, scoring: { profiles: j.scoring.profiles.map((p) => p.id === ac.profileId ? { ...p, draft: upd(p.draft) } : p) } }) }; }

    case "SCORE_RUN": {
      const job = state.jobs.find((j) => j.id === ac.jobId); if (!job) return state;
      const av = activeVersion(job); if (!av) return state;
      const ids = new Set(ac.candIds || state.candidates.filter((c) => c.jobId === job.id).map((c) => c.id));
      const at = Date.now();
      const byName = (_TEAM.find((m) => m.id === who) || {}).name || "System";
      let changed = 0;
      const candidates = state.candidates.map((c) => {
        if (!ids.has(c.id) || c.jobId !== job.id) return c;
        const key = runKey(av.profile.id, av.ver.v, c);
        const prev = (c.scores || []);
        if (prev.some((s) => s.key === key && s.current)) return c; /* idempotent — samma data + version = samma körning */
        const r = runScoring(av.ver, c, job);
        changed++;
        const rec = { runId: "run" + uid(), key, at, by: who, byName, reason: ac.reason || "manuell", profileId: av.profile.id, profileName: av.profile.name, version: av.ver.v, current: true, ...r };
        return { ...c, scores: [rec, ...prev.map((s) => ({ ...s, current: false }))].slice(0, 10) };
      });
      const s2 = { ...state, candidates, jobs: state.jobs.map((j) => j.id === job.id ? jlog(j, "scoring", "Scoring beräknad · " + changed + " kandidater · v" + av.ver.v, who) : j) };
      return { ...s2, log: withLog(s2, "Scoring beräknad", changed + " kandidater · " + av.profile.name + " v" + av.ver.v) };
    }
    case "MSG_STATUS": {
      const prev = state.messages.find((m) => m.id === ac.id); if (!prev) return state;
      const messages = state.messages.map((m) => m.id === ac.id ? { ...m, status: ac.status, error: ac.error || null, sentAt: ac.status === "sent" ? Date.now() : (m.sentAt || null), providerId: ac.providerId || m.providerId || null } : m);
      let s2 = { ...state, messages };
      if (ac.status === "sent" && prev.candidateId) s2 = mapCand(s2, prev.candidateId, (c) => addTL(c, "message_delivered", prev.subject, null));
      return s2;
    }
    case "SET_ACTIVE_JOB": return { ...state, activeJobId: ac.id };
    case "SET_JOB_STATUS": { const jj = state.jobs.find((j) => j.id === ac.jobId); const s2 = { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? { ...j, status: ac.status } : j) }; return { ...s2, log: withLog(s2, "Tjänst: " + (JOB_STATUS[ac.status] || ac.status), jj ? jj.title : "") }; }
    case "SET_JOB_PUBLISHED": return { ...state, jobs: state.jobs.map((j) => j.id === ac.jobId ? { ...j, published: ac.published } : j) };
    case "DUPLICATE_JOB": { const src = state.jobs.find((j) => j.id === ac.jobId); if (!src) return state; const o = ac.opts || {}; const nid = "j" + uid(); const nslug = (src.title || "tjanst").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22) + "-" + Math.random().toString(36).slice(2, 6); const who2 = state.team.find((r) => r.id === who)?.name || "—"; const c0 = JSON.parse(JSON.stringify(src));
            const clone = migrateJob({ ...c0, id: nid, slug: nslug, title: (ac.name || src.title + " (kopia)"), publicTitle: (ac.name || src.title + " (kopia)"), ref: "REK-" + nid.slice(-4).toUpperCase(),
              status: "draft", published: false, createdAt: Date.now(), updatedAt: Date.now(), publishedAt: null, closedAt: null, closedReason: "", hiredId: null,
              stats: { started: 0, submitted: 0 }, version: 1, versions: [{ v: 1, at: Date.now(), by: who2, note: "Duplicerad från " + src.title }],
              activity: [{ id: "a" + uid(), at: Date.now(), kind: "duplicated", note: "Duplicerad från " + src.title, by: who2, byId: who }],
              annons: o.annons === false ? { ...c0.annons, description: "", requirements: [], meriter: [], faq: [] } : c0.annons,
              criteria: o.form === false ? [] : c0.criteria,
              profiles: o.scoring === false ? [{ id: "std", name: "Standard", weights: {} }] : c0.profiles,
        scoring: o.scoring === false ? null : (c0.scoring ? { profiles: c0.scoring.profiles.map((p) => ({ ...p, id: "sp" + uid(), version: 0, versions: [] })) } : null),
              rules: o.knockout === false ? [] : c0.rules,
              autoRules: o.automations === false ? [] : c0.autoRules,
              tags: o.tags === false ? [] : c0.tags,
              ownerId: o.team === false ? null : c0.ownerId, managerId: o.team === false ? null : c0.managerId, teamIds: o.team === false ? [] : (c0.teamIds || []),
            }); const s2 = { ...state, jobs: [...state.jobs, clone] }; return { ...s2, log: withLog(s2, "Tjänst duplicerad", clone.title) }; }
    case "DELETE_JOB": { const jj = state.jobs.find((j) => j.id === ac.jobId); const jobs = state.jobs.filter((j) => j.id !== ac.jobId); const candidates = state.candidates.filter((c) => c.jobId !== ac.jobId); const activeJobId = state.activeJobId === ac.jobId ? (jobs[0] ? jobs[0].id : null) : state.activeJobId; const s2 = { ...state, jobs, candidates, activeJobId }; return { ...s2, log: withLog(s2, "Tjänst raderad (GDPR)", jj ? jj.title : "") }; }
    case "SET_USER": return { ...state, currentUserId: ac.id };
    case "SET_ME": { const has = state.team.some((m) => m.id === ac.id); const team = has ? state.team.map((m) => m.id === ac.id ? { ...m, role: ac.role || m.role, email: ac.email || m.email, name: m.name || ac.email } : m) : [...state.team, { id: ac.id, name: ac.name || (ac.email ? ac.email.split("@")[0] : "Jag"), email: ac.email, role: ac.role || "admin", initials: (((ac.name || ac.email || "J")[0]) || "J").toUpperCase() }]; return { ...state, currentUserId: ac.id, team }; }
    case "SET_TEAM": return { ...state, team: ac.team || [] };
    case "ADD_JOB": { const id = "j" + uid(); const job = makeJob(id, ac.title, ac.team || "Nytt team", ((ac.title || "tjänst").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 26) + "-" + Math.random().toString(36).slice(2, 6)), ac.tmplId, { company: state.org.companyName }); const s2 = { ...state, jobs: [...state.jobs, job], activeJobId: id }; return { ...s2, log: withLog(s2, "Ny tjänst", ac.title) }; }
    case "SET_WEIGHT": return updateActiveJob(state, (job) => job.activeProfileId === "std" ? { ...job, criteria: job.criteria.map((c) => c.id === ac.critId ? { ...c, weight: ac.weight } : c) } : { ...job, profiles: job.profiles.map((p) => p.id === job.activeProfileId ? { ...p, weights: { ...p.weights, [ac.critId]: ac.weight } } : p) });
    case "SET_FIELD_FLAG": return updateActiveJob(state, (job) => bumpVersion({ ...job, criteria: job.criteria.map((c) => c.id === ac.critId ? { ...c, ...ac.patch } : c) }, "Ändrade fält: " + ac.critId, state.team.find((r) => r.id === who)?.name));
    case "TOGGLE_SKILL_MUST": return updateActiveJob(state, (job) => ({ ...job, criteria: job.criteria.map((c) => c.id === "skills" ? { ...c, options: c.options.map((o, i) => i === ac.idx ? { ...o, must: !o.must } : o) } : c) }));
    case "ADD_FIELD": return updateActiveJob(state, (job) => bumpVersion({ ...job, criteria: [...job.criteria.filter((c) => c.block !== "text"), ac.field, ...job.criteria.filter((c) => c.block === "text")] }, "La till fält: " + ac.field.label, state.team.find((r) => r.id === who)?.name));
    case "REMOVE_FIELD": return updateActiveJob(state, (job) => bumpVersion({ ...job, criteria: job.criteria.filter((c) => c.id !== ac.critId) }, "Tog bort fält", state.team.find((r) => r.id === who)?.name));
    case "MOVE_FIELD": return updateActiveJob(state, (job) => { const arr = [...job.criteria]; const i = arr.findIndex((c) => c.id === ac.critId); const j = i + ac.dir; if (i < 0 || j < 0 || j >= arr.length) return job; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...job, criteria: arr }; });
    case "SET_FORM": return updateActiveJob(state, (job) => { const j = { ...job, ...(ac.patch || {}) }; return ac.bump ? bumpVersion(j, "Formulär publicerat", state.team.find((r) => r.id === who)?.name) : j; });
    case "SET_PROFILE": return updateActiveJob(state, (job) => ({ ...job, activeProfileId: ac.id }));
    case "SAVE_PROFILE": return updateActiveJob(state, (job) => { const weights = {}; job.criteria.forEach((c) => { if (c.scored && c.weight != null) weights[c.id] = weightOf(job, c); }); const id = "p" + uid(); return { ...job, profiles: [...job.profiles, { id, name: ac.name, weights }], activeProfileId: id }; });
    case "ADD_RULE": return updateActiveJob(state, (job) => ({ ...job, rules: [...job.rules, { ...ac.rule, id: uid() }] }));
    case "REMOVE_RULE": return updateActiveJob(state, (job) => ({ ...job, rules: job.rules.filter((r) => r.id !== ac.id) }));
    case "SET_THRESHOLD": return updateActiveJob(state, (job) => ({ ...job, autoRejectBelow: ac.value }));
    case "SET_BRAND": return updateActiveJob(state, (job) => ({ ...job, brand: { ...job.brand, ...ac.patch } }));
    case "ADD_AUTORULE": return updateActiveJob(state, (job) => ({ ...job, autoRules: [...job.autoRules, { ...ac.rule, id: uid() }] }));
    case "REMOVE_AUTORULE": return updateActiveJob(state, (job) => ({ ...job, autoRules: job.autoRules.filter((r) => r.id !== ac.id) }));
    case "TOGGLE_AUTOPILOT": return updateActiveJob(state, (job) => ({ ...job, autopilotOn: !job.autopilotOn }));
    case "RUN_AUTORULES": {
      const job = state.jobs.find((j) => j.id === state.activeJobId); let applied = 0; const newMsgs = [];
      const candidates = state.candidates.map((c) => {
        if (c.jobId !== job.id || c.status !== "new") return c;
        const sc = scoreCandidate(job, c.answers); const hits = evalAutoRules(job, { ...c, ...sc }); if (!hits.length) return c;
        const rule = hits[0];
        if (["shortlist", "reject", "reserve", "interview"].includes(rule.then)) { applied++; const { c2, msg } = applyDecision(state, c, job, rule.then, rule.then === "reject" ? "under tröskeln" : null, null); if (msg) newMsgs.push(msg); return addTL(c2, "auto_rule", `Auto: ${statusLabel(rule.then)}`, null); }
        if (rule.then === "flag") { applied++; return addTL({ ...c, starred: true }, "auto_rule", "Auto: flaggad", null); }
        return c;
      });
      const s2 = { ...state, candidates, messages: [...newMsgs, ...state.messages] }; return { ...s2, log: withLog(s2, "Auto-pipeline körd", `${applied} kandidater flyttade`) };
    }
    case "ADD_TEMPLATE": return { ...state, templates: [...state.templates, { ...ac.tpl, id: "t_" + uid() }] };
    case "UPDATE_TEMPLATE": return { ...state, templates: state.templates.map((t) => t.id === ac.id ? { ...t, ...ac.patch } : t) };
    case "REMOVE_TEMPLATE": return { ...state, templates: state.templates.filter((t) => t.id !== ac.id) };
    case "SET_ORG": return { ...state, org: { ...state.org, ...ac.patch } };
    case "LOAD_STATE": { const d = ac.data || {}; const tpl = d.templates ? [...d.templates, ...DEFAULT_TEMPLATES.filter((t) => !d.templates.some((x) => x.trigger === t.trigger))] : state.templates;
      return { ...hydrate(state, { ...d, jobs: d.jobs || [], candidates: d.candidates || [] }), templates: tpl, team: state.team, currentUserId: state.currentUserId };
    }
    case "SYNC_APPLICATIONS": { const job = ensurePipeline(state.jobs.find((j) => j.slug === ac.slug) || {}); if (!job.id) return state; const existing = new Set(state.candidates.map((c) => c.id)); const add = (ac.rows || []).filter((r) => !existing.has("sb_" + r.id)).map((r) => migrateCandidate(({ id: "sb_" + r.id, jobId: job.id, name: r.name || "Namnlös", email: r.email || null, phone: r.phone || null, answers: r.answers || {}, source: r.source || "Länk", status: "new", managerStatus: null, starred: false, rating: 0, comments: [], reviews: {}, reason: null, interviewTime: null, consentAt: r.consent_at ? new Date(r.consent_at).getTime() : null, formVersion: job.version, appliedAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(), timeline: [{ id: uid(), kind: "application_received", detail: "Ansökan mottagen via " + (r.source || "länk"), at: Date.now(), actor: "System" }] }), job.pipeline)); if (!add.length) return state; return { ...state, candidates: [...add, ...state.candidates], jobs: state.jobs.map((j) => j.id === job.id ? { ...j, stats: { started: j.stats.started + add.length, submitted: j.stats.submitted + add.length } } : j) }; }
    default: return state;
  }
}
const INITIAL = {
  jobs: JOBS0.map((j) => ({ ...j, autopilotOn: false })), activeJobId: null, candidates: CANDIDATES0, team: [], currentUserId: null,
  history: [], templates: DEFAULT_TEMPLATES, messages: [],
  career: null, tags: [], jobViews: [], moves: [], moveIds: [],
  org: { companyName: "Nordpuls AB", hrName: "Mona Berg", hrEmail: "mona.berg@nordpuls.se", fromEmail: "noreply@nordpuls.se", appUrl: "https://rekyl.app", defaultInterviewTime: "onsdag 14:00" },
  log: [{ id: uid(), at: Date.now() - 3600e3, who: "System", action: "Tjänst öppnad", detail: "Account Manager · B2B" }],
};

/* ---------- Delade UI-hjalpare ---------- */
function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) { const el = document.createElement("textarea"); el.value = t; document.body.appendChild(el); el.select(); try { document.execCommand("copy"); } catch (e2) {} el.remove(); } }
function downloadText(name, text, mime = "text/plain") { try { const b = new Blob([text], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500); return true; } catch (e) { return false; } }
function Menu({ trigger, children, align }) { const [open, setOpen] = useState(false); const ref = useRef(); useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []); return <div className="ats-menu" ref={ref}><div onClick={() => setOpen((o) => !o)}>{trigger}</div>{open && <div className={"ats-menu-pop" + (align === "right" ? " is-right" : "")} onClick={() => setOpen(false)}>{children}</div>}</div>; }
function Modal({ title, onClose, children, wide }) { return <div className="ats-modal-bg" onClick={onClose}><div className={"ats-modal" + (wide ? " is-wide" : "")} onClick={(e) => e.stopPropagation()}><div className="ats-modal-h"><h3>{title}</h3><button onClick={onClose}><X size={18} /></button></div>{children}</div></div>; }
function ScoreDial({ value, knockout, size = 76 }) { const [shown, setShown] = useState(0); useEffect(() => { let raf; const t0 = performance.now(); const tick = (t) => { const p = Math.min(1, (t - t0) / 650); const e = 1 - Math.pow(1 - p, 3); setShown(Math.round(value * e)); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [value]); const R = 30, Cc = 2 * Math.PI * R; const tier = knockout ? "ko" : value >= 78 ? "high" : value >= 55 ? "mid" : "low"; return <div className={"ats-dial is-" + tier} style={{ width: size, height: size }}><svg width={size} height={size} viewBox="0 0 76 76"><circle cx="38" cy="38" r={R} className="ats-dial-track" /><circle cx="38" cy="38" r={R} className="ats-dial-arc" strokeDasharray={Cc} strokeDashoffset={Cc - (Cc * shown) / 100} transform="rotate(-90 38 38)" /></svg><div className="ats-dial-num"><b>{shown}</b><small>%</small></div></div>; }
function Stars({ value, onSet, readOnly }) { return <div className="ats-stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} disabled={readOnly} className={n <= value ? "is-on" : ""} onClick={() => onSet && onSet(n === value ? 0 : n)}><Star size={14} fill={n <= value ? "currentColor" : "none"} /></button>)}</div>; }
function TagPills({ tags }) { return tags?.length ? <span className="ats-tags">{tags.map((t) => <span key={t} className="ats-tagpill"><Tag size={10} />{t}</span>)}</span> : null; }
function MissingChips({ items }) { return items?.length ? <span className="ats-missing">{items.map((m) => <span key={m} className="ats-misschip"><CircleAlert size={10} /> Saknar {m}</span>)}</span> : null; }
function VoteSummary({ reviews }) { const v = reviews || {}; const y = Object.values(v).filter((x) => x === "yes").length, n = Object.values(v).filter((x) => x === "no").length, m = Object.values(v).filter((x) => x === "maybe").length; if (y + n + m === 0) return null; return <span className="ats-votesum"><Users size={12} /> {y} ja · {m} osäker · {n} nej</span>; }
function QRCode({ text, size = 124 }) { const m = useMemo(() => { try { return generateQR(text); } catch (e) { return null; } }, [text]); if (!m) return <div className="ats-qr-fallback">Lanken är för lång</div>; const N = m.length, cell = size / (N + 8), rects = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (m[r][c] === 1) rects.push(<rect key={r + "-" + c} x={(c + 4) * cell} y={(r + 4) * cell} width={cell + 0.4} height={cell + 0.4} />); return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ats-qr"><rect width={size} height={size} rx="10" fill="#fff" /><g fill="#16171B">{rects}</g></svg>; }
const REASONS = ["Saknar krav", "Fel tillgänglighet", "För lite erfarenhet", "För högt löneanspråk", "Ej relevant profil", "Ofullstandig ansökan", "Annat"];
const NAV = [
  { id: "dashboard", label: "Översikt", icon: LayoutDashboard },
  { id: "jobs", label: "Tjänster", icon: Briefcase },
  { id: "queue", label: "Kö", icon: Layers },
  { id: "pipeline", label: "Pipeline", icon: Workflow },
  { id: "candidates", label: "Kandidater", icon: ClipboardList },
  { id: "calendar", label: "Kalender", icon: CalendarClock },
  { id: "form", label: "Formulär", icon: Blocks },
  { id: "scoring", label: "Scoring", icon: Gauge },
  { id: "career", label: "Karriärsida", icon: Globe },
  { id: "stats", label: "Statistik", icon: BarChart3 },
  { id: "sources", label: "Källkvalitet", icon: TrendingUp },
  { id: "team", label: "Team & logg", icon: Activity },
  { id: "settings", label: "Inställningar", icon: Settings },
];

/* ---------- Inline sidrubrik + jobbväljare ---------- */
function JobSwitch({ state, D }) { const job = state.jobs.find((j) => j.id === state.activeJobId) || state.jobs[0]; if (!job) return null; return <Menu trigger={<button className="ats-jobswitch">{job.title} <ChevronDown size={13} /></button>}>{state.jobs.map((j) => <button key={j.id} className={"ats-menu-item" + (j.id === state.activeJobId ? " is-active" : "")} onClick={() => D({ type: "SET_ACTIVE_JOB", id: j.id })}><Briefcase size={13} /> {j.title}</button>)}</Menu>; }
function PageHeader({ title, meta, right }) { return <div className="ats-ph"><div className="ats-ph-l"><h1 className="ats-ph-title">{title}</h1>{meta && <div className="ats-ph-meta">{meta}</div>}</div>{right && <div className="ats-ph-r">{right}</div>}</div>; }
function Dot() { return <span className="ats-ph-dot">·</span>; }

function FirstJobScreen({ onCreate, onLogout, email }) {
  const [title, setTitle] = useState(""); const [tmpl, setTmpl] = useState(TEMPLATES[0].id);
  return <div className="ats-root"><Style /><div className="ats-first"><div className="ats-first-card">
    <div className="ats-login-brand"><span className="ats-logo">R</span> Rekyl</div>
    <h2>Välkommen! Skapa din första tjänst</h2>
    <p className="ats-first-sub">Välj en mall så laddas scoring, knockout och kandidatkort automatiskt. Du kan ändra allt sedan.</p>
    <label className="ats-field"><span className="ats-field-l">Jobbtitel</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Innesäljare Göteborg" /></label>
    <div className="ats-field-l" style={{ marginTop: 6 }}>Starta från mall</div>
    <div className="ats-tmplgrid">{TEMPLATES.map((t) => { const Ic = ICONS[t.icon] || Briefcase; return <button key={t.id} className={"ats-tmpl" + (tmpl === t.id ? " is-on" : "")} onClick={() => setTmpl(t.id)}><span className="ats-tmpl-ic"><Ic size={16} /></span><b>{t.name}</b><span>{t.desc}</span></button>; })}</div>
    <button className={"ats-send" + (title.trim().length > 1 ? "" : " is-off")} onClick={() => title.trim().length > 1 && onCreate(title.trim(), tmpl)}>Skapa tjänst <ArrowRight size={16} /></button>
    <button className="ats-login-switch" onClick={onLogout}>Logga ut{email ? " (" + email + ")" : ""}</button>
  </div></div></div>;
}
function CookieBanner() {
  const [dismissed, setDismissed] = useState(() => store.get("rekyl_cookie", false));
  if (dismissed) return null;
  return <div className="ats-cookie"><div className="ats-cookie-in"><span><Info size={15} /> Vi använder endast nödvändiga cookies och lokal lagring för att appen ska fungera — inga spårningscookies.</span><button className="ats-btn-primary" onClick={() => { store.set("rekyl_cookie", true); setDismissed(true); }}>Okej</button></div></div>;
}
function HomePage() {
  const onSignup = () => navTo("/skapa-konto");
  const [faq, setFaq] = useState(0);
  const go = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const PLANS = [
    { n: "Start", p: "0 kr", per: "för din första tjänst", d: "Rekrytera en roll hela vägen, utan kostnad.", f: ["1 aktiv tjänst", "Formulärbyggare och poängsättning", "Publik jobbannons", "Automatiska besked till kandidater"], cta: "Skapa konto" },
    { n: "Pro", p: "790 kr", per: "per månad", d: "För dig som rekryterar löpande.", f: ["25 aktiva tjänster", "Team, roller och revisionslogg", "Kalender med intervjubokning", "Påminnelser till kandidater", "Källkvalitet och rapporter"], cta: "Börja med Pro", hot: true },
    { n: "Enterprise", p: "Offert", per: "efter behov", d: "För större organisationer med egna krav.", f: ["Obegränsat antal tjänster", "Egna mallar och processer", "Utökad behörighetsstyrning", "Namngiven kontaktperson"], cta: "Kontakta oss" },
  ];
  const FAQS = [
    ["Använder Rekyl AI för att välja bort kandidater?", "Nej. Poängsättningen är helt deterministisk. Du bestämmer själv vilka frågor som väger tungt, vad som är ett absolut krav och var tröskeln går. Samma svar ger alltid samma poäng, och varje poäng går att bryta ned och förklara för både kandidat och chef. Ingen modell gissar åt dig."],
    ["Var lagras kandidaternas uppgifter?", "Inom EU. Kandidaten samtycker vid ansökan, samtycket tidsstämplas, och du kan radera all data för en kandidat eller en hel tjänst permanent — inklusive uppladdade filer."],
    ["Kan jag komma igång utan att prata med en säljare?", "Ja. Du skapar konto, väljer en branschmall och har en publicerad annons med fungerande ansökningslänk på några minuter."],
    ["Skickas mejlen till kandidaterna på riktigt?", "Ja. När du fattar ett beslut går rätt mejl iväg direkt, och du ser den verkliga leveransstatusen från mejlleverantören. Ingen kandidat blir kvar i tystnad."],
    ["Vad kostar det när vi växer?", "Start är gratis för din första tjänst. Pro kostar 790 kr per månad utan bindningstid, och Enterprise prissätts efter behov. Du kan byta paket när du vill."],
  ];

  return <>
    {/* 1. HERO */}
    <section className="ats-lp-hero">
      <div className="ats-lp-hero-in">
        <div className="ats-lp-hero-txt">
          <h1>Rekrytera på krav.<br /><em>Inte på magkänsla.</em></h1>
          <p className="ats-lp-sub">Du bestämmer vad som faktiskt spelar roll för rollen. Rekyl poängsätter varje ansökan efter det — transparent och förklarbart. Kvar blir en kö du kan beta av på en kafferast.</p>
          <div className="ats-lp-hero-acts">
            <button className="ats-lp-cta is-lg" onClick={onSignup}>Skapa konto gratis <ArrowRight size={19} /></button>
            <button className="ats-lp-ghost" onClick={() => go("produkt")}>Se hur det fungerar</button>
          </div>
          <ul className="ats-lp-trust">
            <li><Check size={15} /> Ingen AI som sållar</li>
            <li><Check size={15} /> Data inom EU</li>
            <li><Check size={15} /> Igång på minuter</li>
          </ul>
        </div>
        <div className="ats-lp-shot">
          <div className="ats-lp-shot-bar"><span /><span /><span /><b>rekyl.app</b></div>
          <div className="ats-lp-shot-body">
            <div className="ats-lp-card">
              <div className="ats-lp-card-top">
                <div><b>Amina Karlsson</b><span>Säljare · via LinkedIn</span></div>
                <ScoreDial value={92} knockout={false} size={62} />
              </div>
              <div className="ats-lp-bars">
                <div className="ats-lp-bar"><span>Nyckelkompetenser</span><i style={{ width: "100%" }} /><b>+30</b></div>
                <div className="ats-lp-bar"><span>Års erfarenhet</span><i style={{ width: "82%" }} /><b>+24</b></div>
                <div className="ats-lp-bar is-weak"><span>Löneanspråk</span><i style={{ width: "46%" }} /><b>+8</b></div>
              </div>
              <div className="ats-lp-rec"><Sparkles size={15} /> Rekommenderad åtgärd: <b>Boka intervju</b></div>
            </div>
            <div className="ats-lp-swipe"><span><X size={14} /> Avslag</span><span className="is-mid"><PauseCircle size={14} /> Reserv</span><span className="is-ok"><Check size={14} /> Shortlist</span></div>
          </div>
        </div>
      </div>
    </section>

    {/* 2. PROBLEMET — redaktionell, mörk */}
    <section className="ats-lp-problem">
      <div className="ats-lp-wrap ats-lp-problem-in ats-rv">
        <h2>Trettio ansökningar i mejlkorgen.<br />Ingen struktur. Ingen som får svar.</h2>
        <div className="ats-lp-problem-r">
          <p>De flesta mindre arbetsgivare rekryterar mellan fakturor och möten. Ansökningar hamnar i inkorgen, någon glöms bort, och beslutet fattas på den som råkade skriva bäst personligt brev.</p>
          <p>Det är inte slarv. Det är att verktygen antingen kostar som en halvtidstjänst eller kräver en HR-avdelning för att sättas upp.</p>
        </div>
      </div>
    </section>

    {/* 3. FORMULÄRET BLIR URVAL — text + visual */}
    <section className="ats-lp-split" id="produkt">
      <div className="ats-lp-wrap ats-lp-split-in ats-rv">
        <div className="ats-lp-split-t">
          <span className="ats-lp-eyebrow">Formuläret</span>
          <h2>Formuläret är också din urvalsmotor</h2>
          <p>Dra in fälten du bryr dig om — års erfarenhet, körkort, tillgänglighet, kompetenser. Sätt vikt på det som väger tungt och markera vad som är ett absolut krav. Poängen räknas ut på samma sätt varje gång.</p>
          <ul className="ats-lp-checks">
            <li><Check size={17} /> Dra och släpp, ingen kod</li>
            <li><Check size={17} /> Följdfrågor som bara visas när de behövs</li>
            <li><Check size={17} /> Absoluta krav sållar bort automatiskt</li>
          </ul>
        </div>
        <div className="ats-lp-split-v">
          <div className="ats-lp-mini">
            <div className="ats-lp-mini-h"><Blocks size={15} /> Formulärbyggare</div>
            <div className="ats-lp-fields">
              <div className="ats-lp-field"><GripVertical size={14} /><span>Års erfarenhet</span><em>vikt 24</em></div>
              <div className="ats-lp-field is-sel"><GripVertical size={14} /><span>Nyckelkompetenser</span><em>vikt 28</em></div>
              <div className="ats-lp-field"><GripVertical size={14} /><span>Har B-körkort</span><em className="is-ko">krav</em></div>
              <div className="ats-lp-field"><GripVertical size={14} /><span>Kan börja</span><em>vikt 12</em></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* 4. KANDIDATEN — visual + text */}
    <section className="ats-lp-split is-flip" id="kandidaten">
      <div className="ats-lp-wrap ats-lp-split-in ats-rv">
        <div className="ats-lp-split-v">
          <div className="ats-lp-mini">
            <div className="ats-lp-mini-h"><Globe size={15} /> Publik jobbannons</div>
            <div className="ats-lp-jobmini">
              <div className="ats-lp-jm-kicker">Sälj — Växjö — Hybrid</div>
              <div className="ats-lp-jm-title">Säljare till Nordpuls</div>
              <div className="ats-lp-jm-line" /><div className="ats-lp-jm-line is-s" />
              <div className="ats-lp-jm-btn">Ansök till tjänsten</div>
              <div className="ats-lp-jm-prog"><span>Steg 2 av 4</span><i><b /></i></div>
            </div>
          </div>
        </div>
        <div className="ats-lp-split-t">
          <span className="ats-lp-eyebrow">Kandidatupplevelsen</span>
          <h2>En annons kandidaten faktiskt vill söka på</h2>
          <p>Egen jobbsida med er profil, tydlig process och ett ansökningsflöde som fungerar lika bra i mobilen. Kandidaten ser aldrig poäng, krav eller interna bedömningar — bara en lugn och tydlig ansökan.</p>
          <ul className="ats-lp-checks">
            <li><Check size={17} /> Ett steg i taget, inget krångel</li>
            <li><Check size={17} /> CV-uppladdning som bara fungerar</li>
            <li><Check size={17} /> Alla får besked — ingen lämnas i tystnad</li>
          </ul>
        </div>
      </div>
    </section>

    {/* 5. BEDÖMNING — fullbredd */}
    <section className="ats-lp-full">
      <div className="ats-lp-wrap ats-rv">
        <span className="ats-lp-eyebrow">Bedömningen</span>
        <h2 className="ats-lp-h2">Varje poäng går att förklara</h2>
        <p className="ats-lp-lead">Kandidatkortet visar exakt varför någon fick sin poäng: vilka styrkor som drog upp, vilka risker som drog ner och om ett absolut krav inte är uppfyllt. Du fattar beslutet — Rekyl visar underlaget.</p>
        <div className="ats-lp-explain">
          {[["Styrkor", "Det som drog upp poängen, med exakt viktning.", "ok"],
            ["Risker", "Det som drog ner — synligt, inte gömt.", "warn"],
            ["Absoluta krav", "Saknas ett skallkrav sållas ansökan bort automatiskt, med angiven orsak.", "ko"],
            ["Rekommendation", "Boka intervju, shortlista, begär komplettering eller avslå.", "rec"]].map(([t, d, k]) =>
            <div key={t} className={"ats-lp-ex is-" + k}><b>{t}</b><span>{d}</span></div>)}
        </div>
      </div>
    </section>

    {/* 6. TEAM & MÄTNING — tidslinje */}
    <section className="ats-lp-sec">
      <div className="ats-lp-wrap ats-rv">
        <span className="ats-lp-eyebrow">Processen</span>
        <h2 className="ats-lp-h2">Från annons till anställd — utan att något faller mellan stolarna</h2>
        <ol className="ats-lp-timeline">
          {[["Publicera", "En jobbsida och en delningslänk per kanal, så du ser var kandidaterna kommer ifrån."],
            ["Beta av kön", "Varje ansökan poängsätts direkt. Swipa igenom, kommentera, rösta med teamet."],
            ["Boka intervjun", "Tiden landar i kandidatens kalender. Påminnelse går ut dagen innan."],
            ["Ge besked", "Rätt mejl skickas automatiskt vid varje beslut. Allt loggas."],
            ["Mät källorna", "Se vilken kanal som ger bäst kandidater — inte bara flest."]].map(([t, d], i) =>
            <li key={t}><span>{String(i + 1).padStart(2, "0")}</span><div><b>{t}</b><p>{d}</p></div></li>)}
        </ol>
      </div>
    </section>

    {/* 7. SÄKERHET */}
    <section className="ats-lp-safe">
      <div className="ats-lp-wrap ats-lp-safe-in ats-rv">
        <div className="ats-lp-safe-l">
          <span className="ats-lp-eyebrow">Trygghet</span>
          <h2>Ansvarsfullt med människors uppgifter</h2>
          <p>Rekrytering handlar om människor. Därför är Rekyl byggt för att du ska kunna förklara varje beslut — och radera allt när det är dags.</p>
        </div>
        <div className="ats-lp-safe-list">
          {[["Deterministisk poängsättning", "Varje poäng går att bryta ned och förklara. Ingen modell gissar."],
            ["Data inom EU", "Kandidatuppgifter och uppladdade filer lagras inom EU."],
            ["Samtycke och radering", "Samtycket tidsstämplas. Radering tar bort allt, även filerna."],
            ["Rollstyrd åtkomst", "Admin, rekryterare, chef eller insyn — var och en ser bara sitt."],
            ["Revisionslogg", "Beslut, mejl och ändringar loggas med vem och när."]].map(([t, d]) =>
            <div key={t} className="ats-lp-safe-i"><ShieldCheck size={17} /><div><b>{t}</b><span>{d}</span></div></div>)}
        </div>
      </div>
    </section>

    {/* 8. PRISER */}
    <section className="ats-lp-sec" id="priser">
      <div className="ats-lp-wrap ats-rv">
        <span className="ats-lp-eyebrow">Priser</span>
        <h2 className="ats-lp-h2">Börja gratis. Betala när du växer.</h2>
        <div className="ats-lp-plans">{PLANS.map((p) => <div key={p.n} className={"ats-lp-plan" + (p.hot ? " is-hot" : "")}>
          {p.hot && <span className="ats-lp-plan-tag">Populärast</span>}
          <h3>{p.n}</h3>
          <div className="ats-lp-price"><b>{p.p}</b><span>{p.per}</span></div>
          <p className="ats-lp-plan-d">{p.d}</p>
          <ul>{p.f.map((f) => <li key={f}><Check size={15} /> {f}</li>)}</ul>
          <button className={p.hot ? "ats-lp-cta is-block" : "ats-lp-ghost is-block"} onClick={onSignup}>{p.cta}</button>
        </div>)}</div>
        <p className="ats-lp-plans-note">Alla priser exklusive moms. Inga bindningstider.</p>
      </div>
    </section>

    {/* 9. FAQ */}
    <section className="ats-lp-sec is-tight" id="fragor">
      <div className="ats-lp-wrap ats-lp-faqwrap ats-rv">
        <span className="ats-lp-eyebrow">Vanliga frågor</span>
        <h2 className="ats-lp-h2">Det du undrar över</h2>
        <div className="ats-lp-faq">{FAQS.map(([q, ans], i) => <div key={q} className={"ats-lp-faq-i" + (faq === i ? " is-on" : "")}>
          <button onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i}>{q}<ChevronDown size={19} /></button>
          <div className="ats-lp-faq-a" style={{ maxHeight: faq === i ? 320 : 0 }}><p>{ans}</p></div>
        </div>)}</div>
      </div>
    </section>

    {/* 10. SLUT-CTA */}
    <section className="ats-lp-final">
      <div className="ats-lp-wrap ats-lp-final-in ats-rv">
        <h2>Nästa rekrytering behöver inte vara en gissningslek.</h2>
        <p>Skapa konto, välj en branschmall och publicera din första tjänst idag.</p>
        <button className="ats-lp-cta is-lg" onClick={onSignup}>Skapa konto gratis <ArrowRight size={19} /></button>
        <span className="ats-lp-final-note">Inget kreditkort. Ingen demo att boka.</span>
      </div>
    </section>

  </>;
}
function SpinnerScreen({ text }) { return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><div className="ats-spinner" /><span>{text || "Laddar…"}</span></div></div></div>; }
function OrgSetupScreen({ session, onReady, onLogout }) {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => { setErr(""); if (mode === "create" && name.trim().length < 2) { setErr("Ange ett företagsnamn."); return; } if (mode === "join" && !code.trim()) { setErr("Ange en inbjudningskod."); return; } setBusy(true); try { if (mode === "create") { const oid = await sbRpc("create_org", { p_name: name.trim() }); onReady({ id: oid, role: "admin" }); } else { const oid = await sbRpc("join_org", { p_code: code.trim() }); onReady({ id: oid, role: "recruiter" }); } } catch (e) { setErr(e.message || "Något gick fel."); setBusy(false); } };
  return <div className="ats-root"><Style /><div className="ats-login"><div className="ats-login-card">
    <div className="ats-login-brand"><span className="ats-logo">R</span> Rekyl</div>
    <h2>{mode === "create" ? "Skapa ditt företag" : "Gå med i ett team"}</h2>
    <p className="ats-login-sub">{mode === "create" ? "Skapa en arbetsyta för ditt företag. Du blir admin och kan bjuda in kollegor med roller." : "Har du fått en inbjudningskod av en kollega? Klistra in den här."}</p>
    <div className="ats-setup-toggle"><button className={mode === "create" ? "is-on" : ""} onClick={() => { setMode("create"); setErr(""); }}>Skapa företag</button><button className={mode === "join" ? "is-on" : ""} onClick={() => { setMode("join"); setErr(""); }}>Gå med i team</button></div>
    {mode === "create" ? <label className="ats-field"><span className="ats-field-l">Företagsnamn</span><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="t.ex. Nordpuls AB" /></label>
      : <label className="ats-field"><span className="ats-field-l">Inbjudningskod</span><input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="8-teckenskod från din kollega" /></label>}
    {err && <div className="ats-login-err"><CircleAlert size={13} /> {err}</div>}
    <button className="ats-btn-primary ats-login-btn" disabled={busy} onClick={go}>{busy ? "…" : mode === "create" ? "Skapa företag" : "Gå med"}</button>
    <button className="ats-login-switch" onClick={onLogout}>Logga ut{session && session.email ? " (" + session.email + ")" : ""}</button>
  </div></div></div>;
}
function LoginScreen({ onAuthed, onBack, start }) {
  const [mode, setMode] = useState(start === "signup" ? "signup" : "login");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async () => { setErr(""); if (!email || !pw) { setErr("Fyll i e-post och lösenord."); return; } if (pw.length < 6) { setErr("Lösenordet måste vara minst 6 tecken."); return; } setBusy(true); try { if (mode === "signup") await sbSignup(email, pw); const d = await sbLogin(email, pw); onAuthed({ token: d.access_token, refresh: d.refresh_token, userId: d.user && d.user.id, email, exp: Date.now() + (d.expires_in || 3600) * 1000 }); } catch (e) { const m = (e.message || "").toLowerCase(); setErr(m.includes("invalid") && m.includes("email") ? "Supabase avvisade e-postadressen. Använd en riktig domän (din jobbmejl eller t.ex. gmail) — påhittade domäner utan mejlserver godkänns inte." : m.includes("already") || m.includes("registered") ? "Ett konto med den e-posten finns redan. Logga in i stället." : m.includes("invalid login") ? "Fel e-post eller lösenord." : (e.message || "Något gick fel.")); setBusy(false); } };
  return <div className="ats-root"><Style /><div className="ats-login"><div className="ats-login-card">
    <div className="ats-login-brand"><span className="ats-logo">R</span> Rekyl</div>
    <h2>{mode === "login" ? "Logga in" : "Skapa konto"}</h2>
    <p className="ats-login-sub">Rekryterarvyn är skyddad — bara ni på företaget kommer åt ansökningarna.</p>
    <label className="ats-field"><span className="ats-field-l">E-post</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="du@företaget.se" /></label>
    <label className="ats-field"><span className="ats-field-l">Lösenord</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="minst 6 tecken" /></label>
    {err && <div className="ats-login-err"><CircleAlert size={13} /> {err}</div>}
    <button className="ats-btn-primary ats-login-btn" disabled={busy} onClick={submit}>{busy ? "Loggar in…" : mode === "login" ? "Logga in" : "Skapa konto & logga in"}</button>
    <button className="ats-login-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>{mode === "login" ? "Har du inget konto? Skapa ett" : "Har du redan konto? Logga in"}</button>
    {onBack && <button className="ats-login-back" onClick={onBack}><ChevronLeft size={14} /> Till startsidan</button>}
  </div></div></div>;
}
function PublicApply({ slug, localJobs, localOrg }) {
  const [remote, setRemote] = useState(undefined);
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [atForm, setAtForm] = useState(false);
  const [site, setSite] = useState(null);
  const [siblings, setSiblings] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sbEnabled || !remote || !remote.org_id) return;
      const cs = await sbGet("career_sites?org_id=eq." + encodeURIComponent(remote.org_id) + "&published=eq.true&select=slug,data");
      if (alive && cs && cs[0]) setSite(cs[0]);
      const js = await sbGet("jobs?org_id=eq." + encodeURIComponent(remote.org_id) + "&published=eq.true&select=slug,title,form");
      if (alive && js) setSiblings(js.filter((j) => j.slug !== slug));
    })();
    return () => { alive = false; };
  }, [remote && remote.org_id]);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      const el = document.getElementById("apply");
      if (el) { const r = el.getBoundingClientRect(); setAtForm(r.top < window.innerHeight * 0.75); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
    document.querySelectorAll(".ats-rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
  const source = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("source") || null) : null;
  useEffect(() => { let alive = true; (async () => { if (sbEnabled) { const rows = await sbGet("jobs?slug=eq." + encodeURIComponent(slug) + "&published=eq.true&select=*"); if (alive) { const rr = rows && rows.length ? rows[0] : null; setRemote(rr); if (rr) sbSetUploadOrg(rr.org_id); } } else setRemote(null); })(); return () => { alive = false; }; }, [slug]);
  const localJob = localJobs.find((j) => j.slug === slug);
  let job = null, org = localOrg, company = localOrg.companyName;
  if (remote && remote.form) { job = { id: "remote", slug, title: remote.title, team: remote.form.team || "", version: remote.form.version || 1, criteria: remote.form.criteria || [], pages: remote.form.pages, pageLabels: remote.form.pageLabels || {}, annons: remote.form.annons || {}, profiles: [{ id: "std", name: "Standard" }], activeProfileId: "std", autoRejectBelow: 0, rules: [], autoRules: [], stats: { started: 0, submitted: 0 } }; org = remote.org || localOrg; company = remote.company || (remote.org && remote.org.companyName) || company; }
  else if (localJob) { job = localJob; company = localJob.company || company; }
  const submitFn = async (cand) => { if (sbEnabled) await sbInsert("applications", { job_slug: slug, org_id: remote ? remote.org_id : null, name: cand.name, email: cand.email, phone: cand.phone, answers: cand.answers, source: cand.source, consent_at: cand.consentAt ? new Date(cand.consentAt).toISOString() : new Date().toISOString(), created_at: new Date().toISOString() }); };
  if (remote === undefined) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><div className="ats-spinner" /><span>Laddar…</span></div></div></div>;
  if (!job) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><h2>Tjänsten hittades inte</h2><p>Länken kan vara felaktig eller så är annonsen inte publicerad än.</p></div></div></div>;
  const a = job.annons || {};
  const IC = { MapPin, Building2, Briefcase, Wallet, CalendarClock, Bell };
  const facts = [
    a.location && ["MapPin", "Plats", a.location],
    job.team && ["Building2", "Avdelning", job.team],
    a.employment && ["Briefcase", "Anställningsform", a.employment],
    a.workmode && ["Building2", "Arbetsform", a.workmode],
    a.salary && ["Wallet", "Lön", a.salary],
    a.start && ["CalendarClock", "Start", a.start],
    a.deadline && ["Bell", "Sista ansökningsdag", a.deadline],
  ].filter(Boolean);
  const scrollForm = () => { const el = document.getElementById("apply"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try { if (navigator.share) { await navigator.share({ title: job.title + " · " + company, url }); return; } } catch (e) { /* kandidaten avbröt delningen */ }
    copyText(url); setCopied(true); setTimeout(() => setCopied(false), 2200);
  };
  const initial = (company || "R").trim()[0].toUpperCase();
  const hasBody = !!(a.description || (a.requirements && a.requirements.length) || (a.meriter && a.meriter.length));
  const pubStatus = (remote && remote.form && remote.form.status) || "published";
  const open = pubStatus === "published";

  return <div className="ats-root"><Style /><div className="ats-jp">
    <header className={"ats-jp-nav" + (scrolled ? " is-stuck" : "")}>
      <div className="ats-jp-nav-in">
        <button className="ats-jp-brand" onClick={() => site && navTo("/karriar/" + site.slug)} style={{ cursor: site ? "pointer" : "default" }}><span className="ats-jp-mark">{initial}</span><span className="ats-jp-co">{company}</span></button>
        {site && <button className="ats-jp-back" onClick={() => navTo("/karriar/" + site.slug + "/jobb")}><ChevronLeft size={16} /> <span>Alla lediga jobb</span></button>}
        <div className="ats-jp-nav-r">
          <button className="ats-jp-share" onClick={share}>{copied ? <><Check size={16} /> <span>Länk kopierad</span></> : <><Share2 size={16} /> <span>Dela</span></>}</button>
          <button className="ats-jp-cta is-sm" onClick={scrollForm}>Ansök</button>
        </div>
      </div>
    </header>

    <section className="ats-jp-hero">
      <div className="ats-jp-hero-in">
        <div className="ats-jp-hero-txt">
          <div className="ats-jp-kicker">{[job.team, a.location, a.workmode].filter(Boolean).join(" — ") || company}</div>
          <h1>{job.title}</h1>
          {a.pitch && <p className="ats-jp-pitch">{a.pitch}</p>}
          <div className="ats-jp-hero-acts">
            {open ? <button className="ats-jp-cta is-lg" onClick={scrollForm}>Ansök till tjänsten <ArrowRight size={18} /></button> : <span className="ats-jp-closed"><PauseCircle size={16} /> Tar inte emot fler ansökningar</span>}
            {a.deadline && <span className="ats-jp-deadline"><Bell size={15} /> Sök senast {a.deadline}</span>}
          </div>
        </div>
        <div className="ats-jp-brandwall" aria-hidden="true">
          <div className="ats-jp-bw-mark">{initial}</div>
          <div className="ats-jp-bw-co">{company}</div>
          <div className="ats-jp-bw-grid"><span /><span /><span /><span /></div>
        </div>
      </div>
    </section>

    <div className="ats-jp-main">
      <article className="ats-jp-article">
        {a.description && <section className="ats-jp-sec ats-rv"><h2>Om rollen</h2><p className="ats-jp-lead">{a.description}</p></section>}
        {a.requirements && a.requirements.length > 0 && <section className="ats-jp-sec ats-rv"><h2>Vem vi söker</h2>
          <ul className="ats-jp-list">{a.requirements.map((r, i) => <li key={i}><Check size={16} /><span>{r}</span></li>)}</ul>
        </section>}
        {a.meriter && a.meriter.length > 0 && <section className="ats-jp-sec ats-rv"><h2>Meriterande</h2>
          <ul className="ats-jp-list is-soft">{a.meriter.map((r, i) => <li key={i}><Star size={15} /><span>{r}</span></li>)}</ul>
        </section>}
        {!hasBody && <section className="ats-jp-sec"><h2>Om rollen</h2><p className="ats-jp-lead">Vi söker en {job.title.toLowerCase()} till {company}. Fyll i formuläret nedan så hör vi av oss.</p></section>}

        {a.benefits && a.benefits.length > 0 && <section className="ats-jp-sec ats-rv"><h2>Vad vi erbjuder</h2>
          <div className="ats-jp-benefits">{a.benefits.map((b, i) => <div key={i} className="ats-jp-benefit"><Sparkles size={15} /><span>{b}</span></div>)}</div>
        </section>}

        {a.process && a.process.length > 0 && <section className="ats-jp-sec ats-rv"><h2>Så går rekryteringen till</h2>
          <ol className="ats-jp-steps">{a.process.map((p, i) => <li key={i}><span>{i + 1}</span><div>{p}</div></li>)}</ol>
        </section>}

        {a.faq && a.faq.length > 0 && <section className="ats-jp-sec ats-rv"><h2>Vanliga frågor</h2>
          <div className="ats-jp-faq">{a.faq.map((f, i) => <details key={i}><summary>{f.q}<ChevronDown size={18} /></summary><p>{f.a}</p></details>)}</div>
        </section>}

        <div className="ats-jp-midcta ats-rv">
          <div>
            <h3>Låter det som du?</h3>
            <p>Ansökan tar ett par minuter. Vi hör av oss oavsett hur det går.</p>
          </div>
          <button className="ats-jp-cta is-lg" onClick={scrollForm}>Ansök nu <ArrowRight size={18} /></button>
        </div>
      </article>

      <aside className="ats-jp-side">
        <div className="ats-jp-sidecard">
          <h3>Om tjänsten</h3>
          <dl className="ats-jp-facts">{facts.map(([ic, l, v]) => { const I = IC[ic]; return <div key={l}><dt><I size={14} /> {l}</dt><dd>{v}</dd></div>; })}</dl>
          <button className="ats-jp-cta is-block" onClick={scrollForm}>Ansök nu</button>
          <button className="ats-jp-sideshare" onClick={share}>{copied ? <><Check size={15} /> Kopierad</> : <><Share2 size={15} /> Dela annonsen</>}</button>
        </div>
        {(a.contact && (a.contact.name || a.contact.email)) && <div className="ats-jp-sidecard">
          <h3>Frågor om rollen?</h3>
          <div className="ats-jp-contact">
            <span className="ats-jp-avatar">{(a.contact.name || company).trim()[0].toUpperCase()}</span>
            <div>
              <b>{a.contact.name || company}</b>
              <span>Kontaktperson</span>
              {a.contact.email && <a href={"mailto:" + a.contact.email}>{a.contact.email}</a>}
            </div>
          </div>
        </div>}
      </aside>
    </div>

    {(site || siblings.length > 0) && <section className="ats-jp-more">
      <div className="ats-jp-more-in">
        {site && site.data && site.data.intro && <div className="ats-jp-about ats-rv">
          <h2>Om {company}</h2>
          <p>{site.data.intro}</p>
          <button className="ats-lp-ghost" onClick={() => navTo("/karriar/" + site.slug)}>Läs mer om oss <ArrowRight size={16} /></button>
        </div>}
        {siblings.length > 0 && <div className="ats-jp-rel ats-rv">
          <div className="ats-jp-rel-h"><h2>Andra lediga tjänster</h2>{site && <button className="ats-cs-link" onClick={() => navTo("/karriar/" + site.slug + "/jobb")}>Alla tjänster <ArrowRight size={15} /></button>}</div>
          <div className="ats-cs-jobs">{siblings.slice(0, 4).map((j) => <JobCard key={j.slug} j={j} onOpen={(s2) => navTo("/j/" + s2)} />)}</div>
        </div>}
      </div>
    </section>}

    <section className="ats-jp-apply" id="apply">
      <div className="ats-jp-apply-in">
        {!open ? <div className="ats-af-done"><div className="ats-af-done-mark" style={{ background: "var(--muted)" }}><PauseCircle size={30} /></div><h2>Tjänsten tar inte emot fler ansökningar</h2><p>Ansökningstiden är pausad eller avslutad. Titta gärna in igen, eller se våra andra lediga tjänster.</p>{site && <div className="ats-af-done-acts"><button className="ats-lp-cta" onClick={() => navTo("/karriar/" + site.slug + "/jobb")}>Se andra lediga jobb <ArrowRight size={16} /></button></div>}</div>
        : <ApplyForm job={job} org={{ ...org, companyName: company }} onSubmit={submitFn} source={source} annons={a} site={site} />}
      </div>
    </section>

    <footer className="ats-jp-foot">
      <div className="ats-jp-foot-in">
        <div className="ats-jp-brand"><span className="ats-jp-mark">{initial}</span><span className="ats-jp-co">{company}</span></div>
        <div className="ats-jp-foot-r">
          {site && <button className="ats-cs-link" onClick={() => navTo("/karriar/" + site.slug)}>Karriärsidan</button>}
          <span className="ats-jp-foot-note">Rekryteras med Rekyl — dina uppgifter hanteras enligt GDPR</span>
        </div>
      </div>
    </footer>

    {!atForm && open && <div className="ats-jp-mobar">
      <div><b>{job.title}</b><span>{a.location || company}</span></div>
      <button className="ats-jp-cta is-sm" onClick={scrollForm}>Ansök</button>
    </div>}
  </div></div>;
}
const TOUR_STEPS = [
  { center: true, view: "dashboard", title: "Välkommen till Rekyl", body: "En snabb rundtur på under en minut genom de viktigaste funktionerna. Du kan hoppa över när som helst." },
  { target: "nav-dashboard", view: "dashboard", side: "right", title: "Översikt", body: "Din startsida: kön att beta av, snittmatchning och portfölj över alla tjänster." },
  { target: "nav-jobs", view: "jobs", side: "right", title: "Tjänster", body: "Alla tjänster på ett ställe — status, publicering, taggar, arkiv och bulkåtgärder." },
  { target: "nav-pipeline", view: "pipeline", side: "right", title: "Pipeline", body: "Bygg din egen process, dra kandidater mellan steg och håll koll på deadlines med SLA." },
  { target: "nav-queue", view: "queue", side: "right", title: "Kön", body: "Gå igenom nya ansökningar som en kortlek och swipa för beslut. Rätt mejl skickas automatiskt." },
  { target: "nav-form", view: "form", side: "right", title: "Formulärbyggaren", body: "Dra och släpp fält för att bygga ansökningsformuläret. Formuläret är också din urvalsmotor — vikter, krav och villkor styr du här." },
  { target: "nav-calendar", view: "calendar", side: "right", title: "Kalender", body: "Alla bokade intervjuer med krockvarning, ombokning och avbokning. Kandidaten får en riktig kalenderinbjudan." },
  { target: "nav-team", view: "team", side: "right", title: "Team och roller", body: "Bjud in kollegor med roller. All aktivitet blir spårbar i aktivitetsloggen." },
  { target: "new-job", side: "left", title: "Skapa en tjänst", body: "Här skapar du en ny tjänst från en färdig branschmall — formulär, scoring och pipeline förladdas automatiskt." },
  { center: true, view: "dashboard", title: "Klart!", body: "Nu är du redo. Du hittar rundturen igen via hjälpknappen uppe till vänster." },
];
function ProductTour({ steps, onClose, setView }) {
  const list = Array.isArray(steps) && steps.length ? steps : [];
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = list[Math.min(i, list.length - 1)] || { center: true, title: "Rundtur", body: "Inget att visa." };
  useEffect(() => {
    if (step.view) setView(step.view);
    let raf, t;
    const measure = () => {
      if (step.center || !step.target) { setRect(null); return; }
      const els = Array.from(document.querySelectorAll('[data-tour="' + step.target + '"]'));
      const el = els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    t = setTimeout(() => { measure(); raf = requestAnimationFrame(measure); }, step.view ? 130 : 20);
    const onWin = () => measure();
    window.addEventListener("resize", onWin); window.addEventListener("scroll", onWin, true);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener("resize", onWin); window.removeEventListener("scroll", onWin, true); };
  }, [i]);
  const next = () => { if (i < list.length - 1) setI(i + 1); else onClose(true); };
  const back = () => { if (i > 0) setI(i - 1); };
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let ttStyle = {};
  const centered = !rect;
  if (rect) {
    const tw = Math.min(320, vw - 32);
    if (vw < 720) {
      const below = rect.top + rect.height + 12 + 180 < vh;
      const left = Math.max(16, Math.min(vw - tw - 16, rect.left + rect.width / 2 - tw / 2));
      ttStyle = below ? { top: rect.top + rect.height + 14, left, width: tw } : { top: Math.max(16, rect.top - 14 - 190), left, width: tw };
    } else {
      const side = step.side || "right";
      const top = Math.max(16, Math.min(vh - 220, rect.top - 8));
      ttStyle = side === "right" ? { top, left: Math.min(vw - tw - 16, rect.left + rect.width + 16), width: tw } : { top, left: Math.max(16, rect.left - tw - 16), width: tw };
    }
  }
  return <div className="ats-tour">
    {rect ? <div className="ats-tour-spot" style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }} /> : <div className="ats-tour-dim" />}
    <div className={"ats-tour-card" + (centered ? " is-centered" : "")} style={centered ? undefined : ttStyle}>
      <div className="ats-tour-step">{i + 1} / {list.length}</div>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <div className="ats-tour-dots">{list.map((_, k) => <span key={k} className={k === i ? "is-on" : ""} />)}</div>
      <div className="ats-tour-actions">
        <button className="ats-tour-skip" onClick={() => onClose(true)}>Hoppa över</button>
        <div className="ats-tour-nav">{i > 0 && <button className="ats-ghost is-sm" onClick={back}>Tillbaka</button>}<button className="ats-btn-primary is-sm" onClick={next}>{i < list.length - 1 ? "Nästa" : "Klart"}</button></div>
      </div>
    </div>
  </div>;
}
function cloudHint(e) {
  if (!e) return "Molnet svarar inte.";
  const m = (e.msg || "").toLowerCase();
  if (m.includes("does not exist") || m.includes("could not find") || e.status === 404) return "En tabell eller funktion saknas i databasen — k\u00f6r hela SQL-upps\u00e4ttningen igen i Supabase.";
  if (e.status === 401) return "Sessionen har g\u00e5tt ut \u2014 logga ut och in igen.";
  if (e.status === 403 || m.includes("row-level security") || m.includes("policy")) return "Beh\u00f6righet nekad (RLS) \u2014 k\u00f6r SQL:en f\u00f6r org_state och members igen i Supabase.";
  if (e.status === 409) return "Konflikt vid sparning \u2014 ladda om sidan.";
  if (e.status === 0) return "Ingen anslutning till molnet \u2014 kontrollera internet.";
  return "Molnfel (" + e.status + ")" + (e.msg ? ": " + e.msg.slice(0, 90) : "") + ".";
}
export default function App() {
  return <ErrorBoundary name="root"><AppInner /></ErrorBoundary>;
}

function AppInner() {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => { try { const sv = store.get("rekyl_state", null); return hydrate(init, sv); } catch (e) { return init; } });
  const D = dispatch;
  const [view, setView] = useState("dashboard");
  const [pinned, setPinned] = useState(() => store.get("rekyl_pin", false));
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [newJob, setNewJob] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [reasonFor, setReasonFor] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);
  const [session, setSession] = useState(() => { const sv = store.get("rekyl_session", null); if (sv && sv.token) { const acct = store.get("rekyl_account", null); if (acct && sv.userId && acct !== sv.userId) { store.set("rekyl_state", null); store.set("rekyl_org", null); } store.set("rekyl_account", sv.userId); sbSetAuth(sv.token, sv.refresh, sv.exp); } return sv; });
  const [loaded, setLoaded] = useState(false);
  const [org, setOrgState] = useState(() => store.get("rekyl_org", null));
  const [orgChecked, setOrgChecked] = useState(false);
  const [authView, setAuthView] = useState("landing");
  const [cloudOk, setCloudOk] = useState(true);
  const [cloudErr, setCloudErr] = useState(null);
  const [mail, setMail] = useState({ configured: false, provider: null, from: null, reason: null, notify: false, reminders: false, checked: false });
  const bootRef = useRef(Date.now());
  const path = usePath();
  const [isSuper, setIsSuper] = useState(false);
  const [plan, setPlan] = useState(null);
  const setOrg = (o) => { setOrgState(o); store.set("rekyl_org", o); if (o) sbSetOrg(o.id); };
  const login = (sv) => { const acct = store.get("rekyl_account", null); if (acct && sv.userId && acct !== sv.userId) { store.set("rekyl_state", null); store.set("rekyl_org", null); setOrgState(null); dispatch({ type: "LOAD_STATE", data: {} }); } store.set("rekyl_account", sv.userId); store.set("rekyl_session", sv); sbSetAuth(sv.token, sv.refresh, sv.exp); setOrgChecked(false); setLoaded(false); setCloudOk(true); setSession(sv); };
  const logout = () => { store.set("rekyl_session", null); store.set("rekyl_state", null); store.set("rekyl_org", null); store.set("rekyl_account", null); sbSetAuth(null, null, 0); sbSetOrg(null); setLoaded(false); setOrgState(null); setOrgChecked(true); setCloudOk(true); setSession(null); dispatch({ type: "LOAD_STATE", data: {} }); dispatch({ type: "SET_TEAM", team: [] }); };
  const cloudRetry = async () => { if (!session) return; const rows = await sbGet("members?user_id=eq." + session.userId + "&select=org_id,role"); if (rows === null) { setCloudOk(false); setCloudErr(sbLastError()); return; } let o; if (rows.length) { o = { id: rows[0].org_id, role: rows[0].role }; sbSetOrg(o.id); setOrgState(o); store.set("rekyl_org", o); } else { store.set("rekyl_org", null); setOrgState(null); setOrgChecked(true); setCloudOk(false); setCloudErr({ status: 0, msg: "Ingen f\u00f6retagskoppling (members saknas)" }); return; } const okW = await sbUpsert("org_state", { org_id: o.id, data: state, updated_at: new Date().toISOString() }); setCloudOk(okW); setCloudErr(okW ? null : sbLastError()); if (okW) { const st = await sbGet("org_state?org_id=eq." + o.id + "&select=data"); if (st && st.length && st[0].data) dispatch({ type: "LOAD_STATE", data: st[0].data }); dispatch({ type: "SET_ME", id: session.userId, email: session.email, role: o.role }); } };
  useEffect(() => { if (!sbEnabled || !session || !session.refresh) return; let alive = true; const doRefresh = async () => { const d = await sbRefresh(session.refresh); if (d && alive) { const ns = { ...session, token: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000 }; store.set("rekyl_session", ns); sbSetAuth(ns.token, ns.refresh, ns.exp); setSession(ns); } }; if (session.exp && session.exp < Date.now() + 5 * 60000) doRefresh(); const t = setInterval(doRefresh, 45 * 60000); return () => { alive = false; clearInterval(t); }; }, [session && session.userId]);
  useEffect(() => { if (!sbEnabled || !session) { setOrgChecked(true); return; } let alive = true; (async () => { const rows = await sbGet("members?user_id=eq." + session.userId + "&select=org_id,role"); if (!alive) return; if (rows === null) { setCloudOk(false); if (org) sbSetOrg(org.id); setOrgChecked(true); return; } setCloudOk(true); if (rows.length) { const o = { id: rows[0].org_id, role: rows[0].role }; sbSetOrg(o.id); setOrgState(o); store.set("rekyl_org", o); } else { store.set("rekyl_org", null); setOrgState(null); sbSetOrg(null); } setOrgChecked(true); })(); return () => { alive = false; }; }, [session && session.userId]);
  useEffect(() => { if (!sbEnabled || !session) { setLoaded(true); return; } if (!org) return; let alive = true; (async () => { let rows = await sbGet("org_state?org_id=eq." + org.id + "&select=data,rev");
      if (rows === null) { SB_REV_OK = false; rows = await sbGet("org_state?org_id=eq." + org.id + "&select=data"); } if (!alive) return; if (rows === null) setCloudOk(false); else { setCloudOk(true); if (rows.length) { sbSetRev(rows[0].rev || 0); if (rows[0].data) dispatch({ type: "LOAD_STATE", data: rows[0].data }); } } dispatch({ type: "SET_ME", id: session.userId, email: session.email, role: org.role }); setLoaded(true); })(); return () => { alive = false; }; }, [session && session.userId, org && org.id]);
  useEffect(() => { if (!sbEnabled || !session || !org || !loaded) return; const t = setTimeout(async () => {
      /* Optimistisk låsning: skrivningen går bara igenom om rev fortfarande stämmer.
       * Har någon annan sparat under tiden får vi 0 rader tillbaka -> konflikt. */
      const base = { org_id: org.id, data: state, updated_at: new Date().toISOString() };
      if (SB_REV_OK) {
        const next = SB_REV + 1;
        try {
          const r = await sbFetch(SB_URL + "/rest/v1/org_state?org_id=eq." + org.id + "&rev=eq." + SB_REV, "PATCH", () => ({ ...sbHead(), Prefer: "return=representation" }), JSON.stringify({ ...base, rev: next }));
          if (r.ok) {
            const rows = await r.json().catch(() => []);
            if (rows && rows.length) { sbSetRev(next); setCloudOk(true); setCloudErr(null); return; }
            /* Noll rader: antingen allra första sparningen, eller så hann någon annan före. */
            const ok2 = await sbUpsert("org_state", { ...base, rev: next });
            if (ok2) { sbSetRev(next); setCloudOk(true); setCloudErr(null); }
            else { setCloudOk(false); setCloudErr({ status: 409, msg: "conflict" }); }
            return;
          }
          /* Kolumnen `rev` saknas (SQL:en är inte körd) — stäng av låsningen och spara som vanligt. */
          if (r.status === 400 || r.status === 404) SB_REV_OK = false;
        } catch (e) { SB_REV_OK = false; }
      }
      const ok = await sbUpsert("org_state", base);
      setCloudOk(ok); setCloudErr(ok ? null : sbLastError());
    }, 1600); return () => clearTimeout(t); }, [state, loaded, org && org.id]);
  useEffect(() => { if (!session || !org) { setIsSuper(false); return; } let alive = true; (async () => { const r = await adminCall("whoami"); if (alive) setIsSuper(!!(r.ok && r.superadmin)); const rows = await sbGet("orgs?id=eq." + org.id + "&select=plan,suspended,max_jobs"); if (alive && rows && rows[0]) setPlan({ plan: rows[0].plan || "start", suspended: !!rows[0].suspended, maxJobs: rows[0].max_jobs == null ? 999 : rows[0].max_jobs }); })(); return () => { alive = false; }; }, [session && session.userId, org && org.id]);
  useEffect(() => { if (!session) return; let alive = true; (async () => { const c = await mailConfig(); if (alive) setMail({ configured: !!c.configured, provider: c.provider || null, from: c.from || null, reason: c.reason || null, notify: !!c.notify, reminders: !!c.reminders, checked: true }); })(); return () => { alive = false; }; }, [session && session.userId]);
  const sendMailNow = useCallback(async (m) => { if (!m || MAIL_INFLIGHT.has(m.id) || !validEmail(m.to)) return { ok: false }; MAIL_INFLIGHT.add(m.id); dispatch({ type: "MSG_STATUS", id: m.id, status: "sending" }); const _c = state.candidates.find((c) => c.id === m.candidateId); const _j = _c && state.jobs.find((j) => j.id === _c.jobId); const attachment = _c && _j ? icsForMessage(m, _c, _j, state.org) : null; const res = await sendMail({ to: m.to, subject: m.subject, body: m.body, fromName: state.org.companyName, replyTo: state.org.hrEmail, ...(attachment ? { attachment } : {}) }); MAIL_INFLIGHT.delete(m.id); dispatch({ type: "MSG_STATUS", id: m.id, status: res.ok ? "sent" : "failed", error: res.error || null, providerId: res.id || null }); if (!res.ok) showToast({ kind: "warn", msg: "Mejlet till " + m.to + " kunde inte skickas: " + (res.error || "okänt fel") }); return res; }, [state.org, state.candidates, state.jobs]);
  useEffect(() => { if (!mail.configured || !session || !org || !loaded) return; state.messages.filter((m) => m.status === "queued" && m.at >= bootRef.current && validEmail(m.to) && !MAIL_INFLIGHT.has(m.id)).forEach((m) => sendMailNow(m)); }, [state.messages, mail.configured, session, org, loaded, sendMailNow]);
  useEffect(() => { store.set("rekyl_state", state); }, [state]);
  useEffect(() => { if (!session || !org || !loaded || !state.jobs.length) return; if (store.get("rekyl_tour_done", false)) return; const t = setTimeout(() => setTourOpen(true), 700); return () => clearTimeout(t); }, [session && session.userId, org && org.id, loaded, state.jobs.length]);

  const job = state.jobs.find((j) => j.id === state.activeJobId) || state.jobs[0];
  const me = (state.team || []).find((r) => r.id === state.currentUserId) || { id: state.currentUserId || "me", name: (session && session.email) || "Jag", email: session && session.email, role: (org && org.role) || "admin", initials: (((session && session.email) || "J")[0] || "J").toUpperCase() };
  const cands = useMemo(() => state.candidates.filter((c) => c.jobId === state.activeJobId).map((c) => ({ ...c, ...scoreCandidate(job, c.answers), missing: missingInfo(job, c) })), [state.candidates, job]);
  const allScored = useMemo(() => state.jobs.map((j) => ({ job: j, list: state.candidates.filter((c) => c.jobId === j.id).map((c) => { const legacy = scoreCandidate(j, c.answers); const sc = currentScore(c); return { ...c, ...legacy, ...(sc ? { total: sc.percent, scoreRun: sc } : {}) }; }) })), [state.candidates, state.jobs]);
  const dupIndex = useMemo(() => { const by = {}; state.candidates.forEach((c) => { const k = (c.email || "").toLowerCase(); if (!k) return; (by[k] ||= []).push(c); }); return by; }, [state.candidates]);
  const showToast = useCallback((t) => { setToast(t); setTimeout(() => setToast(null), 2800); }, []);
  const togglePin = () => setPinned((p) => { store.set("rekyl_pin", !p); return !p; });
  const toggleCompare = (id) => setCompareIds((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s);
  const detail = detailId ? cands.find((c) => c.id === detailId) || allScored.flatMap((a) => a.list).find((c) => c.id === detailId) : null;
  const go = (v) => { setView(v); setMoreOpen(false); };

  useEffect(() => { if (!sbEnabled || !job) return; let alive = true; const pull = async () => { const rows = await sbGet("applications?job_slug=eq." + encodeURIComponent(job.slug) + "&select=*&order=created_at.desc"); if (alive && rows) D({ type: "SYNC_APPLICATIONS", slug: job.slug, rows }); }; pull(); const t = setInterval(pull, 20000); return () => { alive = false; clearInterval(t); }; }, [job && job.slug]);

  const renderPublic = () => {
    if (path === "/logga-in" || path === "/skapa-konto") {
      if (session) { navTo("/"); return <SpinnerScreen />; }
      return <LoginScreen onAuthed={login} start={path === "/skapa-konto" ? "signup" : "login"} onBack={() => navTo("/")} />;
    }
    const pg = PAGE_MAP[path] || PAGE_MAP["/"];
    const isLegal = !!LEGAL_TITLES[path];
    const C = pg.c;
    return <MShell path={PAGE_MAP[path] ? path : "/"} title={pg.t} desc={pg.d} session={session}>
      {isLegal && <MHero kicker="Juridik" title={LEGAL_TITLES[path]} sub={"Senast uppdaterad " + new Date().toLocaleDateString("sv-SE")} />}
      <C />
    </MShell>;
  };
  const navList = useMemo(() => (isSuper ? [...NAV, { id: "superadmin", label: "Superadmin", icon: ShieldAlert }] : NAV), [isSuper]);
  const openNewJob = useCallback(() => { if (plan && state.jobs.length >= plan.maxJobs) { setLimitHit(true); return; } setNewJob(true); }, [plan, state.jobs.length]);
  const shared = { state, D, me, job, cands, showToast, setDetailId, setPrintDoc, compareIds, toggleCompare, openCompare: () => setCompareOpen(true), setReasonFor, setView: go, setNewJob: openNewJob, allScored, dupIndex, onLogout: logout, session, mail, sendMailNow, plan, isSuper };
  const primary = navList.slice(0, 5), more = navList.slice(5);

  const csMatch = path.match(/^\/karriar\/([^/]+)(?:\/([^/]+))?/);
  if (csMatch) return <CareerSite slug={decodeURIComponent(csMatch[1])} sub={csMatch[2] ? decodeURIComponent(csMatch[2]) : ""} localState={state} />;
  const pubMatch = path.match(/^\/j\/([^/]+)/);
  if (pubMatch) return <PublicApply slug={decodeURIComponent(pubMatch[1])} localJobs={state.jobs} localOrg={state.org} />;
  /* Marknadssidorna är alltid nåbara — även inloggad. Appen bor på "/". */
  if (path !== "/" && (PAGE_MAP[path] || path === "/logga-in" || path === "/skapa-konto")) return renderPublic();
  if (sbEnabled && !session) return renderPublic();
  if (sbEnabled && session && !orgChecked) return <SpinnerScreen text="Laddar…" />;
  if (sbEnabled && session && orgChecked && !org) return <OrgSetupScreen session={session} onReady={(o) => { setOrg(o); dispatch({ type: "SET_ME", id: session.userId, email: session.email, role: o.role }); }} onLogout={logout} />;
  if (sbEnabled && session && org && !loaded) return <SpinnerScreen text="Synkar din data…" />;
  if (session && loaded && !state.jobs.length) return <FirstJobScreen onCreate={(t, tmpl) => dispatch({ type: "ADD_JOB", title: t, tmplId: tmpl })} onLogout={logout} email={session && session.email} />;

  return (
    <div className="ats-root">
      <Style />
      <div className={"ats-app" + (pinned ? " is-pinned" : "")}>
        <aside className="ats-side">
          <div className="ats-side-top"><div className="ats-brand"><span className="ats-logo">R</span><span className="ats-lbl ats-brandtxt">Rekyl</span></div><div className="ats-side-top-btns"><button className="ats-help" onClick={() => setTourOpen(true)} title="Rundtur"><HelpCircle size={15} /></button><button className="ats-pin" onClick={togglePin} title={pinned ? "Lås upp menyn" : "Lås fast menyn"}>{pinned ? <Pin size={15} /> : <PinOff size={15} />}</button></div></div>
          <nav className="ats-nav">{navList.map((n) => <button key={n.id} data-tour={"nav-" + n.id} className={"ats-side-item" + (view === n.id ? " is-active" : "")} onClick={() => go(n.id)}><n.icon size={18} strokeWidth={2} /><span className="ats-lbl">{n.label}</span></button>)}</nav>
          <div className="ats-side-foot"><Menu trigger={<button className="ats-side-user"><span className="ats-avatar is-sm">{me.initials}</span><span className="ats-lbl ats-side-userinfo"><b>{me.name}</b><small>{ROLE_LABEL[me.role]}</small></span></button>}><div className="ats-menu-label">{me.name}</div>{me.email && <div style={{ padding: "0 12px 7px", fontSize: 11, color: "var(--muted)" }}>{me.email} · {ROLE_LABEL[me.role]}</div>}{sbEnabled && session && <><div className="ats-menu-sep" /><button className="ats-menu-item is-danger" onClick={logout}><LogOut size={14} /> Logga ut</button></>}</Menu></div>
        </aside>

        <main className="ats-main">
          <div className="ats-canvas">
            <ErrorBoundary view name={view} key={view}>
            {view === "dashboard" && <DashboardView {...shared} />}
            {view === "jobs" && <JobsView {...shared} />}
            {view === "calendar" && <CalendarView {...shared} />}
            {view === "career" && <CareerView {...shared} />}
            {view === "pipeline" && <PipelineView {...shared} />}
            {view === "scoring" && <ScoringView {...shared} />}
            {view === "superadmin" && isSuper && <SuperadminView {...shared} />}
            </ErrorBoundary>
            {view === "queue" && <QueueView {...shared} />}
            {view === "candidates" && <CandidatesView {...shared} />}
            {view === "form" && <FormView {...shared} />}
            {view === "stats" && <StatsView {...shared} />}
            {view === "sources" && <SourceQualityView {...shared} />}
            {view === "team" && <TeamView {...shared} />}
            {view === "settings" && <SettingsView {...shared} />}
          </div>
        </main>

        <nav className="ats-bottomnav">{primary.map((n) => <button key={n.id} data-tour={"nav-" + n.id} className={"ats-bn" + (view === n.id ? " is-active" : "")} onClick={() => go(n.id)}><n.icon size={19} /><span>{n.label}</span></button>)}<button className={"ats-bn" + (moreOpen || more.some((m) => m.id === view) ? " is-active" : "")} onClick={() => setMoreOpen((o) => !o)}><MenuIcon size={19} /><span>Mer</span></button></nav>
        {moreOpen && <div className="ats-more-sheet" onClick={() => setMoreOpen(false)}><div className="ats-more-inner" onClick={(e) => e.stopPropagation()}>{more.map((n) => <button key={n.id} className="ats-more-item" onClick={() => go(n.id)}><n.icon size={18} /> {n.label}</button>)}<button className="ats-more-item" onClick={() => { setMoreOpen(false); setTourOpen(true); }}><HelpCircle size={18} /> Rundtur</button></div></div>}
      </div>

      {toast && <div className={"ats-toast is-" + toast.kind}>{toast.kind === "ok" ? <Check size={16} /> : toast.kind === "warn" ? <AlertTriangle size={16} /> : <Info size={16} />}{toast.msg}</div>}
      {detail && <CandidateDrawer cand={detail} state={state} D={D} me={me} job={state.jobs.find((j) => j.id === detail.jobId)} onClose={() => setDetailId(null)} showToast={showToast} setPrintDoc={setPrintDoc} dupIndex={dupIndex} compareIds={compareIds} toggleCompare={toggleCompare} />}
      {compareOpen && <CompareModal cands={cands} compareIds={compareIds} toggleCompare={toggleCompare} onClose={() => setCompareOpen(false)} job={job} />}
      {newJob && <NewJobModal onClose={() => setNewJob(false)} onCreate={(t, tmpl) => { D({ type: "ADD_JOB", title: t, tmplId: tmpl }); setNewJob(false); go("form"); }} />}
      {reasonFor && <ReasonModal onClose={() => setReasonFor(null)} onPick={(reason) => { D({ type: "DECIDE", id: reasonFor.id, status: "reject", reason }); showToast({ kind: "ok", msg: "Avslag · avslagsmejl köat" }); if (reasonFor.after) reasonFor.after(); setReasonFor(null); }} />}
      {printDoc && <PrintModal doc={printDoc} onClose={() => setPrintDoc(null)} />}
      <button className="ats-fab" data-tour="new-job" onClick={openNewJob} title="Ny tjänst"><Plus size={20} /></button>
      {limitHit && plan && <Modal title="Paketets gräns är nådd" onClose={() => setLimitHit(false)}><div className="ats-erase">
        <p>Ditt paket <b>{PLAN_LABEL[plan.plan] || plan.plan}</b> tillåter <b>{plan.maxJobs} tjänster</b> och du har {state.jobs.length}. Arkivera eller radera en tjänst under <b>Tjänster</b>, eller uppgradera paketet.</p>
        <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setLimitHit(false)}>Stäng</button><button className="ats-btn-primary" onClick={() => { setLimitHit(false); go("jobs"); }}>Till Tjänster</button></div>
      </div></Modal>}
      {tourOpen && <ErrorBoundary name="tour"><ProductTour steps={TOUR_STEPS} setView={go} onClose={(done) => { setTourOpen(false); if (done) store.set("rekyl_tour_done", true); }} /></ErrorBoundary>}
      {sbEnabled && session && org && !cloudOk && <div className="ats-cloudbar"><AlertTriangle size={14} /> {cloudHint(cloudErr)} <button onClick={cloudRetry}>Försök igen</button></div>}
    </div>
  );
}

function NewJobModal({ onClose, onCreate }) { const [title, setTitle] = useState(""); const [tmpl, setTmpl] = useState(TEMPLATES[0].id); return <Modal title="Ny tjänst" onClose={onClose} wide><div className="ats-nj"><label className="ats-field"><span className="ats-field-l">Titel</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Innesäljare Göteborg" /></label><div className="ats-field-l" style={{ marginTop: 4 }}>Starta från mall — scoring, knockout och kandidatkort förladdas automatiskt</div><div className="ats-tmplgrid">{TEMPLATES.map((t) => { const Ic = ICONS[t.icon] || Briefcase; return <button key={t.id} className={"ats-tmpl" + (tmpl === t.id ? " is-on" : "")} onClick={() => setTmpl(t.id)}><span className="ats-tmpl-ic"><Ic size={16} /></span><b>{t.name}</b><span>{t.desc}</span></button>; })}</div><button className={"ats-send" + (title.trim().length > 1 ? "" : " is-off")} onClick={() => title.trim().length > 1 && onCreate(title.trim(), tmpl)}>Skapa tjänst <ArrowRight size={16} /></button></div></Modal>; }
function ReasonModal({ onClose, onPick }) { return <Modal title="Anledning till avslag" onClose={onClose}><div className="ats-reasons">{REASONS.map((r) => <button key={r} className="ats-reason" onClick={() => onPick(r)}>{r}</button>)}</div><p className="ats-reason-note">Anledningen sparas i kandidatens timeline och i statistiken, och används i avslagsmejlet ({"{{rejectionReason}}"}).</p></Modal>; }
function PrintModal({ doc, onClose }) { return <div className="ats-printwrap"><div className="ats-print-toolbar"><span>{doc.title}</span><div><button className="ats-ghost" onClick={() => window.print()}><Download size={15} /> Skriv ut / PDF</button><button className="ats-ghost" onClick={onClose}><X size={15} /> Stäng</button></div></div><div className="ats-printdoc">{doc.node}</div></div>; }

/* Publiceringskontroll — blockerar publicering om obligatoriska uppgifter saknas. */
function publishBlockers(job) {
  const a = job.annons || {};
  const out = [];
  if (!job.title || job.title.trim().length < 2) out.push("Titel saknas");
  if (!a.description || a.description.trim().length < 20) out.push("Om rollen saknas (minst 20 tecken)");
  if (!a.location && !a.workmode) out.push("Plats eller arbetsform måste anges");
  if (!a.employment) out.push("Anställningsform saknas");
  if (!job.criteria || job.criteria.length === 0) out.push("Ansökningsformuläret är tomt");
  if (!getPages(job).length) out.push("Formuläret saknar steg");
  if (!a.contact || !validEmail(a.contact.email || "")) out.push("Kontaktperson med giltig e-post saknas");
  if (!a.deadline) out.push("Sista ansökningsdag saknas");
  return out;
}
/* Sparad data (localStorage eller moln) måste ALLTID gå genom migreringarna innan
 * den blir state. Utan detta saknar jobb `pipeline` och kandidater `stageId`. */
function hydrate(init, d) {
  if (!d || !Array.isArray(d.jobs) || !Array.isArray(d.candidates)) return init;
  const jobs = d.jobs.map(migrateJob).map(ensurePipeline).map(ensureScoring);
  const pipeOf = {};
  jobs.forEach((j) => { pipeOf[j.id] = j.pipeline; });
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    ...init, ...d,
    jobs,
    candidates: arr(d.candidates).map((c) => (pipeOf[c.jobId] ? migrateCandidate(c, pipeOf[c.jobId]) : c)),
    team: arr(d.team), tags: arr(d.tags), jobViews: arr(d.jobViews),
    moves: arr(d.moves), moveIds: arr(d.moveIds),
    messages: arr(d.messages), log: arr(d.log), history: arr(d.history),
    templates: arr(d.templates).length ? d.templates : init.templates,
    org: { ...init.org, ...(d.org || {}) },
    activeJobId: jobs.some((j) => j.id === d.activeJobId) ? d.activeJobId : (jobs[0] ? jobs[0].id : null),
  };
}
/* ===================== FELGRÄNS ===================== */
/* Isolerar fel per modul. En trasig vy får aldrig riva hela appen. */
class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error("[rekyl] " + (this.props.name || "app"), err, info && info.componentStack); } catch (e) { /* konsolen kan saknas */ }
  }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String((this.state.err && this.state.err.message) || this.state.err);
    const isView = !!this.props.view;
    return <div className={"ats-eb" + (isView ? " is-view" : "")}>
      <div className="ats-eb-card">
        <div className="ats-eb-i"><ShieldAlert size={24} /></div>
        <h2>{isView ? "Den här vyn kunde inte visas" : "Något gick fel"}</h2>
        <p>{isView ? "Resten av appen fungerar — du kan gå vidare till en annan vy eller försöka igen." : "Appen stötte på ett oväntat fel. Din data är sparad."}</p>
        <details className="ats-eb-d"><summary>Teknisk information</summary><pre>{msg}</pre></details>
        <div className="ats-eb-acts">
          <button className="ats-btn-primary" onClick={() => this.setState({ err: null })}><RotateCw size={15} /> Försök igen</button>
          <button className="ats-ghost" onClick={() => window.location.reload()}>Ladda om sidan</button>
          {!isView && <button className="ats-ghost" onClick={() => { try { store.set("rekyl_state", null); } catch (e) { /* privat läge */ } window.location.reload(); }}>Rensa lokal data och ladda om</button>}
        </div>
      </div>
    </div>;
  }
}
/* ===================== SCORING: PROFILER, KRITERIER OCH MOTOR ===================== */
/* Poängmodeller — varje modell är en ren funktion av (kriterium, värde). Ingen AI, ingen gissning. */
const SCORE_MODELS = {
  fixed:     { label: "Fast poäng",        help: "Full poäng om frågan är besvarad." },
  boolean:   { label: "Ja / nej",          help: "Full poäng vid ja (eller nej, om du vänder riktningen)." },
  linear:    { label: "Linjär mot mål",    help: "Poängen växer linjärt upp till målvärdet och taket." },
  steps:     { label: "Trappsteg",         help: "Bestämda poäng vid bestämda nivåer." },
  band:      { label: "Intervall",         help: "Full poäng inom intervallet, avtagande utanför." },
  perOption: { label: "Poäng per alternativ", help: "Varje valt alternativ ger sin egen poäng." },
  match:     { label: "Exakt värde",       help: "Full poäng om svaret matchar exakt." },
  ordinal:   { label: "Nivåtrappa",        help: "Poäng efter var i skalan svaret ligger." },
  document:  { label: "Dokument finns",    help: "Full poäng om filen är uppladdad." },
  manual:    { label: "Manuell bedömning", help: "Poängen sätts av en bedömare. Räknas som obedömd tills dess." },
};
const SCORE_DIRS = { higher: "Högre är bättre", lower: "Lägre är bättre", inRange: "Inom intervall är bäst", exact: "Exakt värde" };
const MISSING_MODES = { zero: "Ger 0 poäng (räknas med i maxpoängen)", skip: "Hoppas över helt (påverkar inte resultatet)", flag: "Hoppas över och flaggas som saknad data" };
const NORM_METHODS = { weighted: "Gruppviktat medelvärde", sum: "Viktad summa av all poäng" };
const COND_OPS = {
  is: "är", isnot: "är inte", gt: "större än", lt: "mindre än", gte: "minst", lte: "högst",
  between: "mellan", contains: "innehåller", notcontains: "innehåller inte",
  empty: "är tomt", notempty: "är inte tomt", exists: "finns", missing: "saknas",
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const clampPts = (p, cr) => {
  if (!Number.isFinite(p)) return 0;
  const lo = Number.isFinite(cr.min) ? cr.min : (cr.negative ? -Math.abs(cr.weight) : 0);
  const hi = Number.isFinite(cr.max) ? cr.max : Math.abs(cr.weight);
  return Math.max(lo, Math.min(hi, p));
};
const maxPts = (cr) => Math.abs(Number.isFinite(cr.max) ? cr.max : (cr.weight || 0));

/* ---- Villkor: deterministiska, grupperade ---- */
function condHit(rule, answers, cand) {
  const raw = rule.field === "_cv" ? (Object.values(answers || {}).some((v) => v && typeof v === "object" && v.url) ? "ja" : "") : answers[rule.field];
  const v = Array.isArray(raw) ? raw : raw;
  const has = !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
  const n = num(v), rn = num(rule.value);
  switch (rule.op) {
    case "exists": case "notempty": return has;
    case "missing": case "empty": return !has;
    case "is": return String(v) === String(rule.value);
    case "isnot": return String(v) !== String(rule.value);
    case "gt": return n != null && rn != null && n > rn;
    case "lt": return n != null && rn != null && n < rn;
    case "gte": return n != null && rn != null && n >= rn;
    case "lte": return n != null && rn != null && n <= rn;
    case "between": { const [a, b] = String(rule.value).split("-").map((x) => num(x)); return n != null && a != null && b != null && n >= a && n <= b; }
    case "contains": return Array.isArray(v) ? v.includes(rule.value) : String(v || "").toLowerCase().includes(String(rule.value).toLowerCase());
    case "notcontains": return !(Array.isArray(v) ? v.includes(rule.value) : String(v || "").toLowerCase().includes(String(rule.value).toLowerCase()));
    default: return true;
  }
}
function condsPass(cond, answers, cand) {
  if (!cond || !Array.isArray(cond.rules) || cond.rules.length === 0) return true;
  const hits = cond.rules.map((r) => condHit(r, answers, cand));
  return cond.mode === "any" ? hits.some(Boolean) : hits.every(Boolean);
}

/* ---- Kärnan: poäng för ETT kriterium. Alltid förklarbar, aldrig NaN. ---- */
function scoreCriterion(cr, answers, formField) {
  const max = maxPts(cr);
  const raw = cr.source === "_cv" ? (Object.values(answers || {}).some((v) => v && typeof v === "object" && v.url) ? true : null) : answers[cr.source];
  const has = !(raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0));

  if (!formField && cr.source !== "_cv" && cr.model !== "manual") {
    return { pts: 0, max: 0, applicable: false, broken: true, why: "Datakällan finns inte längre i formuläret — kriteriet räknas inte." };
  }
  if (cr.model === "manual") {
    const m = (answers && answers["_manual_" + cr.id]);
    if (m == null) return { pts: 0, max, applicable: true, pending: true, why: "Väntar på manuell bedömning. Räknas som 0 tills en bedömare satt poäng." };
    return { pts: clampPts(num(m) || 0, cr), max, applicable: true, why: "Manuellt satt till " + m + " poäng." };
  }
  if (!has) {
    if (cr.onMissing === "skip") return { pts: 0, max: 0, applicable: false, why: "Obesvarad och konfigurerad att hoppas över." };
    if (cr.onMissing === "flag") return { pts: 0, max: 0, applicable: false, missing: true, why: "Obesvarad — flaggad som saknad data." };
    return { pts: 0, max, applicable: true, missing: true, why: "Obesvarad. Ger 0 poäng men räknas med i maxpoängen." };
  }

  let pts = 0, why = "";
  switch (cr.model) {
    case "fixed": pts = max; why = "Besvarad — full poäng."; break;
    case "boolean": {
      const yes = raw === true || raw === "ja" || raw === "Ja";
      const want = cr.dir !== "lower";
      pts = (yes === want) ? max : (cr.negative ? -max : 0);
      why = yes === want ? "Svarade " + (want ? "ja" : "nej") + " — full poäng." : "Svarade " + (yes ? "ja" : "nej") + " — " + (cr.negative ? "avdrag." : "ingen poäng.");
      break; }
    case "linear": {
      const v = num(raw);
      if (v == null) { pts = 0; why = "Värdet gick inte att tolka som ett tal."; break; }
      const ideal = num(cr.ideal); const floor = num(cr.floor) ?? 0;
      if (ideal == null || ideal === floor) { pts = 0; why = "Målvärdet är inte satt."; break; }
      let f = (v - floor) / (ideal - floor);
      if (cr.dir === "lower") f = 1 - f;
      f = Math.max(0, Math.min(1, f));
      pts = max * f;
      why = v + " av målvärdet " + ideal + " → " + Math.round(f * 100) + " % av maxpoängen.";
      break; }
    case "band": {
      const v = num(raw); const lo = num(cr.bandLo), hi = num(cr.bandHi);
      if (v == null || lo == null || hi == null || hi < lo) { pts = 0; why = "Intervallet är inte giltigt."; break; }
      if (v >= lo && v <= hi) { pts = max; why = v + " ligger inom intervallet " + lo + "–" + hi + " — full poäng."; }
      else { const span = Math.max(1, (hi - lo)); const d = v < lo ? lo - v : v - hi; const f = Math.max(0, 1 - d / span); pts = max * f; why = v + " ligger utanför " + lo + "–" + hi + " → " + Math.round(f * 100) + " % av maxpoängen."; }
      break; }
    case "steps": {
      const v = num(raw);
      const steps = [...(cr.steps || [])].map((x) => ({ at: num(x.at), pts: num(x.pts) })).filter((x) => x.at != null).sort((a, b) => a.at - b.at);
      if (v == null || !steps.length) { pts = 0; why = "Inga trappsteg definierade."; break; }
      const hit = [...steps].reverse().find((x) => v >= x.at);
      pts = hit ? clampPts(hit.pts, cr) : 0;
      why = hit ? v + " når nivån " + hit.at + " → " + pts + " poäng." : v + " når ingen nivå — 0 poäng.";
      break; }
    case "perOption": {
      const chosen = Array.isArray(raw) ? raw : [raw];
      const opts = cr.options || [];
      let sum = 0; const named = [];
      chosen.forEach((c) => { const o = opts.find((x) => x.value === c); if (o) { sum += num(o.pts) || 0; named.push(c + " (+" + o.pts + ")"); } });
      pts = clampPts(sum, cr);
      why = named.length ? "Valde " + named.join(", ") + (sum > max ? " — taket " + max + " gäller." : "") : "Inget poänggivande alternativ valt.";
      break; }
    case "match": {
      const ok = String(raw) === String(cr.matchValue);
      pts = ok ? max : (cr.negative ? -max : 0);
      why = ok ? "Matchar " + JSON.stringify(cr.matchValue) + " — full poäng." : "Svarade " + JSON.stringify(String(raw)) + ", förväntat " + JSON.stringify(cr.matchValue) + ".";
      break; }
    case "ordinal": {
      const scale = (formField && formField.scale) || cr.scale || [];
      const i = scale.indexOf(raw);
      if (i < 0 || scale.length < 2) { pts = 0; why = "Svaret finns inte i skalan."; break; }
      let f = i / (scale.length - 1);
      if (cr.dir === "lower") f = 1 - f;
      pts = max * f;
      why = raw + " är steg " + (i + 1) + " av " + scale.length + " → " + Math.round(f * 100) + " % av maxpoängen.";
      break; }
    case "document": pts = max; why = "Dokumentet är uppladdat — full poäng."; break;
    default: pts = 0; why = "Okänd poängmodell.";
  }
  return { pts: clampPts(pts, cr), max, applicable: true, why };
}

/* ---- Motorn: en profilversion + en kandidat -> ett komplett, förklarbart resultat ---- */
function runScoring(ver, cand, job) {
  const A = cand.answers || {};
  const fieldOf = (id) => (job.criteria || []).find((f) => f.id === id);
  const groups = (ver.groups || []).filter((g) => g.active !== false).sort((a, b) => a.order - b.order);
  const crits = (ver.criteria || []).filter((c) => c.active !== false);
  const warnings = [];
  if (!crits.length) warnings.push("Profilen har inga aktiva kriterier — resultatet blir 0.");

  const critRes = crits.map((cr) => {
    const applicableByCond = condsPass(cr.conditions, A, cand);
    if (!applicableByCond) return { id: cr.id, groupId: cr.groupId, name: cr.name, pts: 0, max: 0, applicable: false, why: "Gäller inte för den här kandidaten (villkoren uppfylldes inte)." };
    const r = scoreCriterion(cr, A, fieldOf(cr.source));
    if (r.broken) warnings.push("Kriteriet " + JSON.stringify(cr.name) + " pekar på ett formulärfält som inte längre finns.");
    if (r.pending) warnings.push("Kriteriet " + JSON.stringify(cr.name) + " väntar på manuell bedömning.");
    return { id: cr.id, groupId: cr.groupId, name: cr.name, model: cr.model, weight: cr.weight, answer: cr.source === "_cv" ? null : A[cr.source], ...r };
  });

  const groupRes = groups.map((g) => {
    const rows = critRes.filter((r) => r.groupId === g.id && r.applicable);
    const raw = rows.reduce((n, r) => n + r.pts, 0);
    const max = rows.reduce((n, r) => n + r.max, 0);
    const pct = max > 0 ? raw / max : null; /* aldrig division med noll */
    return { id: g.id, name: g.name, weight: g.weight || 0, raw, max, pct, n: rows.length };
  });
  const orphan = critRes.filter((r) => r.applicable && !groups.some((g) => g.id === r.groupId));
  if (orphan.length) {
    const raw = orphan.reduce((n, r) => n + r.pts, 0), max = orphan.reduce((n, r) => n + r.max, 0);
    groupRes.push({ id: "_none", name: "Övrigt", weight: 1, raw, max, pct: max > 0 ? raw / max : null, n: orphan.length });
  }

  const raw = groupRes.reduce((n, g) => n + g.raw, 0);
  const maxApplicable = groupRes.reduce((n, g) => n + g.max, 0);
  let percent = 0;
  if (ver.norm === "sum" || groupRes.every((g) => !g.weight)) {
    percent = maxApplicable > 0 ? (raw / maxApplicable) * 100 : 0;
    if (maxApplicable === 0) warnings.push("Ingen tillämplig maxpoäng — resultatet sätts till 0.");
  } else {
    const scored = groupRes.filter((g) => g.pct != null && g.weight > 0);
    const wsum = scored.reduce((n, g) => n + g.weight, 0);
    percent = wsum > 0 ? scored.reduce((n, g) => n + g.weight * g.pct, 0) / wsum * 100 : 0;
    if (wsum === 0) warnings.push("Ingen grupp har vikt — resultatet sätts till 0.");
  }
  percent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;

  const assessable = critRes.filter((r) => r.applicable).length;
  const missing = critRes.filter((r) => r.missing || r.pending).length;
  return {
    raw: Math.round(raw * 10) / 10, maxApplicable: Math.round(maxApplicable * 10) / 10, percent,
    groups: groupRes, criteria: critRes, warnings,
    assessedShare: assessable ? Math.round(((assessable - missing) / assessable) * 100) : 0,
    missingCount: missing,
  };
}

/* Stabil datahash -> samma svar + samma version ger alltid samma körning (idempotens). */
function dataHash(cand) {
  const src = JSON.stringify({ a: cand.answers || {}, r: cand.rev || 0 });
  let h = 5381;
  for (let i = 0; i < src.length; i++) { h = ((h << 5) + h + src.charCodeAt(i)) >>> 0; }
  return h.toString(36);
}
const runKey = (profileId, v, cand) => profileId + "#" + v + "#" + dataHash(cand);

/* ---- Konfigurationsvarningar (byggaren) ---- */
function profileWarnings(draft, job) {
  const w = [];
  const crits = (draft.criteria || []).filter((c) => c.active !== false);
  const groups = (draft.groups || []).filter((g) => g.active !== false);
  if (!crits.length) w.push({ kind: "err", msg: "Profilen har inga aktiva kriterier och kan inte beräknas." });
  if (draft.norm !== "sum" && groups.length && groups.every((g) => !g.weight)) w.push({ kind: "err", msg: "Ingen grupp har vikt — med gruppviktad normalisering blir resultatet alltid 0." });
  groups.forEach((g) => { if (!crits.some((c) => c.groupId === g.id)) w.push({ kind: "warn", msg: "Gruppen " + JSON.stringify(g.name) + " har inga kriterier." }); });
  crits.forEach((c) => {
    if (!c.weight && !c.max) w.push({ kind: "warn", msg: "Kriteriet " + JSON.stringify(c.name) + " har vikt 0 och kan aldrig ge poäng." });
    if (c.source !== "_cv" && c.model !== "manual" && !(job.criteria || []).some((f) => f.id === c.source)) w.push({ kind: "err", msg: "Kriteriet " + JSON.stringify(c.name) + " pekar på ett formulärfält som inte finns." });
    if (c.model === "band" && (num(c.bandHi) == null || num(c.bandLo) == null || num(c.bandHi) < num(c.bandLo))) w.push({ kind: "err", msg: "Kriteriet " + JSON.stringify(c.name) + " har ett ogiltigt intervall." });
    if (c.model === "linear" && (num(c.ideal) == null || num(c.ideal) === (num(c.floor) ?? 0))) w.push({ kind: "err", msg: "Kriteriet " + JSON.stringify(c.name) + " saknar giltigt målvärde." });
    if (c.model === "steps" && !(c.steps || []).length) w.push({ kind: "err", msg: "Kriteriet " + JSON.stringify(c.name) + " har inga trappsteg." });
  });
  const dupes = crits.filter((c, i) => crits.findIndex((x) => x.source === c.source && x.model === c.model) !== i);
  dupes.forEach((c) => w.push({ kind: "warn", msg: "Kriteriet " + JSON.stringify(c.name) + " dubblerar en annan bedömning av samma fält." }));
  return w;
}

/* ---- Modell ---- */
const MODEL_FOR_FIELD = { number: "linear", budget: "band", ordinal: "ordinal", multiselect: "perOption", boolean: "boolean", match: "match", file: "document", text: "manual", date: "fixed", phone: "fixed", url: "fixed" };
function mkCriterion(field, groupId, order) {
  const model = MODEL_FOR_FIELD[field.type] || "fixed";
  return {
    id: "sc" + uid(), groupId, name: field.label, desc: "", source: field.id, type: field.type, model,
    weight: field.weight || 10, min: null, max: null, dir: "higher", negative: false,
    ideal: field.ideal ?? null, floor: 0, bandLo: null, bandHi: field.budget ?? null,
    steps: [], options: (field.options || []).map((o) => ({ value: o.value ?? o, pts: field.weight || 10 })),
    matchValue: "", scale: field.scale || null,
    onMissing: "zero", conditions: { mode: "all", rules: [] }, order, active: true,
  };
}
function defaultProfile(job, name) {
  const g1 = { id: "sg" + uid(), name: "Obligatoriska krav", desc: "", order: 0, weight: 3, agg: "sum", active: true };
  const g2 = { id: "sg" + uid(), name: "Erfarenhet och kompetens", desc: "", order: 1, weight: 2, agg: "sum", active: true };
  const g3 = { id: "sg" + uid(), name: "Villkor och tillgänglighet", desc: "", order: 2, weight: 1, agg: "sum", active: true };
  const pick = (f) => (f.knockout || f.required) ? g1.id : ["number", "ordinal", "multiselect"].includes(f.type) ? g2.id : g3.id;
  const criteria = (job.criteria || []).filter((f) => f.scored !== false).map((f, i) => mkCriterion(f, pick(f), i));
  return {
    id: "sp" + uid(), name: name || "Standardprofil", desc: "", primary: true, active: true, archived: false,
    norm: "weighted", version: 0, versions: [],
    draft: { groups: [g1, g2, g3], criteria, norm: "weighted", updatedAt: Date.now() },
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}
const ensureScoring = (job) => (job.scoring && Array.isArray(job.scoring.profiles) && job.scoring.profiles.length)
  ? job : { ...job, scoring: { profiles: [defaultProfile(job)] } };
const activeVersion = (job) => {
  const p = ((job.scoring && job.scoring.profiles) || []).find((x) => x.primary && x.active && !x.archived && x.version > 0);
  if (!p) return null;
  const v = (p.versions || []).find((x) => x.v === p.version);
  return v ? { profile: p, ver: v } : null;
};
const currentScore = (cand) => (cand.scores || []).find((s) => s.current) || null;
/* ===================== PIPELINE, SLA OCH FÖRFLYTTNINGSMOTOR ===================== */
/* Stegtyper. `legacy` håller den gamla statusmodellen synkad så att kö, statistik,
 * kalender och rapporter fortsätter fungera oförändrat. */
const STAGE_TYPES = {
  incoming:   { label: "Inkommande",  legacy: "new",       final: false },
  review:     { label: "Granskning",  legacy: "new",       final: false },
  screening:  { label: "Screening",   legacy: "new",       final: false },
  shortlist:  { label: "Shortlist",   legacy: "shortlist", final: false },
  interview:  { label: "Intervju",    legacy: "interview", final: false },
  assessment: { label: "Bedömning",   legacy: "interview", final: false },
  references: { label: "Referenser",  legacy: "interview", final: false },
  offer:      { label: "Erbjudande",  legacy: "interview", final: false },
  reserve:    { label: "Reserv",      legacy: "reserve",   final: true },
  hired:      { label: "Anställd",    legacy: "hired",     final: true },
  rejected:   { label: "Avslag",      legacy: "reject",    final: true },
  withdrawn:  { label: "Återkallad",  legacy: "reject",    final: true },
  custom:     { label: "Eget steg",   legacy: "new",       final: false },
};
const STAGE_COLORS = ["#5E655F", "#2C5F86", "#0B5C52", "#B8763A", "#7A3E8C", "#C2513A", "#8A6516"];
const SLA_LABEL = { none: "Ingen SLA", ontime: "Inom tid", warning: "Närmar sig deadline", late: "Försenad", critical: "Kritiskt försenad", paused: "Pausad", exempt: "Undantagen", done: "Avslutad" };
const REJECT_REASONS = ["Saknar obligatoriskt krav", "Otillräcklig erfarenhet", "Annan kandidat gick vidare", "Lön eller villkor", "Tillgänglighet", "Plats eller arbetsform", "Ansökan återkallad", "Tjänsten avbruten", "Annan orsak"];

const mkStage = (o) => ({
  id: "s" + uid(), key: o.key, name: o.name, desc: o.desc || "", type: o.type, color: o.color || STAGE_COLORS[0],
  active: true, hidden: false, system: !!o.system, locked: !!o.system, archived: false,
  ownerId: null, ownerRole: "", assign: "keep",
  sla: { mode: o.sla ? "soft" : "none", days: o.sla || 0, calendar: "business", warnDays: 1, escalate: "owner" },
  req: { reason: !!o.reqReason, comment: false, assessment: false, interview: false, cv: false, contact: false, owner: false, roles: [] },
  allowBulk: true, allowBack: true, allowAuto: true, confirm: !!o.confirm,
  createdAt: Date.now(), updatedAt: Date.now(),
});
function defaultPipeline() {
  const stages = [
    mkStage({ key: "new", name: "Nya ansökningar", type: "incoming", system: true, color: STAGE_COLORS[0], sla: 2 }),
    mkStage({ key: "review", name: "Första granskning", type: "review", color: STAGE_COLORS[1], sla: 2 }),
    mkStage({ key: "shortlist", name: "Shortlist", type: "shortlist", color: STAGE_COLORS[2], sla: 3 }),
    mkStage({ key: "interview", name: "Intervju", type: "interview", color: STAGE_COLORS[2], sla: 3 }),
    mkStage({ key: "final", name: "Slutbedömning", type: "assessment", color: STAGE_COLORS[3], sla: 1 }),
    mkStage({ key: "offer", name: "Erbjudande", type: "offer", color: STAGE_COLORS[6], sla: 2, confirm: true }),
    mkStage({ key: "hired", name: "Anställd", type: "hired", system: true, color: STAGE_COLORS[6], confirm: true }),
    mkStage({ key: "reserve", name: "Reserv", type: "reserve", system: true, color: STAGE_COLORS[3] }),
    mkStage({ key: "reject", name: "Avslag", type: "rejected", system: true, color: STAGE_COLORS[5], reqReason: true, confirm: true }),
    mkStage({ key: "withdrawn", name: "Återkallad", type: "withdrawn", system: true, color: STAGE_COLORS[0], reqReason: true }),
  ].map((st, i) => ({ ...st, order: i }));
  return { id: "p" + uid(), name: "Standardpipeline", desc: "", version: 1, stages, versions: [], updatedAt: Date.now(), dirty: false };
}
const OLD_STAGE_KEY = { new: "new", shortlist: "shortlist", interview: "interview", reserve: "reserve", reject: "reject", hired: "hired" };
const stageByKey = (p, k) => p.stages.find((st) => st.key === k);
const stageById = (p, id) => p.stages.find((st) => st.id === id);
const startStage = (p) => p.stages.filter((st) => !st.archived && st.type === "incoming").sort((a, b) => a.order - b.order)[0] || p.stages[0];
const liveStages = (p) => p.stages.filter((st) => !st.archived && !st.hidden).sort((a, b) => a.order - b.order);
const legacyOf = (st) => (STAGE_TYPES[st.type] || {}).legacy || "new";

/* Deterministisk och idempotent migrering: körs om utan att skapa dubbletter. */
function ensurePipeline(job) {
  if (job.pipeline && job.pipeline.stages && job.pipeline.stages.length) return job;
  return { ...job, pipeline: defaultPipeline() };
}
function migrateCandidate(c, pipe) {
  if (c._p >= 1 && c.stageId && stageById(pipe, c.stageId)) return c;
  const key = OLD_STAGE_KEY[c.status] || "new";
  const st = stageByKey(pipe, key) || startStage(pipe);
  const enteredAt = c.at || Date.now();
  const visits = (Array.isArray(c.visits) && c.visits.length) ? c.visits : [{
    id: "v" + uid(), stageId: st.id, stageKey: st.key, stageName: st.name, enteredAt, exitedAt: null,
    movedBy: null, reason: c.reason || "", comment: "", pauses: [], exception: null, pipeVersion: pipe.version,
  }];
  return { ...c, _p: 1, stageId: st.id, rev: c.rev || 0, ownerId: c.ownerId || null, visits };
}

/* ---- Kalender och arbetsdagar (organisationens tidszon, deterministiskt) ---- */
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
const isWorkday = (t, hol) => { const w = new Date(t).getDay(); return w !== 0 && w !== 6 && !hol.includes(dayKey(t)); };
function addDaysCal(from, n, calendar, hol) {
  if (calendar !== "business") return from + n * 864e5;
  let t = from, left = n;
  while (left > 0) { t += 864e5; if (isWorkday(t, hol)) left--; }
  return t;
}
function subDaysCal(from, n, calendar, hol) {
  if (calendar !== "business") return from - n * 864e5;
  let t = from, left = n;
  while (left > 0) { t -= 864e5; if (isWorkday(t, hol)) left--; }
  return t;
}
function pausedMs(v, now) {
  return (v.pauses || []).reduce((ms, p) => ms + ((p.to || now) - p.from), 0);
}
/* SLA-status räknas alltid fram från stegets konfiguration + faktisk stegvistelse. */
function slaState(cand, pipe, org, now) {
  const v = (cand.visits || []).find((x) => !x.exitedAt);
  if (!v) return { status: "done", inStage: 0 };
  const st = stageById(pipe, v.stageId);
  const hol = (org && org.holidays) || [];
  const paused = (v.pauses || []).some((p) => !p.to);
  const inStage = now - v.enteredAt - pausedMs(v, now);
  if (v.exception && v.exception.exempt) return { status: "exempt", inStage, note: v.exception.reason };
  if (!st || !st.sla || st.sla.mode === "none" || !st.sla.days) return { status: "none", inStage };
  if (paused) return { status: "paused", inStage, note: (v.pauses.find((p) => !p.to) || {}).reason };
  const base = v.enteredAt + pausedMs(v, now);
  const due = (v.exception && v.exception.dueAt) || addDaysCal(base, st.sla.days, st.sla.calendar, hol);
  /* Varningen räknas alltid bakåt från den FAKTISKA deadlinen — även när ett undantag flyttat den. */
  const warn = subDaysCal(due, Math.min(st.sla.days, st.sla.warnDays || 1), st.sla.calendar, hol);
  const crit = addDaysCal(due, Math.max(1, st.sla.days), st.sla.calendar, hol);
  const status = now >= crit ? "critical" : now >= due ? "late" : now >= warn ? "warning" : "ontime";
  return { status, inStage, dueAt: due, remaining: due - now, hard: st.sla.mode === "hard" };
}

/* ---- Förflyttningsmotor: en enda väg in för ALLA förflyttningar ---- */
/* Returnerar blockerare med kod, förklaring och hur de löses. Ingen "något gick fel". */
function moveBlockers(state, cand, job, to, me, opts = {}) {
  const b = [];
  const pipe = job.pipeline;
  if (isReadonly(job)) b.push({ code: "job_archived", msg: "Tjänsten är arkiverad", fix: "Återställ tjänsten under Tjänster." });
  if (!to || to.archived) b.push({ code: "stage_gone", msg: "Målsteget finns inte längre", fix: "Välj ett aktivt steg." });
  if (!can(me.role, "decide")) b.push({ code: "perm", msg: "Du saknar behörighet att flytta kandidater", fix: "Be en admin ändra din roll." });
  if (to && to.req && to.req.roles && to.req.roles.length && !to.req.roles.includes(me.role)) b.push({ code: "stage_role", msg: "Bara " + to.req.roles.map((r) => ROLE_LABEL[r]).join(", ") + " får flytta till " + to.name, fix: "Be någon med rätt roll göra flytten." });
  if (to && cand.stageId === to.id) b.push({ code: "same", msg: "Kandidaten är redan i " + to.name, fix: "Välj ett annat steg." });
  if (opts.rev != null && cand.rev !== opts.rev) b.push({ code: "conflict", msg: "Kandidaten har ändrats av någon annan under tiden", fix: "Ladda om och försök igen." });
  const from = pipe && stageById(pipe, cand.stageId);
  if (from && to && !from.allowBack && to.order < from.order) b.push({ code: "no_back", msg: from.name + " tillåter inte att kandidater flyttas tillbaka", fix: "Ändra steget i pipelinebyggaren." });
  const r = (to && to.req) || {};
  if (r.reason && !String(opts.reason || "").trim()) b.push({ code: "reason", msg: to.name + " kräver en anledning", fix: "Ange en anledning i formuläret." });
  if (r.comment && !String(opts.comment || "").trim()) b.push({ code: "comment", msg: to.name + " kräver en intern kommentar", fix: "Skriv en kommentar." });
  if (r.owner && !(opts.ownerId || cand.ownerId)) b.push({ code: "owner", msg: to.name + " kräver en ansvarig", fix: "Välj ansvarig i formuläret." });
  if (r.contact && !validEmail(cand.email)) b.push({ code: "contact", msg: "Kandidaten saknar giltig e-postadress", fix: "Begär komplettering från kandidaten." });
  if (r.cv && !Object.values(cand.answers || {}).some((v) => v && typeof v === "object" && v.url)) b.push({ code: "cv", msg: "Kandidaten har inte laddat upp CV", fix: "Begär komplettering." });
  if (r.interview && !ivActive(cand)) b.push({ code: "interview", msg: "Ingen intervju är bokad", fix: "Boka en intervju från kandidatpanelen." });
  if (r.assessment && !(cand.rating > 0)) b.push({ code: "assessment", msg: "Bedömning saknas", fix: "Sätt betyg på kandidaten." });
  return b;
}
function ownerFor(to, job, cand, opts) {
  if (opts.ownerId !== undefined && opts.ownerId !== null) return opts.ownerId || null;
  if (to.assign === "job") return job.ownerId || null;
  if (to.assign === "stage") return to.ownerId || null;
  if (to.assign === "none") return null;
  return cand.ownerId || null;
}
/* ===================== JOBBLIVSCYKEL ===================== */
/* Varje status har: innebörd, om jobbet syns publikt, om det tar emot ansökningar,
 * tillåtna nästa steg, vilken behörighet som krävs och om anledning måste anges. */
const JOB_LIFE = {
  draft:     { label: "Utkast",                tone: "muted",  public: false, accepts: false, next: ["pending", "published", "cancelled", "archived"], perm: "edit" },
  pending:   { label: "Väntar på godkännande", tone: "amber",  public: false, accepts: false, next: ["approved", "draft", "cancelled"], perm: "edit" },
  approved:  { label: "Godkänd",               tone: "blue",   public: false, accepts: false, next: ["scheduled", "published", "draft"], perm: "approve" },
  scheduled: { label: "Schemalagd",            tone: "blue",   public: false, accepts: false, next: ["published", "paused", "cancelled"], perm: "publish" },
  published: { label: "Publicerad",            tone: "petrol", public: true,  accepts: true,  next: ["paused", "closed", "filled", "cancelled"], perm: "publish" },
  paused:    { label: "Pausad",                tone: "amber",  public: true,  accepts: false, next: ["published", "closed", "cancelled"], perm: "publish" },
  closed:    { label: "Stängd",                tone: "muted",  public: false, accepts: false, next: ["published", "filled", "archived"], perm: "publish" },
  filled:    { label: "Tillsatt",              tone: "gold",   public: false, accepts: false, next: ["archived", "closed"], perm: "decide" },
  cancelled: { label: "Avbruten",              tone: "brick",  public: false, accepts: false, next: ["draft", "archived"], perm: "edit", reason: true },
  archived:  { label: "Arkiverad",             tone: "muted",  public: false, accepts: false, next: ["draft"], perm: "edit", readonly: true },
};
const JOB_PRIO = { low: "Låg", normal: "Normal", high: "Hög", urgent: "Brådskande" };
const canMove = (from, to) => !!(JOB_LIFE[from] && JOB_LIFE[from].next.includes(to));
const isReadonly = (j) => !!(JOB_LIFE[j.status] && JOB_LIFE[j.status].readonly);
const acceptsApps = (j) => !!(JOB_LIFE[j.status] && JOB_LIFE[j.status].accepts) && !j.internal;
const isPublic = (j) => !!(JOB_LIFE[j.status] && JOB_LIFE[j.status].public) && !j.internal;

/* Aktivitetslogg per jobb — överlever pipeline- och konfigurationsändringar. */
const JOB_ACT = { created: "Jobb skapat", edited: "Uppgifter ändrade", status: "Status ändrad", published: "Publicerad", paused: "Pausad", form: "Formulär ändrat", annons: "Jobbannons ändrad", scoring: "Scoring ändrad", duplicated: "Duplicerad", archived: "Arkiverad", restored: "Återställd", bulk: "Bulkåtgärd", owner: "Ansvarig ändrad", tags: "Taggar ändrade", hired: "Kandidat anställd" };
function jlog(job, kind, note, who) {
  const e = { id: "a" + uid(), at: Date.now(), kind, note: note || "", by: (_TEAM.find((m) => m.id === who) || {}).name || "System", byId: who || null };
  return { ...job, updatedAt: Date.now(), activity: [e, ...(job.activity || [])].slice(0, 200) };
}

/* Migrering: gamla jobb (open/paused/closed/archived) får full modell utan dataförlust. */
const OLD_STATUS = { open: "published", paused: "paused", closed: "filled", archived: "archived" };
function migrateJob(j) {
  /* _m = modellversion. Utan den är jobbet skapat före livscykeln och måste mappas om:
   * gamla "closed" betydde Tillsatt, medan nya "closed" betyder Stängd. */
  const legacy = !(j._m >= 2);
  const status = legacy ? (OLD_STATUS[j.status] || (JOB_LIFE[j.status] ? j.status : "draft")) : (JOB_LIFE[j.status] ? j.status : "draft");
  return {
    unit: "", extent: "", category: "", priority: "normal",
    ownerId: null, managerId: null, teamIds: [], tags: [], internal: false,
    publishedAt: null, closedAt: null, closedReason: "", hiredId: null, activity: [],
    updatedAt: j.createdAt || Date.now(),
    ...j,
    _m: 2,
    status,
    publicTitle: j.publicTitle || j.title,
    ref: j.ref || "REK-" + String(j.id || uid()).slice(-4).toUpperCase(),
  };
}
const TAG_COLORS = ["#0B5C52", "#D96F4B", "#B8763A", "#2C5F86", "#7A3E8C", "#C2513A", "#5E655F"];
const normTag = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
/* ===================== KARRIARSIDOR ===================== *//* ---- Karriärsidebyggare (i appen) ---- */
function BlockEditor({ b, pageId, D }) {
  const set = (patch) => D({ type: "CAREER_BLOCK_SET", pageId, id: b.id, patch });
  const F = ({ l, v, on, ph, area }) => <label className="ats-field"><span className="ats-field-l">{l}</span>
    {area ? <textarea className="ats-inp" value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} rows={4} />
      : <input className="ats-inp" value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} />}</label>;
  const List = ({ items, cols, add, label }) => <div className="ats-cb-list">
    {(items || []).map((it, i) => <div key={i} className="ats-cb-item">
      {cols.map(([k, ph]) => <input key={k} className="ats-inp" value={it[k] || ""} placeholder={ph} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], [k]: e.target.value }; set({ items: n }); }} />)}
      <button className="ats-ghost is-sm" onClick={() => set({ items: items.filter((_, j) => j !== i) })} title="Ta bort"><Trash2 size={14} /></button>
    </div>)}
    <button className="ats-ghost is-sm" onClick={() => set({ items: [...(items || []), add] })}><Plus size={14} /> {label}</button>
  </div>;

  switch (b.type) {
    case "hero": return <>
      <F l="Rubrik" v={b.title} on={(v) => set({ title: v })} />
      <F l="Underrubrik" v={b.sub} on={(v) => set({ sub: v })} area />
      <F l="Bakgrundsbild (URL)" v={b.image} on={(v) => set({ image: v })} ph="https://…" />
      <div className="ats-tpl-two"><F l="Knapptext" v={b.cta} on={(v) => set({ cta: v })} /><F l="Länk till (sidans adress eller 'jobb')" v={b.ctaHref} on={(v) => set({ ctaHref: v })} ph="jobb" /></div>
    </>;
    case "text": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><F l="Text" v={b.body} on={(v) => set({ body: v })} area /></>;
    case "textimage": return <>
      <F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><F l="Text" v={b.body} on={(v) => set({ body: v })} area />
      <F l="Bild (URL)" v={b.image} on={(v) => set({ image: v })} ph="https://…" />
      <label className="ats-cb-check"><input type="checkbox" checked={!!b.flip} onChange={(e) => set({ flip: e.target.checked })} /> Bilden till vänster</label>
    </>;
    case "gallery": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} />
      <div className="ats-cb-list">{(b.images || []).map((u, i) => <div key={i} className="ats-cb-item">
        <input className="ats-inp" value={u} placeholder="https://…" onChange={(e) => { const n = [...b.images]; n[i] = e.target.value; set({ images: n }); }} />
        <button className="ats-ghost is-sm" onClick={() => set({ images: b.images.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
      </div>)}<button className="ats-ghost is-sm" onClick={() => set({ images: [...(b.images || []), ""] })}><Plus size={14} /> Lägg till bild</button></div>
    </>;
    case "video": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><F l="Länk till YouTube eller Vimeo" v={b.url} on={(v) => set({ url: v })} ph="https://youtube.com/watch?v=…" /></>;
    case "stats": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><List items={b.items} cols={[["v", "42"], ["l", "medarbetare"]]} add={{ v: "", l: "" }} label="Lägg till siffra" /></>;
    case "quote": return <><F l="Citat" v={b.text} on={(v) => set({ text: v })} area /><div className="ats-tpl-two"><F l="Namn" v={b.author} on={(v) => set({ author: v })} /><F l="Roll" v={b.role} on={(v) => set({ role: v })} /></div></>;
    case "benefits": case "values": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><List items={b.items} cols={[["title", "Rubrik"], ["desc", "Beskrivning"]]} add={{ title: "", desc: "" }} label="Lägg till" /></>;
    case "departments": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><List items={b.items} cols={[["name", "Avdelning"], ["desc", "Beskrivning"]]} add={{ name: "", desc: "" }} label="Lägg till avdelning" /></>;
    case "locations": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><List items={b.items} cols={[["name", "Ort"], ["address", "Adress"]]} add={{ name: "", address: "" }} label="Lägg till kontor" /></>;
    case "people": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><List items={b.items} cols={[["name", "Namn"], ["role", "Roll"], ["quote", "Citat"], ["image", "Bild-URL"]]} add={{ name: "", role: "", quote: "", image: "" }} label="Lägg till medarbetare" /></>;
    case "jobs": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><label className="ats-field"><span className="ats-field-l">Antal jobb som visas</span><input className="ats-inp" type="number" min="1" max="20" value={b.limit || 6} onChange={(e) => set({ limit: Number(e.target.value) })} /></label></>;
    case "faq": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><List items={b.items} cols={[["q", "Fråga"], ["a", "Svar"]]} add={{ q: "", a: "" }} label="Lägg till fråga" /></>;
    case "cta": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} /><F l="Underrubrik" v={b.sub} on={(v) => set({ sub: v })} />
      <div className="ats-tpl-two"><F l="Knapptext" v={b.label} on={(v) => set({ label: v })} /><F l="Länk till" v={b.href} on={(v) => set({ href: v })} ph="jobb" /></div></>;
    case "contact": return <><F l="Rubrik" v={b.title} on={(v) => set({ title: v })} />
      <div className="ats-tpl-two"><F l="Namn" v={b.name} on={(v) => set({ name: v })} /><F l="Roll" v={b.role} on={(v) => set({ role: v })} /></div>
      <div className="ats-tpl-two"><F l="E-post" v={b.email} on={(v) => set({ email: v })} /><F l="Telefon" v={b.phone} on={(v) => set({ phone: v })} /></div></>;
    case "spacer": return <label className="ats-field"><span className="ats-field-l">Höjd (px)</span><input className="ats-inp" type="number" min="8" max="200" value={b.size || 64} onChange={(e) => set({ size: Number(e.target.value) })} /></label>;
    default: return <p className="ats-muted">Det här blocket har inga inställningar.</p>;
  }
}

function CareerView({ state, D, me, showToast }) {
  const c = careerOf(state);
  const canEdit = can(me.role, "edit");
  const [pageId, setPageId] = useState(null);
  const [selId, setSelId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newPage, setNewPage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  useEffect(() => { if (!c) D({ type: "CAREER_INIT" }); }, [c, D]);
  if (!c) return <div className="ats-view"><PageHeader title="Karriärsida" /><div className="ats-col-empty" style={{ padding: 40 }}>Förbereder…</div></div>;

  const page = c.pages.find((p) => p.id === pageId) || c.pages[0];
  const url = "/karriar/" + c.slug + (page.slug ? "/" + page.slug : "");
  const setC = (patch) => D({ type: "CAREER_SET", patch });
  const setP = (patch) => D({ type: "CAREER_PAGE_SET", id: page.id, patch });
  const IC = { Rocket, FileText, Blocks, Layers, Eye, BarChart3, MessageCircle, Sparkles, ShieldCheck, Building2, MapPin, Users, Briefcase, HelpCircle, ArrowRight, Mail, ArrowDown, SlidersHorizontal };

  const publish = async () => {
    if (!sbEnabled) { showToast({ kind: "warn", msg: "Molnet krävs för publicering" }); return; }
    setBusy(true);
    const ok = await sbUpsert("career_sites", { slug: c.slug, org_id: SB_ORG, data: { ...c, name: state.org.companyName }, published: true, updated_at: new Date().toISOString() });
    setBusy(false);
    showToast({ kind: ok ? "ok" : "warn", msg: ok ? "Karriärsidan är publicerad · " + url : "Kunde inte publicera — kontrollera att SQL:en är körd" });
  };
  const unpublish = async () => {
    setBusy(true);
    const ok = await sbUpsert("career_sites", { slug: c.slug, org_id: SB_ORG, data: { ...c, name: state.org.companyName }, published: false, updated_at: new Date().toISOString() });
    setBusy(false);
    showToast({ kind: ok ? "ok" : "warn", msg: ok ? "Karriärsidan är avpublicerad" : "Kunde inte avpublicera" });
  };
  const restore = async () => {
    setConfirmRestore(false);
    const rows = await sbGet("career_sites?slug=eq." + encodeURIComponent(c.slug) + "&select=data");
    if (rows && rows[0] && rows[0].data) { setC(rows[0].data); showToast({ kind: "ok", msg: "Återställt till senast publicerade version" }); }
    else showToast({ kind: "warn", msg: "Ingen publicerad version att återställa till" });
  };

  return <div className="ats-view">
    <PageHeader title="Karriärsida" meta={<><span className="ats-mono">{url}</span></>} right={canEdit && <>
      <button className="ats-ghost is-sm" onClick={() => window.open(url, "_blank")}><Eye size={15} /> Förhandsvisa</button>
      <button className="ats-btn-primary is-sm" disabled={busy} onClick={publish}><Rocket size={15} /> {busy ? "Publicerar…" : "Publicera"}</button>
    </>} />

    <div className="ats-cb">
      <aside className="ats-cb-side">
        <div className="ats-panel">
          <div className="ats-panel-h"><h2>Sidor</h2></div>
          <div className="ats-cb-pages">{c.pages.map((p) => <button key={p.id} className={"ats-cb-page" + (p.id === page.id ? " is-on" : "")} onClick={() => { setPageId(p.id); setSelId(null); }}>
            <span>{p.name}</span>
            <em>{p.published ? "Publicerad" : "Utkast"}{p.inNav ? "" : " · dold"}</em>
          </button>)}</div>
          {canEdit && <div className="ats-cb-newpage">
            <input className="ats-inp" value={newPage} onChange={(e) => setNewPage(e.target.value)} placeholder="Ny sida, t.ex. Vår kultur" onKeyDown={(e) => { if (e.key === "Enter" && newPage.trim()) { D({ type: "CAREER_PAGE_ADD", name: newPage.trim() }); setNewPage(""); } }} />
            <button className="ats-ghost is-sm" disabled={!newPage.trim()} onClick={() => { D({ type: "CAREER_PAGE_ADD", name: newPage.trim() }); setNewPage(""); }}><Plus size={14} /></button>
          </div>}
        </div>

        <div className="ats-panel">
          <div className="ats-panel-h"><h2>Sidinställningar</h2></div>
          <label className="ats-field"><span className="ats-field-l">Sidnamn</span><input className="ats-inp" value={page.name} disabled={!canEdit} onChange={(e) => setP({ name: e.target.value })} /></label>
          <label className="ats-field"><span className="ats-field-l">Adress</span><input className="ats-inp" value={page.slug} disabled={!canEdit || page.id === "p_start"} onChange={(e) => setP({ slug: slugify(e.target.value) })} placeholder={page.id === "p_start" ? "(startsidan)" : "om-oss"} /></label>
          <label className="ats-field"><span className="ats-field-l">SEO-titel</span><input className="ats-inp" value={page.seoTitle} disabled={!canEdit} onChange={(e) => setP({ seoTitle: e.target.value })} placeholder={page.name + " — " + state.org.companyName} /></label>
          <label className="ats-field"><span className="ats-field-l">SEO-beskrivning</span><textarea className="ats-inp" value={page.seoDesc} disabled={!canEdit} onChange={(e) => setP({ seoDesc: e.target.value })} rows={2} /></label>
          <label className="ats-cb-check"><input type="checkbox" checked={page.published} disabled={!canEdit} onChange={(e) => setP({ published: e.target.checked })} /> Publicerad</label>
          <label className="ats-cb-check"><input type="checkbox" checked={page.inNav} disabled={!canEdit} onChange={(e) => setP({ inNav: e.target.checked })} /> Synlig i menyn</label>
          {canEdit && page.id !== "p_start" && <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => { D({ type: "CAREER_PAGE_DEL", id: page.id }); setPageId(null); }}><Trash2 size={14} /> Radera sidan</button>}
        </div>

        <div className="ats-panel">
          <div className="ats-panel-h"><h2>Varumärke</h2></div>
          <label className="ats-field"><span className="ats-field-l">Adress (karriärsidans slug)</span><input className="ats-inp" value={c.slug} disabled={!canEdit} onChange={(e) => setC({ slug: slugify(e.target.value) })} /></label>
          <label className="ats-field"><span className="ats-field-l">Logotyp (URL)</span><input className="ats-inp" value={c.brand.logo} disabled={!canEdit} onChange={(e) => setC({ brand: { ...c.brand, logo: e.target.value } })} placeholder="https://…" /></label>
          <label className="ats-field"><span className="ats-field-l">Profilfärg</span><div className="ats-cb-color"><input type="color" value={c.brand.color} disabled={!canEdit} onChange={(e) => setC({ brand: { ...c.brand, color: e.target.value } })} /><span className="ats-mono">{c.brand.color}</span></div></label>
          {["linkedin", "instagram", "facebook", "web"].map((k) => <label key={k} className="ats-field"><span className="ats-field-l">{k === "web" ? "Webbplats" : k.charAt(0).toUpperCase() + k.slice(1)}</span><input className="ats-inp" value={c.social[k]} disabled={!canEdit} onChange={(e) => setC({ social: { ...c.social, [k]: e.target.value } })} placeholder="https://…" /></label>)}
          {canEdit && <div className="ats-cb-brandacts">
            <button className="ats-ghost is-sm" onClick={unpublish}><EyeOff size={14} /> Avpublicera</button>
            <button className="ats-ghost is-sm" onClick={() => setConfirmRestore(true)}><RotateCcw size={14} /> Återställ</button>
          </div>}
        </div>
      </aside>

      <div className="ats-cb-main">
        <div className="ats-panel">
          <div className="ats-panel-h"><h2>Block på {page.name}</h2>{canEdit && <button className="ats-ghost is-sm" onClick={() => setAdding(true)}><Plus size={14} /> Lägg till block</button>}</div>
          {page.blocks.length === 0
            ? <div className="ats-col-empty" style={{ padding: 30 }}>Inga block än. Lägg till ditt första block.</div>
            : <div className="ats-cb-blocks">{page.blocks.map((b, i) => { const I = IC[BLOCK_DEFS[b.type].icon] || Blocks; return <div key={b.id} className={"ats-cb-block" + (selId === b.id ? " is-open" : "") + (b.hidden ? " is-hidden" : "")}>
              <div className="ats-cb-bh">
                <button className="ats-cb-btitle" onClick={() => setSelId(selId === b.id ? null : b.id)}>
                  <I size={15} /> <b>{BLOCK_DEFS[b.type].label}</b>
                  <span>{b.title || b.text || b.name || ""}</span>
                  {b.hidden && <em>dold</em>}
                  <ChevronDown size={15} className="ats-cb-chev" />
                </button>
                {canEdit && <div className="ats-cb-acts">
                  <button className="ats-ghost is-sm" disabled={i === 0} onClick={() => D({ type: "CAREER_BLOCK_MOVE", pageId: page.id, id: b.id, dir: -1 })} title="Flytta upp"><ArrowUp size={13} /></button>
                  <button className="ats-ghost is-sm" disabled={i === page.blocks.length - 1} onClick={() => D({ type: "CAREER_BLOCK_MOVE", pageId: page.id, id: b.id, dir: 1 })} title="Flytta ner"><ArrowDown size={13} /></button>
                  <button className="ats-ghost is-sm" onClick={() => D({ type: "CAREER_BLOCK_SET", pageId: page.id, id: b.id, patch: { hidden: !b.hidden } })} title={b.hidden ? "Visa" : "Dölj"}>{b.hidden ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                  <button className="ats-ghost is-sm" onClick={() => D({ type: "CAREER_BLOCK_DUP", pageId: page.id, id: b.id })} title="Duplicera"><Copy size={13} /></button>
                  <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => D({ type: "CAREER_BLOCK_DEL", pageId: page.id, id: b.id })} title="Ta bort"><Trash2 size={13} /></button>
                </div>}
              </div>
              {selId === b.id && <div className="ats-cb-body">{canEdit ? <BlockEditor b={b} pageId={page.id} D={D} /> : <p className="ats-muted">Du har inte behörighet att ändra innehållet.</p>}</div>}
            </div>; })}</div>}
        </div>
      </div>
    </div>

    {adding && <Modal title="Lägg till block" onClose={() => setAdding(false)} wide><div className="ats-cb-picker">
      {BLOCK_ORDER.map((t) => { const I = IC[BLOCK_DEFS[t].icon] || Blocks; return <button key={t} className="ats-cb-pick" onClick={() => { D({ type: "CAREER_BLOCK_ADD", pageId: page.id, block: t }); setAdding(false); }}>
        <I size={18} /> <b>{BLOCK_DEFS[t].label}</b>
      </button>; })}
    </div></Modal>}
    {confirmRestore && <Modal title="Återställ ändringar?" onClose={() => setConfirmRestore(false)}><div className="ats-erase">
      <p>Alla ändringar sedan senaste publicering kastas och sidan återgår till den publicerade versionen. Detta går inte att ångra.</p>
      <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setConfirmRestore(false)}>Avbryt</button><button className="ats-btn-danger" onClick={restore}><RotateCcw size={15} /> Återställ</button></div>
    </div></Modal>}
  </div>;
}

const BLOCK_DEFS = {
  hero: { label: "Hero", icon: "Rocket", make: () => ({ title: "Bli en del av oss", sub: "Vi bygger något vi är stolta över — och vi behöver fler.", image: "", cta: "Se lediga jobb", ctaHref: "jobb" }) },
  text: { label: "Text", icon: "FileText", make: () => ({ title: "Om oss", body: "Berätta kort om företaget, vad ni gör och varför någon vill jobba hos er." }) },
  textimage: { label: "Text med bild", icon: "Blocks", make: () => ({ title: "Så jobbar vi", body: "Beskriv vardagen, tempot och hur ni samarbetar.", image: "", flip: false }) },
  gallery: { label: "Bildgalleri", icon: "Layers", make: () => ({ title: "Hos oss", images: [] }) },
  video: { label: "Video", icon: "Eye", make: () => ({ title: "Möt teamet", url: "" }) },
  stats: { label: "Statistik", icon: "BarChart3", make: () => ({ title: "Rekyl i siffror", items: [{ v: "42", l: "medarbetare" }, { v: "3", l: "kontor" }, { v: "2014", l: "grundat" }] }) },
  quote: { label: "Citat", icon: "MessageCircle", make: () => ({ text: "Det bästa med jobbet är att jag får se resultatet av det jag gör.", author: "", role: "" }) },
  benefits: { label: "Förmåner", icon: "Sparkles", make: () => ({ title: "Förmåner", items: [{ title: "Kollektivavtal", desc: "Trygga villkor från dag ett." }, { title: "Friskvårdsbidrag", desc: "5 000 kr per år." }] }) },
  values: { label: "Värderingar", icon: "ShieldCheck", make: () => ({ title: "Våra värderingar", items: [{ title: "Ärlighet", desc: "Vi säger som det är, även när det skaver." }] }) },
  departments: { label: "Avdelningar", icon: "Building2", make: () => ({ title: "Avdelningar", items: [{ name: "Sälj", desc: "Möter kunderna varje dag." }] }) },
  locations: { label: "Kontor och platser", icon: "MapPin", make: () => ({ title: "Våra kontor", items: [{ name: "Växjö", address: "Storgatan 1" }] }) },
  people: { label: "Medarbetare", icon: "Users", make: () => ({ title: "Möt några av oss", items: [{ name: "", role: "", quote: "", image: "" }] }) },
  jobs: { label: "Lediga jobb", icon: "Briefcase", make: () => ({ title: "Lediga jobb", limit: 6 }) },
  faq: { label: "Vanliga frågor", icon: "HelpCircle", make: () => ({ title: "Vanliga frågor", items: [{ q: "Hur går rekryteringen till?", a: "Du söker via formuläret, vi läser alla ansökningar och hör av oss oavsett hur det går." }] }) },
  cta: { label: "Uppmaning", icon: "ArrowRight", make: () => ({ title: "Låter det som du?", sub: "Se våra lediga tjänster.", label: "Se lediga jobb", href: "jobb" }) },
  contact: { label: "Kontakt", icon: "Mail", make: () => ({ title: "Frågor?", name: "", role: "", email: "", phone: "" }) },
  spacer: { label: "Mellanrum", icon: "ArrowDown", make: () => ({ size: 64 }) },
  divider: { label: "Avdelare", icon: "SlidersHorizontal", make: () => ({}) },
};
const BLOCK_ORDER = ["hero", "text", "textimage", "gallery", "video", "stats", "quote", "benefits", "values", "departments", "locations", "people", "jobs", "faq", "cta", "contact", "spacer", "divider"];
const newBlock = (type) => ({ id: "b" + uid(), type, hidden: false, ...BLOCK_DEFS[type].make() });
const slugify = (v) => String(v || "").toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function defaultCareer(org) {
  return {
    slug: slugify(org.companyName) || "foretag",
    brand: { color: "#0B5C52", logo: "" },
    social: { linkedin: "", instagram: "", facebook: "", web: "" },
    intro: "",
    pages: [
      { id: "p_start", slug: "", name: "Start", seoTitle: "", seoDesc: "", published: true, inNav: true, blocks: [newBlock("hero"), newBlock("text"), newBlock("jobs"), newBlock("cta")] },
    ],
  };
}
const careerOf = (state) => state.career || null;
/* ---- Publik karriärsida ---- */
function JobCard({ j, onOpen }) {
  const a = (j.form && j.form.annons) || {};
  const team = (j.form && j.form.team) || "";
  const chips = [a.location, a.workmode, a.employment].filter(Boolean);
  return <button className="ats-cs-job" onClick={() => onOpen(j.slug)}>
    <div className="ats-cs-job-m">
      {team && <span className="ats-cs-job-dep">{team}</span>}
      <h3>{j.title}</h3>
      {a.pitch && <p>{a.pitch}</p>}
      <div className="ats-cs-job-chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>
    </div>
    <span className="ats-cs-job-go"><ArrowRight size={18} /></span>
  </button>;
}

function JobList({ jobs, onOpen, compact }) {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [dep, setDep] = useState("");
  const [emp, setEmp] = useState("");
  const [mode, setMode] = useState("");
  const [sort, setSort] = useState("title");
  const [page, setPage] = useState(1);
  const PER = 8;
  const val = (j, k) => (k === "team" ? (j.form && j.form.team) || "" : ((j.form && j.form.annons) || {})[k] || "");
  const uniq = (k) => [...new Set(jobs.map((j) => val(j, k)).filter(Boolean))].sort();
  const active = [loc && ["Plats", loc, setLoc], dep && ["Avdelning", dep, setDep], emp && ["Anställning", emp, setEmp], mode && ["Arbetsform", mode, setMode]].filter(Boolean);
  const shown = jobs
    .filter((j) => !q.trim() || (j.title + " " + val(j, "pitch")).toLowerCase().includes(q.toLowerCase()))
    .filter((j) => !loc || val(j, "location") === loc)
    .filter((j) => !dep || val(j, "team") === dep)
    .filter((j) => !emp || val(j, "employment") === emp)
    .filter((j) => !mode || val(j, "workmode") === mode)
    .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title, "sv") : String(val(b, "location")).localeCompare(String(val(a, "location")), "sv")));
  const clear = () => { setQ(""); setLoc(""); setDep(""); setEmp(""); setMode(""); setPage(1); };
  const total = shown.length;
  const visible = compact ? shown.slice(0, compact) : shown.slice(0, page * PER);
  const Sel = ({ v, on, opts, ph }) => opts.length > 0 ? <select className="ats-cs-sel" value={v} onChange={(e) => { on(e.target.value); setPage(1); }} aria-label={ph}><option value="">{ph}</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select> : null;

  return <div className="ats-cs-jl">
    {!compact && <>
      <div className="ats-cs-filters">
        <div className="ats-feat-search"><Search size={17} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Sök bland tjänsterna…" aria-label="Sök jobb" /></div>
        <Sel v={loc} on={setLoc} opts={uniq("location")} ph="Alla platser" />
        <Sel v={dep} on={setDep} opts={uniq("team")} ph="Alla avdelningar" />
        <Sel v={emp} on={setEmp} opts={uniq("employment")} ph="Alla anställningsformer" />
        <Sel v={mode} on={setMode} opts={uniq("workmode")} ph="Alla arbetsformer" />
        <select className="ats-cs-sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortering"><option value="title">Sortera: titel</option><option value="location">Sortera: plats</option></select>
      </div>
      <div className="ats-cs-meta">
        <span>{total} {total === 1 ? "ledig tjänst" : "lediga tjänster"}</span>
        {(active.length > 0 || q.trim()) && <div className="ats-cs-active">
          {q.trim() && <button className="ats-cs-tag" onClick={() => setQ("")}>{JSON.stringify(q)} <X size={13} /></button>}
          {active.map(([l, v, on]) => <button key={l} className="ats-cs-tag" onClick={() => on("")}>{l}: {v} <X size={13} /></button>)}
          <button className="ats-cs-clear" onClick={clear}>Rensa alla filter</button>
        </div>}
      </div>
    </>}
    {total === 0
      ? <div className="ats-feat-empty"><Briefcase size={28} /><h3>Inga tjänster matchar</h3><p>{jobs.length === 0 ? "Just nu finns inga lediga tjänster. Titta gärna in igen." : "Prova att rensa filtren."}</p>{jobs.length > 0 && <button className="ats-lp-ghost" onClick={clear}>Rensa filter</button>}</div>
      : <div className="ats-cs-jobs">{visible.map((j) => <JobCard key={j.slug} j={j} onOpen={onOpen} />)}</div>}
    {!compact && visible.length < total && <button className="ats-lp-ghost ats-cs-more" onClick={() => setPage(page + 1)}>Visa fler tjänster ({total - visible.length} kvar)</button>}
  </div>;
}

function CareerBlock({ b, ctx }) {
  if (b.hidden) return null;
  const { jobs, openJob, goPage, brand } = ctx;
  const img = (u) => u && /^https?:\/\//.test(u);
  switch (b.type) {
    case "hero": return <section className="ats-cs-hero" style={img(b.image) ? { backgroundImage: "linear-gradient(180deg,rgba(16,32,28,.62),rgba(16,32,28,.78)),url(" + b.image + ")" } : { background: brand.color }}>
      <div className="ats-cs-wrap"><h1>{b.title}</h1>{b.sub && <p>{b.sub}</p>}{b.cta && <button className="ats-cs-cta" onClick={() => goPage(b.ctaHref)}>{b.cta} <ArrowRight size={18} /></button>}</div>
    </section>;
    case "text": return <section className="ats-cs-sec"><div className="ats-cs-wrap ats-cs-narrow">{b.title && <h2>{b.title}</h2>}<p className="ats-cs-body">{b.body}</p></div></section>;
    case "textimage": return <section className="ats-cs-sec"><div className={"ats-cs-wrap ats-cs-ti" + (b.flip ? " is-flip" : "")}>
      <div><h2>{b.title}</h2><p className="ats-cs-body">{b.body}</p></div>
      <div className="ats-cs-ti-img">{img(b.image) ? <img src={b.image} alt="" loading="lazy" /> : <div className="ats-cs-ph" style={{ background: brand.color }} />}</div>
    </div></section>;
    case "gallery": return <section className="ats-cs-sec"><div className="ats-cs-wrap">{b.title && <h2>{b.title}</h2>}
      {b.images.filter(img).length === 0 ? <div className="ats-cs-ph is-wide" style={{ background: brand.color }} /> : <div className="ats-cs-gal">{b.images.filter(img).map((u, i) => <img key={i} src={u} alt="" loading="lazy" />)}</div>}
    </div></section>;
    case "video": { const id = (b.url || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/); const vim = (b.url || "").match(/vimeo\.com\/(\d+)/);
      return <section className="ats-cs-sec"><div className="ats-cs-wrap ats-cs-narrow">{b.title && <h2>{b.title}</h2>}
        {id ? <div className="ats-cs-video"><iframe src={"https://www.youtube-nocookie.com/embed/" + id[1]} title={b.title || "Video"} allowFullScreen loading="lazy" /></div>
          : vim ? <div className="ats-cs-video"><iframe src={"https://player.vimeo.com/video/" + vim[1]} title={b.title || "Video"} allowFullScreen loading="lazy" /></div>
            : <div className="ats-cs-ph is-wide" style={{ background: brand.color }} />}
      </div></section>; }
    case "stats": return <section className="ats-cs-sec"><div className="ats-cs-wrap">{b.title && <h2>{b.title}</h2>}
      <div className="ats-cs-stats">{b.items.map((it, i) => <div key={i}><b style={{ color: brand.color }}>{it.v}</b><span>{it.l}</span></div>)}</div>
    </div></section>;
    case "quote": return <section className="ats-cs-sec"><div className="ats-cs-wrap ats-cs-narrow">
      <blockquote className="ats-cs-quote"><p>{b.text}</p>{(b.author || b.role) && <footer>{b.author}{b.role ? " — " + b.role : ""}</footer>}</blockquote>
    </div></section>;
    case "benefits": case "values": return <section className="ats-cs-sec"><div className="ats-cs-wrap">{b.title && <h2>{b.title}</h2>}
      <div className="ats-cs-cards">{b.items.map((it, i) => <div key={i} className="ats-cs-card">{b.type === "benefits" ? <Sparkles size={17} style={{ color: brand.color }} /> : <ShieldCheck size={17} style={{ color: brand.color }} />}<b>{it.title}</b><span>{it.desc}</span></div>)}</div>
    </div></section>;
    case "departments": return <section className="ats-cs-sec"><div className="ats-cs-wrap">{b.title && <h2>{b.title}</h2>}
      <div className="ats-cs-cards">{b.items.map((it, i) => <div key={i} className="ats-cs-card"><Building2 size={17} style={{ color: brand.color }} /><b>{it.name}</b><span>{it.desc}</span></div>)}</div>
    </div></section>;
    case "locations": return <section className="ats-cs-sec"><div className="ats-cs-wrap">{b.title && <h2>{b.title}</h2>}
      <div className="ats-cs-cards">{b.items.map((it, i) => <div key={i} className="ats-cs-card"><MapPin size={17} style={{ color: brand.color }} /><b>{it.name}</b><span>{it.address}</span></div>)}</div>
    </div></section>;
    case "people": return <section className="ats-cs-sec"><div className="ats-cs-wrap">{b.title && <h2>{b.title}</h2>}
      <div className="ats-cs-people">{b.items.filter((p) => p.name).map((p, i) => <div key={i} className="ats-cs-person">
        {img(p.image) ? <img src={p.image} alt="" loading="lazy" /> : <span className="ats-cs-pavatar" style={{ background: brand.color }}>{p.name[0].toUpperCase()}</span>}
        <b>{p.name}</b>{p.role && <em>{p.role}</em>}{p.quote && <p>{p.quote}</p>}
      </div>)}</div>
      {b.items.filter((p) => p.name).length === 0 && <p className="ats-cs-body">Lägg till medarbetare i blocket för att visa dem här.</p>}
    </div></section>;
    case "jobs": return <section className="ats-cs-sec" id="jobb"><div className="ats-cs-wrap">
      <div className="ats-cs-jobs-h"><h2>{b.title}</h2><button className="ats-cs-link" onClick={() => goPage("jobb")}>Alla tjänster <ArrowRight size={15} /></button></div>
      <JobList jobs={jobs} onOpen={openJob} compact={b.limit || 6} />
    </div></section>;
    case "faq": return <section className="ats-cs-sec"><div className="ats-cs-wrap ats-cs-narrow">{b.title && <h2>{b.title}</h2>}
      <div className="ats-jp-faq">{b.items.map((f, i) => <details key={i}><summary>{f.q}<ChevronDown size={18} /></summary><p>{f.a}</p></details>)}</div>
    </div></section>;
    case "cta": return <section className="ats-cs-cta" style={{ background: brand.color }}><div className="ats-cs-wrap">
      <h2>{b.title}</h2>{b.sub && <p>{b.sub}</p>}<button className="ats-cs-cta-btn" onClick={() => goPage(b.href)}>{b.label} <ArrowRight size={18} /></button>
    </div></section>;
    case "contact": return <section className="ats-cs-sec"><div className="ats-cs-wrap ats-cs-narrow">{b.title && <h2>{b.title}</h2>}
      <div className="ats-cs-contact">
        <span className="ats-cs-pavatar" style={{ background: brand.color }}>{(b.name || "?")[0].toUpperCase()}</span>
        <div><b>{b.name || "Kontaktperson"}</b>{b.role && <em>{b.role}</em>}
          {b.email && <a href={"mailto:" + b.email}><Mail size={14} /> {b.email}</a>}
          {b.phone && <a href={"tel:" + b.phone}><Phone size={14} /> {b.phone}</a>}
        </div>
      </div>
    </div></section>;
    case "spacer": return <div style={{ height: (b.size || 64) + "px" }} />;
    case "divider": return <div className="ats-cs-wrap"><hr className="ats-cs-hr" /></div>;
    default: return null;
  }
}

function CareerSite({ slug, sub, localState }) {
  const [remote, setRemote] = useState(undefined);
  const [jobs, setJobs] = useState([]);
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sbEnabled) { setRemote(null); return; }
      const rows = await sbGet("career_sites?slug=eq." + encodeURIComponent(slug) + "&published=eq.true&select=*");
      if (!alive) return;
      if (rows === null) { setErr(true); setRemote(null); return; }
      const site = rows[0] || null;
      setRemote(site);
      if (site) {
        const js = await sbGet("jobs?org_id=eq." + encodeURIComponent(site.org_id) + "&published=eq.true&select=slug,title,form");
        if (alive && js) setJobs(js);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const local = localState && localState.career && localState.career.slug === slug ? { data: localState.career, org_id: null } : null;
  const site = remote === undefined ? undefined : (remote || local);
  const data = site && site.data;
  const pages = (data && data.pages) || [];
  const isJobs = sub === "jobb";
  const page = isJobs ? null : pages.find((p) => (p.slug || "") === (sub || "")) || null;
  const navPages = pages.filter((p) => p.published && p.inNav);
  const brand = (data && data.brand) || { color: "#0B5C52", logo: "" };
  const company = (data && data.name) || (localState && localState.org.companyName) || "Företag";
  const title = isJobs ? "Lediga jobb — " + company : (page && (page.seoTitle || page.name + " — " + company)) || company;
  const desc = isJobs ? "Alla lediga tjänster hos " + company + "." : (page && page.seoDesc) || ("Karriär hos " + company + ".");
  useSeo(title, desc);

  const goPage = (href) => { if (!href) return; navTo("/karriar/" + slug + (href === "jobb" ? "/jobb" : href ? "/" + href : "")); };
  const openJob = (s2) => navTo("/j/" + s2);
  const initial = company.trim()[0].toUpperCase();

  if (site === undefined) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><div className="ats-spinner" /><span>Laddar karriärsidan…</span></div></div></div>;
  if (err) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><h2>Kunde inte ladda sidan</h2><p>Något gick fel på vägen. Prova att ladda om.</p><button className="ats-lp-cta" onClick={() => window.location.reload()}>Ladda om</button></div></div></div>;
  if (!site) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><h2>Karriärsidan hittades inte</h2><p>Länken kan vara felaktig, eller så är sidan inte publicerad än.</p></div></div></div>;
  if (!isJobs && !page) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><h2>Sidan hittades inte</h2><p>Den här undersidan finns inte eller är inte publicerad.</p><button className="ats-lp-cta" onClick={() => goPage("")}>Till karriärsidan</button></div></div></div>;
  if (!isJobs && page && !page.published) return <div className="ats-root"><Style /><div className="ats-pub"><div className="ats-pub-card"><h2>Sidan är inte publicerad</h2><p>Den här sidan är fortfarande ett utkast.</p><button className="ats-lp-cta" onClick={() => goPage("")}>Till karriärsidan</button></div></div></div>;

  const ctx = { jobs, openJob, goPage, brand };
  return <div className="ats-root"><Style /><div className="ats-cs" style={{ "--brand": brand.color }}>
    <a className="ats-skip" href="#cs-main">Hoppa till innehållet</a>
    <header className="ats-cs-nav">
      <div className="ats-cs-nav-in">
        <button className="ats-cs-brand" onClick={() => goPage("")}>
          {/^https?:\/\//.test(brand.logo) ? <img src={brand.logo} alt={company} /> : <span className="ats-cs-mark" style={{ background: brand.color }}>{initial}</span>}
          <span>{company}</span>
        </button>
        <nav className="ats-cs-links" aria-label="Karriärmeny">
          {navPages.map((p) => <button key={p.id} className={(sub || "") === (p.slug || "") && !isJobs ? "is-active" : ""} onClick={() => goPage(p.slug)}>{p.name}</button>)}
          <button className={isJobs ? "is-active" : ""} onClick={() => goPage("jobb")}>Lediga jobb</button>
        </nav>
        <button className="ats-cs-cta is-sm" onClick={() => goPage("jobb")}>Se lediga jobb</button>
        <button className="ats-lp-burger" onClick={() => setOpen(!open)} aria-label="Meny">{open ? <X size={22} /> : <MenuIcon size={22} />}</button>
      </div>
      {open && <div className="ats-cs-mob">
        {navPages.map((p) => <button key={p.id} onClick={() => { setOpen(false); goPage(p.slug); }}>{p.name}</button>)}
        <button onClick={() => { setOpen(false); goPage("jobb"); }}>Lediga jobb</button>
      </div>}
    </header>

    <main id="cs-main">
      {isJobs
        ? <><section className="ats-cs-jhero" style={{ background: brand.color }}><div className="ats-cs-wrap"><h1>Lediga jobb</h1><p>{jobs.length === 0 ? "Just nu har vi inga utlysta tjänster." : "Hittar du inte rätt roll? Titta in igen — vi utlyser löpande."}</p></div></section>
          <section className="ats-cs-sec"><div className="ats-cs-wrap"><JobList jobs={jobs} onOpen={openJob} /></div></section></>
        : page.blocks.map((b) => <CareerBlock key={b.id} b={b} ctx={ctx} />)}
    </main>

    <footer className="ats-cs-foot">
      <div className="ats-cs-wrap ats-cs-foot-in">
        <div className="ats-cs-brand"><span className="ats-cs-mark" style={{ background: brand.color }}>{initial}</span><span>{company}</span></div>
        <nav className="ats-cs-flinks">
          {navPages.map((p) => <button key={p.id} onClick={() => goPage(p.slug)}>{p.name}</button>)}
          <button onClick={() => goPage("jobb")}>Lediga jobb</button>
        </nav>
        {data.social && Object.values(data.social).some(Boolean) && <div className="ats-cs-social">
          {data.social.linkedin && <a href={data.social.linkedin} target="_blank" rel="noreferrer noopener">LinkedIn</a>}
          {data.social.instagram && <a href={data.social.instagram} target="_blank" rel="noreferrer noopener">Instagram</a>}
          {data.social.facebook && <a href={data.social.facebook} target="_blank" rel="noreferrer noopener">Facebook</a>}
          {data.social.web && <a href={data.social.web} target="_blank" rel="noreferrer noopener">Webbplats</a>}
        </div>}
      </div>
      <div className="ats-cs-foot-bot">
        <span>Dina uppgifter hanteras enligt GDPR och används endast för rekryteringen.</span>
        <span>Rekryteras med Rekyl</span>
      </div>
    </footer>
  </div></div>;
}
/* ===================== MARKNADSWEBBPLATS ===================== *//* ---- Funktionskatalog: enda källan för funktionssidan ---- */
const FEATURES = [
  { cat: "Jobb och publicering", icon: "Briefcase", items: [
    ["Skapa från branschmall", "Sju färdiga mallar med förladdade frågor, vikter och krav — eller börja från ett tomt formulär."],
    ["Jobbstatus", "Öppen, pausad, tillsatt eller arkiverad. Statusen styr vad som syns publikt."],
    ["Duplicera tjänst", "Klona formulär, scoring och annons till en ny tjänst med egen länk och nollställd statistik."],
    ["Arkivera", "Ta bort tjänsten ur vyerna utan att förlora historik eller kandidatdata."],
    ["Publicera eller avpublicera", "Ta ned den publika annonsen med ett klick. Länken slutar fungera direkt."],
    ["Delningslänkar med källspårning", "En länk per kanal. Varje ansökan vet varifrån den kom."],
    ["Anpassad jobbannons", "Pitch, om rollen, krav, meriter, förmåner, process och FAQ — allt redigerbart."],
    ["Deadline", "Sista ansökningsdag visas i annonsen och i sidokolumnen."],
  ] },
  { cat: "Rekryteringsprocess", icon: "Workflow", items: [
    ["Kvalificerande frågor", "Bygg formuläret med de frågor som faktiskt avgör — inte en generisk mall."],
    ["Knockoutregler", "Absoluta krav sållar bort ansökningar automatiskt, med angiven orsak i kandidatens timeline."],
    ["Deterministisk scoring", "Du sätter vikten. Samma svar ger alltid samma poäng. Varje poäng går att bryta ned."],
    ["Villkorsstyrda frågor", "Följdfrågor visas bara när de är relevanta för kandidatens tidigare svar."],
    ["Tröskelvärde", "Ansökningar under din tröskel flaggas som under tröskeln, inte bortsorterade i tysthet."],
    ["Regelbaserade åtgärder", "Automatiska regler flyttar kandidater till rätt steg utan att du gör något."],
    ["Intervjubokning", "Tid, längd, form, plats och intervjuare — med krockvarning innan du bekräftar."],
    ["Anställning", "Markera tillsatt, skicka erbjudandemejl och stäng tjänsten."],
    ["Fullständig historik", "Varje beslut, mejl och statusändring loggas med vem och när."],
  ] },
  { cat: "Kandidathantering", icon: "ClipboardList", items: [
    ["Kandidatkort", "Poäng, styrkor, risker, rekommenderad åtgärd och hela svarsunderlaget på ett ställe."],
    ["Kö med swipe", "Beta av nya ansökningar som en kortlek. Rätt mejl skickas vid varje beslut."],
    ["Filter och sökning", "Sök på namn eller e-post, filtrera på status och källa, sortera på matchning."],
    ["Betyg och kommentarer", "Sätt stjärnor och skriv interna anteckningar som teamet ser."],
    ["Jämförelse", "Ställ kandidater sida vid sida med poängunderlaget synligt."],
    ["Dubblettvarning", "Har någon sökt tidigare syns det direkt på kandidatkortet."],
    ["Kandidatens tidslinje", "Ansökan, poäng, beslut, mejl och kommentarer i kronologisk ordning."],
    ["Radering och export", "Radera all data för en kandidat, eller exportera den som JSON på begäran."],
  ] },
  { cat: "Kommunikation", icon: "Mail", items: [
    ["Mejlmallar", "En mall per beslut: bekräftelse, shortlist, intervju, reservlista, avslag, erbjudande."],
    ["Variabler i mallar", "Kandidatens namn, tjänsten, företaget, intervjutiden och avslagsorsaken fylls i automatiskt."],
    ["Automatiska besked", "Varje beslut skickar rätt mejl direkt. Ingen kandidat lämnas i tystnad."],
    ["Kalenderinbjudan", "Intervjun bifogas som kalenderfil. Ombokning flyttar händelsen, avbokning tar bort den."],
    ["Påminnelser", "Kandidaten påminns automatiskt dagen före intervjun."],
    ["Leveransstatus", "Du ser den verkliga statusen från mejlleverantören — skickad, misslyckad eller köad."],
    ["Felhantering", "Misslyckas ett utskick visas den verkliga orsaken, med möjlighet att försöka igen."],
    ["Kommunikationshistorik", "Varje utskick loggas i mejlloggen och i kandidatens timeline."],
  ] },
  { cat: "Team och samarbete", icon: "Users", items: [
    ["Roller och behörigheter", "Admin, rekryterare, rekryterande chef och insyn. Var och en ser bara sitt."],
    ["Inbjudningskoder", "Bjud in kollegor med en engångskod och en förvald roll."],
    ["Teamröstning", "Ja, osäker eller nej — direkt på kandidatkortet."],
    ["Kommentarer", "Interna anteckningar som aldrig syns för kandidaten."],
    ["Aktivitetslogg", "Vem gjorde vad och när, i hela organisationen."],
    ["Organisationsisolering", "Varje företags data är helt separerad på databasnivå."],
  ] },
  { cat: "Analys och rapporter", icon: "BarChart3", items: [
    ["Jobbstatistik", "Påbörjade och skickade ansökningar, snittmatchning och toppmatchning per tjänst."],
    ["Rekryteringsfunnel", "Se var kandidaterna faller bort — från påbörjad ansökan till anställning."],
    ["Källkvalitet", "Vilken kanal ger bäst kandidater, inte bara flest. Snittmatchning per källa."],
    ["Avslagsorsaker", "Varje avslag har en registrerad orsak som syns i statistiken."],
    ["Rekryteringsrapport", "Exportera en utskriftsklar rapport med beslut, motiveringar och källor."],
    ["Kandidatexport", "Exportera kandidatlistan som CSV för egen analys."],
  ] },
  { cat: "Säkerhet och GDPR", icon: "ShieldCheck", items: [
    ["Samtycke vid ansökan", "Kandidaten godkänner behandlingen. Samtycket tidsstämplas och visas på kandidatkortet."],
    ["Rätt att bli glömd", "Radera all data för en kandidat permanent — inklusive uppladdade filer i molnet."],
    ["Lagringstid", "Sätt en retentionperiod så rensas gamla ansökningar automatiskt."],
    ["Rollbaserad åtkomst", "Behörighet styr vad varje användare får se och göra."],
    ["Organisationsisolering", "Databasens säkerhetsregler hindrar åtkomst mellan organisationer."],
    ["Revisionslogg", "Beslut, mejl, ändringar och administrativa åtgärder loggas."],
    ["Data inom EU", "Kandidatuppgifter och filer lagras inom EU."],
    ["Cookiehantering", "Endast nödvändiga cookies. Ingen spårning för marknadsföring."],
  ] },
];

function FeaturesPage() {
  const [cat, setCat] = useState("Alla");
  const [q, setQ] = useState("");
  const cats = ["Alla", ...FEATURES.map((f) => f.cat)];
  const IC = { Briefcase, Workflow, ClipboardList, Mail, Users, BarChart3, ShieldCheck };
  const shown = FEATURES
    .filter((f) => cat === "Alla" || f.cat === cat)
    .map((f) => ({ ...f, items: f.items.filter(([t, d]) => !q.trim() || (t + " " + d).toLowerCase().includes(q.toLowerCase())) }))
    .filter((f) => f.items.length > 0);
  const total = shown.reduce((n, f) => n + f.items.length, 0);
  return <>
    <MHero kicker="Funktioner" title="Allt som behövs för att rekrytera rätt" sub="Rekyl är byggt på regler, poäng och mallar — inte på gissningar. Här är varje funktion, kategori för kategori." primary="Skapa konto gratis" onPrimary={() => navTo("/skapa-konto")} />
    <section className="ats-msec">
      <div className="ats-lp-wrap">
        <div className="ats-feat-tools">
          <div className="ats-feat-cats" role="tablist">{cats.map((c) => <button key={c} role="tab" aria-selected={cat === c} className={"ats-feat-cat" + (cat === c ? " is-on" : "")} onClick={() => setCat(c)}>{c}</button>)}</div>
          <div className="ats-feat-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök funktion…" aria-label="Sök funktion" /></div>
        </div>
        <p className="ats-feat-count">{total} funktioner{q.trim() ? " matchar " + JSON.stringify(q) : ""}</p>
        {total === 0
          ? <div className="ats-feat-empty"><Search size={26} /><h3>Ingen funktion matchar</h3><p>Prova ett annat ord, eller rensa sökningen.</p><button className="ats-lp-ghost" onClick={() => { setQ(""); setCat("Alla"); }}>Rensa filter</button></div>
          : shown.map((f) => { const I = IC[f.icon]; return <div key={f.cat} className="ats-feat-block ats-rv">
            <h2><I size={19} /> {f.cat}</h2>
            <div className="ats-feat-grid">{f.items.map(([t, d]) => <div key={t} className="ats-feat-i"><b>{t}</b><span>{d}</span></div>)}</div>
          </div>; })}
      </div>
    </section>
    <MCta title="Redo att testa?" sub="Skapa konto, välj en branschmall och publicera din första tjänst idag." label="Skapa konto gratis" onClick={() => navTo("/skapa-konto")} />
  </>;
}

function CareerPage() {
  return <>
    <MHero kicker="Karriärsidor" title="Annonser kandidaten faktiskt vill söka på" sub="Varje tjänst får en egen publik jobbsida med er profil, tydlig process och ett ansökningsflöde som fungerar lika bra i mobilen." primary="Kom igång" onPrimary={() => navTo("/skapa-konto")} secondary="Se priser" onSecondary={() => navTo("/priser")} />
    <MSplit eyebrow="Jobbannonsen" title="En annons, inte ett databasformulär" body="Pitch, om rollen, krav, meriter, förmåner, rekryteringsprocess och vanliga frågor — allt redigeras i appen och publiceras med ett klick. Kandidaten möts av en läsbar artikel, inte ett rutnät av kort."
      points={["Metadata: plats, arbetsform, anställning, lön, start och deadline", "Kontaktperson med direkt mejllänk", "Delning med ett klick", "Sticky ansökningsknapp på mobil"]}
      visual={<div className="ats-lp-mini"><div className="ats-lp-mini-h"><Globe size={15} /> Publik jobbannons</div><div className="ats-lp-jobmini"><div className="ats-lp-jm-kicker">Sälj — Växjö — Hybrid</div><div className="ats-lp-jm-title">Säljare till Nordpuls</div><div className="ats-lp-jm-line" /><div className="ats-lp-jm-line is-s" /><div className="ats-lp-jm-btn">Ansök till tjänsten</div></div></div>} />
    <MSplit flip eyebrow="Ansökan" title="Ett steg i taget — inget krångel" body="Kandidaten fyller i formuläret i lugn takt, med progressindikator, tydliga fel och en granskning innan inskick. Poäng, krav och interna bedömningar syns aldrig."
      points={["Villkorsstyrda frågor visas bara när de behövs", "CV-uppladdning som bara fungerar", "Tydlig GDPR-sektion, inte en juridisk textvägg", "Bekräftelse som berättar vad som händer härnäst"]}
      visual={<div className="ats-lp-mini"><div className="ats-lp-mini-h"><ListChecks size={15} /> Ansökningsformulär</div><div className="ats-lp-jobmini"><div className="ats-lp-jm-kicker">Steg 2 av 4 — Kompetens och krav</div><div className="ats-lp-jm-line" /><div className="ats-lp-jm-line is-s" /><div className="ats-lp-jm-btn">Nästa</div><div className="ats-lp-jm-prog"><span>Halvvägs</span><i><b /></i></div></div></div>} />
    <MSec eyebrow="Källspårning" title="Se varifrån de bästa kandidaterna kommer" lead="Skapa en delningslänk per kanal. Varje ansökan bär med sig sin källa, så du kan mäta kvalitet — inte bara volym.">
      <div className="ats-lp-explain">
        {[["LinkedIn", "12 ansökningar · 74 % snitt", "ok"], ["Platsbanken", "31 ansökningar · 51 % snitt", "warn"], ["Egen sajt", "6 ansökningar · 81 % snitt", "ok"], ["Tips", "3 ansökningar · 88 % snitt", "rec"]].map(([t, d, k]) =>
          <div key={t} className={"ats-lp-ex is-" + k}><b>{t}</b><span>{d}</span></div>)}
      </div>
      <p className="ats-feat-note">Exempel på hur källkvalitet presenteras. Siffrorna kommer från dina egna delningslänkar.</p>
    </MSec>
    <MCta title="Ge kandidaterna en bättre upplevelse" sub="Publicera din första tjänst på några minuter." label="Skapa konto gratis" onClick={() => navTo("/skapa-konto")} />
  </>;
}

function CandidatesPage() {
  return <>
    <MHero kicker="Kandidathantering" title="Beslut du kan förklara — även ett år senare" sub="Kandidatkortet visar exakt varför någon fick sin poäng: vad som drog upp, vad som drog ner och om ett absolut krav saknas." primary="Kom igång" onPrimary={() => navTo("/skapa-konto")} />
    <MSec eyebrow="Kandidatkortet" title="Underlaget, inte bara ett tal">
      <div className="ats-lp-explain">
        {[["Styrkor", "Det som drog upp poängen, med exakt viktning per fråga.", "ok"],
          ["Risker", "Det som drog ner — synligt, inte gömt i en modell.", "warn"],
          ["Absoluta krav", "Saknas ett skallkrav sållas ansökan bort automatiskt, med angiven orsak.", "ko"],
          ["Rekommendation", "Boka intervju, shortlista, begär komplettering eller avslå.", "rec"]].map(([t, d, k]) =>
          <div key={t} className={"ats-lp-ex is-" + k}><b>{t}</b><span>{d}</span></div>)}
      </div>
    </MSec>
    <MSplit flip eyebrow="Kön" title="Beta av nya ansökningar på en kafferast" body="Kön visar en kandidat i taget med poäng, underlag och rekommendation. Swipa för beslut — rätt mejl går ut automatiskt och allt loggas i kandidatens timeline."
      points={["Ångra senaste beslutet", "Avslagsorsak registreras och används i mejlet", "Kommentarer och betyg direkt i kortet", "Dubblettvarning om någon sökt tidigare"]}
      visual={<div className="ats-lp-mini"><div className="ats-lp-mini-h"><Layers size={15} /> Kön</div><div className="ats-lp-card"><div className="ats-lp-card-top"><div><b>Amina Karlsson</b><span>Säljare · via LinkedIn</span></div><ScoreDial value={92} knockout={false} size={54} /></div><div className="ats-lp-rec"><Sparkles size={15} /> Rekommenderad åtgärd: <b>Boka intervju</b></div></div></div>} />
    <MSec eyebrow="Överblick" title="Filter, sökning och jämförelse" lead="Filtrera på status och källa, sök på namn eller e-post, sortera på matchning — och ställ två kandidater sida vid sida när det är jämnt.">
      <ul className="ats-lp-checks ats-lp-checks-2">
        {["Statusflikar: nya, shortlist, intervju, reserv, avslag, anställda", "Källfilter för varje delningslänk", "Sortering på matchning eller datum", "Jämför två kandidater med poängunderlaget synligt", "Exportera listan som CSV", "Radera all data för en kandidat på begäran"].map((p) => <li key={p}><Check size={17} /> {p}</li>)}
      </ul>
    </MSec>
    <MCta title="Sluta gissa" sub="Låt kraven göra jobbet — och behåll beslutet hos dig." label="Skapa konto gratis" onClick={() => navTo("/skapa-konto")} />
  </>;
}

function ProcessPage() {
  const STEPS = [
    ["Bestäm kraven", "Välj en branschmall eller börja från ett tomt formulär. Sätt vikt på det som väger tungt och markera absoluta krav."],
    ["Publicera annonsen", "Skriv annonsen i appen, publicera och dela med en länk per kanal."],
    ["Ta emot ansökningar", "Varje ansökan poängsätts direkt. Saknas ett skallkrav sållas den bort automatiskt, med orsak."],
    ["Beta av kön", "Gå igenom kandidaterna, kommentera, rösta med teamet och fatta beslut."],
    ["Boka intervjun", "Tid, längd, form och intervjuare. Kalenderinbjudan skickas och kandidaten påminns dagen före."],
    ["Ge besked", "Varje beslut skickar rätt mejl. Ingen kandidat lämnas i tystnad."],
    ["Anställ och följ upp", "Markera tillsatt, exportera rapporten och se vilken källa som gav bäst kandidater."],
  ];
  return <>
    <MHero kicker="Rekryteringsprocess" title="Från annons till anställd — utan att något faller mellan stolarna" sub="Rekyl bygger processen på regler du själv sätter. Ingenting händer automatiskt utan att det går att spåra." primary="Kom igång" onPrimary={() => navTo("/skapa-konto")} />
    <MSec>
      <ol className="ats-lp-timeline">{STEPS.map(([t, d], i) => <li key={t}><span>{String(i + 1).padStart(2, "0")}</span><div><b>{t}</b><p>{d}</p></div></li>)}</ol>
    </MSec>
    <MSec tone="mint" eyebrow="Automatiska regler" title="Automatik du kan följa steg för steg" lead="Regler flyttar kandidater till rätt steg utan att du gör något — men varje åtgärd registreras i kandidatens timeline med vilken regel som utlöste den. Ingen svart låda.">
      <ul className="ats-lp-checks ats-lp-checks-2">
        {["Villkor på poäng, svar eller saknade uppgifter", "Åtgärder: flytta till shortlist, reservlista eller avslag", "Automatisk begäran om komplettering", "Varje utlöst regel loggas med tidpunkt"].map((p) => <li key={p}><Check size={17} /> {p}</li>)}
      </ul>
    </MSec>
    <MCta title="Bygg din process en gång" sub="Sedan sköter den sig — och du kan alltid se varför." label="Skapa konto gratis" onClick={() => navTo("/skapa-konto")} />
  </>;
}

function AnalyticsPage() {
  return <>
    <MHero kicker="Analys och rapportering" title="Mät kvalitet, inte bara volym" sub="Femtio ansökningar från en kanal som ger sämre kandidater är inte bättre än tio från en som ger bra. Rekyl visar skillnaden." primary="Kom igång" onPrimary={() => navTo("/skapa-konto")} />
    <MSplit eyebrow="Källkvalitet" title="Vilken kanal ger faktiskt bra kandidater?" body="Varje delningslänk bär med sig sin källa. Rekyl räknar snittmatchning, toppmatchning, intervjuer och anställningar per kanal — så du vet var du ska lägga pengarna nästa gång."
      points={["Snittmatchning per kanal", "Andel som gick till intervju", "Antal anställda per källa", "Bästa kanalen lyfts fram automatiskt"]}
      visual={<div className="ats-lp-mini"><div className="ats-lp-mini-h"><TrendingUp size={15} /> Källkvalitet</div><div className="ats-lp-bars">
        <div className="ats-lp-bar"><span>Tips</span><i style={{ width: "88%" }} /><b>88%</b></div>
        <div className="ats-lp-bar"><span>Egen sajt</span><i style={{ width: "81%" }} /><b>81%</b></div>
        <div className="ats-lp-bar"><span>LinkedIn</span><i style={{ width: "74%" }} /><b>74%</b></div>
        <div className="ats-lp-bar is-weak"><span>Platsbanken</span><i style={{ width: "51%" }} /><b>51%</b></div>
      </div></div>} />
    <MSec eyebrow="Rapporter" title="Underlag du kan visa chefen" lead="Rekryteringsrapporten sammanfattar tjänsten: antal ansökningar, snittmatchning, anställda, källor och hela beslutsloggen med motiveringar. Skriv ut eller spara som PDF.">
      <ul className="ats-lp-checks ats-lp-checks-2">
        {["Utskriftsklar rekryteringsrapport per tjänst", "Rekryteringsfunnel: påbörjade, skickade, shortlist, intervju, anställda", "Avslagsorsaker sammanställda", "Kandidatexport som CSV", "Statistik per tjänst och per källa"].map((p) => <li key={p}><Check size={17} /> {p}</li>)}
      </ul>
    </MSec>
    <MCta title="Se vad som faktiskt fungerar" sub="Källkvalitet ingår i alla betalande paket." label="Se priser" onClick={() => navTo("/priser")} />
  </>;
}

function SecurityPage() {
  return <>
    <MHero kicker="Säkerhet och GDPR" title="Ansvarsfullt med människors uppgifter" sub="Rekrytering handlar om människor. Rekyl är byggt för att du ska kunna förklara varje beslut — och radera allt när det är dags." primary="Läs integritetspolicyn" onPrimary={() => navTo("/integritetspolicy")} />
    <MSec tone="mint" eyebrow="Så skyddas data" title="Konkret, inte en badge-vägg">
      <div className="ats-sec-grid">
        {[["Samtycke vid ansökan", "Kandidaten godkänner behandlingen innan inskick. Samtycket tidsstämplas och visas på kandidatkortet."],
          ["Rätt att bli glömd", "Radering tar bort kandidatens alla uppgifter permanent — svar, timeline och uppladdade filer i molnlagringen."],
          ["Lagringstid", "Sätt en retentionperiod i inställningarna så rensas gamla ansökningar regelbundet."],
          ["Organisationsisolering", "Databasens säkerhetsregler hindrar åtkomst mellan organisationer — inte bara gränssnittet."],
          ["Rollbaserad åtkomst", "Admin, rekryterare, rekryterande chef och insyn har olika rättigheter."],
          ["Revisionslogg", "Beslut, mejl, ändringar och administrativa åtgärder loggas med vem och när."],
          ["Data inom EU", "Kandidatuppgifter och filer lagras inom EU."],
          ["Deterministisk bedömning", "Ingen språkmodell bedömer kandidater. Varje poäng går att bryta ned och förklara."]].map(([t, d]) =>
          <div key={t} className="ats-sec-i"><ShieldCheck size={18} /><div><b>{t}</b><span>{d}</span></div></div>)}
      </div>
    </MSec>
    <MSec eyebrow="Ärlighet" title="Vad vi inte påstår" lead="Rekyl är inte ISO 27001- eller SOC 2-certifierat, och vi låtsas inte att vi är det. Vi berättar exakt hur data hanteras så att du kan göra din egen bedömning. Har du frågor inför ett personuppgiftsbiträdesavtal — hör av dig, så svarar vi rakt.">
      <button className="ats-lp-ghost" onClick={() => navTo("/kontakt")}>Kontakta oss</button>
    </MSec>
    <MCta title="Frågor om dataskydd?" sub="Vi svarar konkret, inte med marknadsföringsspråk." label="Kontakta oss" onClick={() => navTo("/kontakt")} />
  </>;
}

function PricingPage() {
  const PLANS = [
    { n: "Start", p: "0 kr", per: "för din första tjänst", d: "Rekrytera en roll hela vägen, utan kostnad.", f: ["1 aktiv tjänst", "Formulärbyggare och deterministisk poängsättning", "Publik jobbannons med källspårning", "Automatiska besked till kandidater", "GDPR-radering och samtycke"], cta: "Skapa konto" },
    { n: "Pro", p: "790 kr", per: "per månad", d: "För dig som rekryterar löpande.", f: ["25 aktiva tjänster", "Team, roller och aktivitetslogg", "Kalender med intervjubokning", "Påminnelser till kandidater", "Källkvalitet och rekryteringsrapport", "Allt i Start"], cta: "Börja med Pro", hot: true },
    { n: "Enterprise", p: "Offert", per: "efter behov", d: "För större organisationer med egna krav.", f: ["Obegränsat antal tjänster", "Egna mallar och processer", "Utökad behörighetsstyrning", "Namngiven kontaktperson", "Allt i Pro"], cta: "Kontakta oss" },
  ];
  const FAQ = [
    ["Kan jag byta paket?", "Ja, när som helst. Byter du ner måste antalet aktiva tjänster rymmas i det nya paketet — arkivera de du inte behöver, så går det igenom."],
    ["Finns bindningstid?", "Nej. Pro löper månadsvis och kan sägas upp när du vill."],
    ["Vad räknas som en aktiv tjänst?", "En tjänst med status öppen eller pausad. Tillsatta och arkiverade tjänster räknas inte, men behåller all sin data."],
    ["Ingår moms?", "Nej, alla priser är exklusive moms."],
  ];
  const [faq, setFaq] = useState(0);
  return <>
    <MHero kicker="Priser" title="Börja gratis. Betala när du växer." sub="Inga bindningstider, ingen demo att boka och inga dolda avgifter." />
    <section className="ats-msec is-top">
      <div className="ats-lp-wrap ats-rv">
        <div className="ats-lp-plans">{PLANS.map((p) => <div key={p.n} className={"ats-lp-plan" + (p.hot ? " is-hot" : "")}>
          {p.hot && <span className="ats-lp-plan-tag">Populärast</span>}
          <h3>{p.n}</h3>
          <div className="ats-lp-price"><b>{p.p}</b><span>{p.per}</span></div>
          <p className="ats-lp-plan-d">{p.d}</p>
          <ul>{p.f.map((f) => <li key={f}><Check size={15} /> {f}</li>)}</ul>
          <button className={p.hot ? "ats-lp-cta is-block" : "ats-lp-ghost is-block"} onClick={() => navTo(p.n === "Enterprise" ? "/kontakt" : "/skapa-konto")}>{p.cta}</button>
        </div>)}</div>
        <p className="ats-lp-plans-note">Alla priser exklusive moms. Inga bindningstider.</p>
      </div>
    </section>
    <MSec eyebrow="Vanliga frågor" title="Om priser och paket">
      <div className="ats-lp-faq ats-lp-faqwrap">{FAQ.map(([q, a], i) => <div key={q} className={"ats-lp-faq-i" + (faq === i ? " is-on" : "")}>
        <button onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i}>{q}<ChevronDown size={19} /></button>
        <div className="ats-lp-faq-a" style={{ maxHeight: faq === i ? 260 : 0 }}><p>{a}</p></div>
      </div>)}</div>
    </MSec>
    <MCta title="Testa utan att betala" sub="Start är gratis för din första tjänst. Uppgradera först när du behöver." label="Skapa konto gratis" onClick={() => navTo("/skapa-konto")} />
  </>;
}

function AboutPage() {
  return <>
    <MHero kicker="Om Rekyl" title="Rekrytering ska gå att förklara" sub="Rekyl byggdes för att mindre arbetsgivare förtjänar samma struktur som stora bolag — utan att behöva en HR-avdelning eller ett sexsiffrigt avtal." />
    <MSec>
      <div className="ats-about">
        <div className="ats-about-txt">
          <h2>Varför Rekyl finns</h2>
          <p>De flesta mindre arbetsgivare rekryterar i mejlkorgen. Ansökningar blandas med fakturor, någon glöms bort, och beslutet fattas på den som råkade skriva bäst personligt brev. Det är inte slarv — det är att verktygen antingen kostar som en halvtidstjänst eller kräver en HR-avdelning för att sättas upp.</p>
          <p>Samtidigt fylls marknaden av verktyg som lovar att en AI ska välja kandidat åt dig. Vi tycker det är fel väg. Ett beslut om någons försörjning ska kunna förklaras — för kandidaten, för chefen och för dig själv om ett år.</p>
          <h2>Vad vi tror på</h2>
          <p>Rekyl bygger på regler du sätter själv. Du bestämmer vilka frågor som väger tungt, vad som är ett absolut krav och var tröskeln går. Poängen räknas ut på samma sätt varje gång, och varje poäng går att bryta ned. Ingen modell gissar, och ingen kandidat sorteras bort utan angiven orsak.</p>
          <p>Vi tror också att alla ska få besked. Därför är mallarna kopplade till besluten — säger du nej, går ett nej ut.</p>
        </div>
        <div className="ats-about-side">
          <div className="ats-about-card">
            <h3>Kort om oss</h3>
            <dl>
              <div><dt>Byggt i</dt><dd>Sverige</dd></div>
              <div><dt>Datalagring</dt><dd>Inom EU</dd></div>
              <div><dt>Bedömning</dt><dd>Deterministisk, ingen AI</dd></div>
              <div><dt>Målgrupp</dt><dd>Svenska arbetsgivare</dd></div>
            </dl>
          </div>
          <div className="ats-about-card is-quiet">
            <h3>Vad vi inte gör</h3>
            <p>Vi använder inga språkmodeller för att bedöma, ranka eller sammanfatta kandidater. Vi säljer inte kandidatdata. Och vi påstår oss inte ha certifieringar vi inte har.</p>
          </div>
        </div>
      </div>
    </MSec>
    <MCta title="Nyfiken?" sub="Skapa konto och publicera din första tjänst — det tar några minuter." label="Skapa konto gratis" onClick={() => navTo("/skapa-konto")} />
  </>;
}

function ContactPage() {
  const [f, setF] = useState({ name: "", email: "", org: "", msg: "" });
  const [touched, setTouched] = useState(false);
  const ok = f.name.trim().length > 1 && validEmail(f.email.trim()) && f.msg.trim().length > 5;
  const send = () => {
    if (!ok) { setTouched(true); return; }
    const body = "Namn: " + f.name + "\nFöretag: " + (f.org || "-") + "\nE-post: " + f.email + "\n\n" + f.msg;
    window.location.href = "mailto:hej@rekyl.se?subject=" + encodeURIComponent("Kontakt från rekyl.se — " + f.name) + "&body=" + encodeURIComponent(body);
  };
  return <>
    <MHero kicker="Kontakt" title="Hör av dig" sub="Frågor om produkten, priser, Enterprise eller dataskydd — vi svarar rakt och utan säljsnack." />
    <MSec>
      <div className="ats-contact">
        <div className="ats-contact-form">
          <h2>Skicka ett meddelande</h2>
          <p className="ats-contact-sub">Formuläret öppnar ditt mejlprogram med uppgifterna ifyllda. Vi svarar normalt inom en arbetsdag.</p>
          <div className="ats-af-fields">
            <div className="ats-af-f">
              <label className="ats-af-l" htmlFor="ct-n">Namn <i aria-hidden="true">*</i></label>
              <input id="ct-n" className={"ats-inp" + (touched && f.name.trim().length < 2 ? " is-err" : "")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              {touched && f.name.trim().length < 2 && <span className="ats-af-err"><CircleAlert size={14} /> Fyll i ditt namn.</span>}
            </div>
            <div className="ats-af-f">
              <label className="ats-af-l" htmlFor="ct-e">E-post <i aria-hidden="true">*</i></label>
              <input id="ct-e" type="email" className={"ats-inp" + (touched && !validEmail(f.email.trim()) ? " is-err" : "")} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              {touched && !validEmail(f.email.trim()) && <span className="ats-af-err"><CircleAlert size={14} /> Ange en giltig e-postadress.</span>}
            </div>
            <div className="ats-af-f">
              <label className="ats-af-l" htmlFor="ct-o">Företag</label>
              <input id="ct-o" className="ats-inp" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} />
            </div>
            <div className="ats-af-f">
              <label className="ats-af-l" htmlFor="ct-m">Meddelande <i aria-hidden="true">*</i></label>
              <textarea id="ct-m" className={"ats-inp" + (touched && f.msg.trim().length < 6 ? " is-err" : "")} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
              {touched && f.msg.trim().length < 6 && <span className="ats-af-err"><CircleAlert size={14} /> Skriv några rader om vad du undrar.</span>}
            </div>
          </div>
          <button className="ats-af-submit ats-contact-btn" onClick={send}>Skicka meddelande <ArrowRight size={17} /></button>
        </div>
        <aside className="ats-contact-side">
          <div className="ats-about-card">
            <h3>Mejla direkt</h3>
            <a className="ats-contact-mail" href="mailto:hej@rekyl.se"><Mail size={16} /> hej@rekyl.se</a>
            <p>Allmänna frågor, priser och Enterprise.</p>
          </div>
          <div className="ats-about-card">
            <h3>Dataskydd</h3>
            <a className="ats-contact-mail" href="mailto:dataskydd@rekyl.se"><ShieldCheck size={16} /> dataskydd@rekyl.se</a>
            <p>Personuppgiftsbiträdesavtal, radering och registerutdrag.</p>
          </div>
          <div className="ats-about-card is-quiet">
            <h3>Är du kandidat?</h3>
            <p>Har du sökt ett jobb via Rekyl ska du kontakta arbetsgivaren direkt — kontaktuppgifterna finns i jobbannonsen. Vi hanterar era uppgifter för arbetsgivarens räkning.</p>
          </div>
        </aside>
      </div>
    </MSec>
  </>;
}

function PrivacyPage() {
  return <MLegal intro="Den här policyn beskriver hur Rekyl behandlar personuppgifter. Rekyl är personuppgiftsbiträde åt de arbetsgivare som använder tjänsten — det är arbetsgivaren som är personuppgiftsansvarig för kandidaternas uppgifter."
    sections={[
      { h: "Vem ansvarar för uppgifterna?", p: ["När du söker ett jobb via Rekyl är det arbetsgivaren som annonserar tjänsten som ansvarar för dina uppgifter. Rekyl behandlar dem på arbetsgivarens uppdrag och enligt deras instruktioner.", "Vill du utöva dina rättigheter — till exempel få dina uppgifter raderade — kontaktar du i första hand arbetsgivaren. Kontaktuppgifterna finns i jobbannonsen."] },
      { h: "Vilka uppgifter behandlas?", p: ["Vi behandlar de uppgifter du själv lämnar i ansökningsformuläret."], list: ["Namn, e-postadress och telefonnummer", "Svaren på arbetsgivarens frågor i formuläret", "Eventuellt uppladdat CV eller andra bilagor", "Vilken kanal du kom via, om arbetsgivaren använt en spårad delningslänk", "Tidpunkt för ditt samtycke"] },
      { h: "Varför behandlas de?", p: ["Uppgifterna används enbart för den rekrytering du sökt till: urval, kontakt, intervjubokning och besked. De används aldrig för marknadsföring och säljs aldrig vidare."] },
      { h: "Hur bedöms din ansökan?", p: ["Arbetsgivaren definierar i förväg vilka frågor som väger tungt och vilka krav som är absoluta. Poängen räknas ut med en fast formel — samma svar ger alltid samma resultat. Ingen språkmodell eller AI bedömer, rankar eller sammanfattar din ansökan.", "Ett absolut krav kan leda till att en ansökan sorteras bort automatiskt. Orsaken registreras alltid och kan lämnas ut på begäran."] },
      { h: "Hur länge sparas uppgifterna?", p: ["Arbetsgivaren bestämmer lagringstiden och kan ställa in att ansökningar rensas automatiskt efter en viss period. Uppgifterna raderas dessförinnan om du begär det."] },
      { h: "Var lagras uppgifterna?", p: ["Inom EU. Överföringen sker krypterat, och uppladdade filer lagras separat med begränsad åtkomst."] },
      { h: "Dina rättigheter", p: ["Du har rätt att få veta vilka uppgifter som behandlas, att få dem rättade, att få dem raderade och att få ut dem i ett läsbart format."], list: ["Registerutdrag och dataportabilitet", "Rättelse av felaktiga uppgifter", "Radering (rätt att bli glömd)", "Återkallat samtycke"] },
      { h: "Kontakt", p: ["Frågor om hur Rekyl som leverantör hanterar uppgifter: dataskydd@rekyl.se. Frågor om en specifik ansökan riktas till arbetsgivaren."] },
    ]} />;
}
function CookiePage() {
  return <MLegal intro="Rekyl använder så få cookies som möjligt. Vi har ingen annonsspårning, inga tredjepartspixlar och ingen profilering för marknadsföring."
    sections={[
      { h: "Vilka cookies används?", p: ["Endast sådana som krävs för att tjänsten ska fungera."], list: ["Inloggningssession — håller dig inloggad i appen", "Sparade inställningar — till exempel om menyn är fastlåst", "Samtyckesval — kommer ihåg att du sett cookie-informationen"] },
      { h: "Vad används inte", p: ["Vi använder inga cookies för annonser, retargeting eller försäljning av data. Vi bäddar inte in spårningspixlar från tredje part."] },
      { h: "Kandidater", p: ["När du söker ett jobb via en publik jobbannons sätts inga marknadsföringscookies. Om arbetsgivaren använt en spårad delningslänk registreras endast vilken kanal ansökan kom via — det är en uppgift på ansökan, inte en cookie som följer dig vidare."] },
      { h: "Hantera cookies", p: ["Du kan när som helst rensa cookies i din webbläsares inställningar. Rensar du inloggningssessionen behöver du logga in igen."] },
    ]} />;
}
function TermsPage() {
  return <MLegal intro="Dessa villkor gäller för användning av Rekyl. Genom att skapa konto godkänner du dem."
    sections={[
      { h: "Tjänsten", p: ["Rekyl är ett verktyg för rekrytering. Du som kund ansvarar för innehållet i dina jobbannonser, för de frågor och krav du ställer och för de beslut du fattar om kandidater."] },
      { h: "Konto och åtkomst", p: ["Du ansvarar för att hålla dina inloggningsuppgifter säkra och för vilka kollegor du bjuder in. Roller styr behörighet — se till att varje användare har rätt roll."] },
      { h: "Ditt ansvar som arbetsgivare", p: ["Du är personuppgiftsansvarig för kandidaternas uppgifter. Det innebär bland annat att du ska ha laglig grund för behandlingen, informera kandidaterna, besvara deras förfrågningar och sätta en rimlig lagringstid.", "Du ansvarar också för att de krav du ställer är sakliga och inte diskriminerar."] },
      { h: "Vårt ansvar", p: ["Vi tillhandahåller tjänsten i befintligt skick och arbetar för hög tillgänglighet, men kan inte garantera avbrottsfri drift. Vi behandlar personuppgifter endast enligt dina instruktioner."] },
      { h: "Priser och betalning", p: ["Priser anges exklusive moms. Pro faktureras månadsvis utan bindningstid och kan sägas upp när som helst. Enterprise regleras i separat avtal."] },
      { h: "Begränsningar", p: ["Paketet avgör hur många aktiva tjänster du kan ha. Överskrids gränsen kan ändringar inte sparas förrän du arkiverar tjänster eller uppgraderar."] },
      { h: "Upphörande", p: ["Du kan när som helst avsluta ditt konto. Din data raderas då enligt överenskommelse. Vi kan stänga av konton som används i strid med villkoren eller mot lag."] },
      { h: "Ändringar", p: ["Vi kan uppdatera villkoren. Väsentliga ändringar meddelas i god tid via e-post."] },
    ]} />;
}

function MShell({ path, title, desc, session, children }) {
  useSeo(title, desc);
  const [open, setOpen] = useState(false);
  const [prod, setProd] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
    document.querySelectorAll(".ats-rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  const go = (p) => { setOpen(false); setProd(false); navTo(p); };
  const isProd = NAV_PRODUCT.some((n) => n.path === path);

  return <div className="ats-root"><Style /><div className="ats-lp">
    <a className="ats-skip" href="#main">Hoppa till innehållet</a>
    <header className={"ats-lp-nav" + (scrolled ? " is-stuck" : "")}>
      <div className="ats-lp-nav-in">
        <button className="ats-lp-brand" onClick={() => go("/")} aria-label="Rekyl, till startsidan"><span className="ats-logo">R</span> Rekyl</button>
        <nav className="ats-lp-links" aria-label="Huvudmeny">
          <div className="ats-lp-drop" onMouseEnter={() => setProd(true)} onMouseLeave={() => setProd(false)}>
            <button className={isProd ? "is-active" : ""} onClick={() => setProd(!prod)} aria-expanded={prod}>Produkt <ChevronDown size={15} /></button>
            {prod && <div className="ats-lp-dropmenu">{NAV_PRODUCT.map((n) => <button key={n.path} onClick={() => go(n.path)} className={path === n.path ? "is-active" : ""}>
              <b>{n.label}</b><span>{n.desc}</span>
            </button>)}</div>}
          </div>
          {NAV_MAIN.map((n) => <button key={n.path} className={path === n.path ? "is-active" : ""} onClick={() => go(n.path)}>{n.label}</button>)}
        </nav>
        <div className="ats-lp-nav-r">
          {session
            ? <button className="ats-lp-cta" onClick={() => go("/")}>Till appen <ArrowRight size={16} /></button>
            : <><button className="ats-lp-login" onClick={() => go("/logga-in")}>Logga in</button><button className="ats-lp-cta" onClick={() => go("/skapa-konto")}>Kom igång</button></>}
        </div>
        <button className="ats-lp-burger" onClick={() => setOpen(!open)} aria-label={open ? "Stäng menyn" : "Öppna menyn"} aria-expanded={open}>{open ? <X size={22} /> : <MenuIcon size={22} />}</button>
      </div>
      {open && <div className="ats-lp-mob">
        <span className="ats-lp-mobh">Produkt</span>
        {NAV_PRODUCT.map((n) => <button key={n.path} className={path === n.path ? "is-active" : ""} onClick={() => go(n.path)}>{n.label}</button>)}
        <span className="ats-lp-mobh">Rekyl</span>
        {NAV_MAIN.map((n) => <button key={n.path} className={path === n.path ? "is-active" : ""} onClick={() => go(n.path)}>{n.label}</button>)}
        <div className="ats-lp-mob-acts">
          {session ? <button className="ats-lp-cta is-block" onClick={() => go("/")}>Till appen</button>
            : <><button className="ats-lp-ghost is-block" onClick={() => go("/logga-in")}>Logga in</button><button className="ats-lp-cta is-block" onClick={() => go("/skapa-konto")}>Kom igång</button></>}
        </div>
      </div>}
    </header>

    <main id="main">{children}</main>

    <footer className="ats-lp-foot">
      <div className="ats-lp-wrap ats-lp-foot-in">
        <div className="ats-lp-foot-brand">
          <button className="ats-lp-brand" onClick={() => go("/")}><span className="ats-logo">R</span> Rekyl</button>
          <p>Rekryteringsverktyget för svenska arbetsgivare som vill fatta beslut de kan förklara. Deterministiskt urval, ingen AI som gissar.</p>
        </div>
        <div className="ats-lp-foot-cols">
          <div><h4>Produkt</h4>{NAV_PRODUCT.map((n) => <button key={n.path} onClick={() => go(n.path)}>{n.label}</button>)}</div>
          <div><h4>Rekyl</h4>{NAV_MAIN.map((n) => <button key={n.path} onClick={() => go(n.path)}>{n.label}</button>)}<button onClick={() => go("/skapa-konto")}>Skapa konto</button></div>
          <div><h4>Juridik</h4>{NAV_LEGAL.map((n) => <button key={n.path} onClick={() => go(n.path)}>{n.label}</button>)}</div>
        </div>
      </div>
      <div className="ats-lp-foot-bot"><span>© {new Date().getFullYear()} Rekyl</span><span>Byggt i Sverige · Data inom EU</span></div>
    </footer>
    <CookieBanner />
  </div></div>;
}

/* Återanvändbara sektioner */
function MHero({ kicker, title, sub, primary, secondary, onPrimary, onSecondary }) {
  return <section className="ats-mh">
    <div className="ats-lp-wrap ats-mh-in">
      {kicker && <span className="ats-lp-eyebrow">{kicker}</span>}
      <h1>{title}</h1>
      {sub && <p className="ats-mh-sub">{sub}</p>}
      {(primary || secondary) && <div className="ats-mh-acts">
        {primary && <button className="ats-lp-cta is-lg" onClick={onPrimary}>{primary} <ArrowRight size={19} /></button>}
        {secondary && <button className="ats-lp-ghost" onClick={onSecondary}>{secondary}</button>}
      </div>}
    </div>
  </section>;
}
function MSec({ eyebrow, title, lead, children, tone }) {
  return <section className={"ats-msec" + (tone ? " is-" + tone : "")}>
    <div className="ats-lp-wrap ats-rv">
      {eyebrow && <span className="ats-lp-eyebrow">{eyebrow}</span>}
      {title && <h2 className="ats-lp-h2">{title}</h2>}
      {lead && <p className="ats-lp-lead">{lead}</p>}
      {children}
    </div>
  </section>;
}
function MSplit({ eyebrow, title, body, points, visual, flip }) {
  return <section className={"ats-lp-split" + (flip ? " is-flip" : "")}>
    <div className="ats-lp-wrap ats-lp-split-in ats-rv">
      {flip && <div className="ats-lp-split-v">{visual}</div>}
      <div className="ats-lp-split-t">
        <span className="ats-lp-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        {points && <ul className="ats-lp-checks">{points.map((p) => <li key={p}><Check size={17} /> {p}</li>)}</ul>}
      </div>
      {!flip && <div className="ats-lp-split-v">{visual}</div>}
    </div>
  </section>;
}
function MCta({ title, sub, label, onClick }) {
  return <section className="ats-lp-final">
    <div className="ats-lp-wrap ats-lp-final-in ats-rv">
      <h2>{title}</h2>
      <p>{sub}</p>
      <button className="ats-lp-cta is-lg" onClick={onClick}>{label} <ArrowRight size={19} /></button>
      <span className="ats-lp-final-note">Inget kreditkort. Ingen demo att boka.</span>
    </div>
  </section>;
}
function MLegal({ intro, sections }) {
  return <div className="ats-legal">
    <div className="ats-lp-wrap ats-legal-in">
      <p className="ats-legal-intro">{intro}</p>
      {sections.map((s2, i) => <section key={i} className="ats-legal-sec">
        <h2>{i + 1}. {s2.h}</h2>
        {s2.p.map((p, j) => <p key={j}>{p}</p>)}
        {s2.list && <ul>{s2.list.map((l, j) => <li key={j}>{l}</li>)}</ul>}
      </section>)}
    </div>
  </div>;
}
const PAGE_MAP = {
  "/": { c: HomePage, t: "Rekyl — rekrytera på krav, inte på magkänsla", d: "Rekryteringsverktyget för svenska arbetsgivare. Deterministisk poängsättning, publika jobbannonser, automatiska besked och full spårbarhet. Ingen AI som gissar." },
  "/funktioner": { c: FeaturesPage, t: "Funktioner — Rekyl", d: "Varje funktion i Rekyl: jobb och publicering, rekryteringsprocess, kandidathantering, kommunikation, team, analys samt säkerhet och GDPR." },
  "/karriarsidor": { c: CareerPage, t: "Karriärsidor och jobbannonser — Rekyl", d: "Publika jobbannonser med er profil, källspårade delningslänkar och ett ansökningsflöde som fungerar i mobilen." },
  "/kandidathantering": { c: CandidatesPage, t: "Kandidathantering — Rekyl", d: "Kandidatkort med poängunderlag, kö med swipe, filter, jämförelse och GDPR-radering." },
  "/rekryteringsprocess": { c: ProcessPage, t: "Rekryteringsprocess — Rekyl", d: "Från annons till anställd: kvalificerande frågor, knockoutregler, scoring, intervjubokning och automatiska besked." },
  "/analys": { c: AnalyticsPage, t: "Analys och rapportering — Rekyl", d: "Källkvalitet, rekryteringsfunnel, avslagsorsaker och utskriftsklara rapporter." },
  "/sakerhet": { c: SecurityPage, t: "Säkerhet och GDPR — Rekyl", d: "Samtycke, rätt att bli glömd, lagringstid, rollbaserad åtkomst, revisionslogg och data inom EU." },
  "/priser": { c: PricingPage, t: "Priser — Rekyl", d: "Start är gratis för din första tjänst. Pro kostar 790 kr per månad utan bindningstid. Enterprise efter behov." },
  "/om-rekyl": { c: AboutPage, t: "Om Rekyl", d: "Varför Rekyl finns: rekrytering ska gå att förklara — för kandidaten, för chefen och för dig själv om ett år." },
  "/kontakt": { c: ContactPage, t: "Kontakt — Rekyl", d: "Frågor om produkten, priser, Enterprise eller dataskydd. Vi svarar rakt och utan säljsnack." },
  "/integritetspolicy": { c: PrivacyPage, t: "Integritetspolicy — Rekyl", d: "Hur Rekyl behandlar personuppgifter, och vilka rättigheter du som kandidat har." },
  "/cookiepolicy": { c: CookiePage, t: "Cookiepolicy — Rekyl", d: "Rekyl använder endast nödvändiga cookies. Ingen annonsspårning och ingen profilering." },
  "/villkor": { c: TermsPage, t: "Användarvillkor — Rekyl", d: "Villkor för användning av Rekyl: tjänsten, ditt ansvar som arbetsgivare, priser och begränsningar." },
};
const LEGAL_TITLES = { "/integritetspolicy": "Integritetspolicy", "/cookiepolicy": "Cookiepolicy", "/villkor": "Användarvillkor" };
/* ===================== PUBLIK ROUTING ===================== */
function navTo(p) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === p) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  window.history.pushState({}, "", p);
  window.dispatchEvent(new Event("rekyl:nav"));
  window.scrollTo(0, 0);
}
function usePath() {
  const [path, setPath] = useState(() => (typeof window === "undefined" ? "/" : window.location.pathname));
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    window.addEventListener("rekyl:nav", on);
    return () => { window.removeEventListener("popstate", on); window.removeEventListener("rekyl:nav", on); };
  }, []);
  return path;
}
function useSeo(title, desc) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);
    document.documentElement.lang = "sv";
  }, [title, desc]);
}

/* Sidkarta — enda sanningen för navigation, footer och routing. Inga döda länkar. */
const NAV_PRODUCT = [
  { path: "/funktioner", label: "Alla funktioner", desc: "Varje funktion i Rekyl, kategori för kategori." },
  { path: "/karriarsidor", label: "Karriärsidor", desc: "Egen karriärsida och jobbannonser med er profil." },
  { path: "/kandidathantering", label: "Kandidathantering", desc: "Pipeline, kandidatkort och beslut du kan förklara." },
  { path: "/rekryteringsprocess", label: "Rekryteringsprocess", desc: "Steg, regler, intervjuer och automatiska besked." },
  { path: "/analys", label: "Analys och rapporter", desc: "Källkvalitet, funnel och rapporter som går att exportera." },
  { path: "/sakerhet", label: "Säkerhet och GDPR", desc: "Samtycke, radering, roller och revisionslogg." },
];
const NAV_MAIN = [
  { path: "/priser", label: "Priser" },
  { path: "/om-rekyl", label: "Om Rekyl" },
  { path: "/kontakt", label: "Kontakt" },
];
const NAV_LEGAL = [
  { path: "/integritetspolicy", label: "Integritetspolicy" },
  { path: "/cookiepolicy", label: "Cookiepolicy" },
  { path: "/villkor", label: "Användarvillkor" },
];
/* ===================== SUPERADMIN ===================== */
function SuperadminView({ showToast, session }) {
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);
  const [users, setUsers] = useState(null);
  const [sys, setSys] = useState(null);
  const [log, setLog] = useState(null);
  const [q, setQ] = useState("");
  const [delOrg, setDelOrg] = useState(null);
  const [delText, setDelText] = useState("");

  const loadOverview = useCallback(async () => {
    setBusy(true); setErr(null);
    const r = await adminCall("overview");
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setData({ tenants: r.tenants || [], totals: r.totals || {}, failures: r.failures || [] });
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === "users" && !users) adminCall("users").then((r) => r.ok ? setUsers(r.users) : setErr(r.error)); }, [tab, users]);
  useEffect(() => { if (tab === "system" && !sys) adminCall("system").then((r) => r.ok ? setSys(r) : setErr(r.error)); }, [tab, sys]);
  useEffect(() => { if (tab === "audit" && !log) adminCall("audit").then((r) => r.ok ? setLog(r.audit) : setErr(r.error)); }, [tab, log]);

  const act = async (action, args, msg) => {
    const r = await adminCall(action, args);
    if (!r.ok) { showToast({ kind: "warn", msg: r.error }); return false; }
    showToast({ kind: "ok", msg });
    setUsers(null); setLog(null);
    await loadOverview();
    return true;
  };
  const doDelete = async () => {
    const o = delOrg;
    const okDone = await act("delete_org", { org_id: o.id, confirm: delText }, "Organisationen raderades permanent");
    if (okDone) { setDelOrg(null); setDelText(""); }
  };

  const T = data ? data.tenants.filter((t) => !q.trim() || (t.name + " " + (t.company || "")).toLowerCase().includes(q.toLowerCase())) : [];
  const TABS = [["overview", "Översikt"], ["tenants", "Organisationer"], ["users", "Användare"], ["system", "System"], ["errors", "Fel"], ["audit", "Säkerhetslogg"]];
  const K = ({ v, l, tone }) => <div className={"ats-sa-kpi" + (tone ? " is-" + tone : "")}><span className="ats-sa-kpi-v">{v}</span><span className="ats-sa-kpi-l">{l}</span></div>;
  const when = (t) => (t ? new Date(t).toLocaleString("sv-SE").slice(0, 16) : "—");

  return (
    <div className="ats-view">
      <PageHeader title="Superadmin" meta={<><ShieldAlert size={13} /><span>SaaS-ägare · {session.email}</span></>} right={<button className="ats-ghost is-sm" onClick={loadOverview}><RotateCw size={14} /> Uppdatera</button>} />
      <div className="ats-tabs">{TABS.map(([id, l]) => <button key={id} className={"ats-tab" + (tab === id ? " is-on" : "")} onClick={() => setTab(id)}>{l}{id === "errors" && data && data.failures.length > 0 && <span className="ats-tab-n">{data.failures.length}</span>}</button>)}</div>
      {err && <div className="ats-intv-warn is-err"><CircleAlert size={14} /> {err}</div>}
      {busy && !data ? <div className="ats-col-empty" style={{ padding: 40 }}>Hämtar…</div> : null}

      {tab === "overview" && data && <>
        <div className="ats-sa-kpis">
          <K v={data.totals.orgs} l="Organisationer" />
          <K v={data.totals.members} l="Användare" />
          <K v={data.totals.jobs} l="Tjänster" />
          <K v={data.totals.candidates} l="Kandidater" />
          <K v={data.totals.interviews} l="Bokade intervjuer" />
          <K v={data.totals.hired} l="Anställda" />
          <K v={data.totals.mailSent} l="Mejl skickade" />
          <K v={data.totals.mailFailed} l="Mejl misslyckade" tone={data.totals.mailFailed > 0 ? "warn" : null} />
          <K v={data.totals.cvFiles} l="CV-filer" />
          <K v={kb(data.totals.bytes)} l="Datastorlek" />
          <K v={data.totals.suspended} l="Pausade konton" tone={data.totals.suspended > 0 ? "warn" : null} />
        </div>
        <h3 className="ats-sa-h">Senaste aktivitet</h3>
        <div className="ats-sa-rows">{[...data.tenants].sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0)).slice(0, 6).map((t) => <div key={t.id} className="ats-sa-row">
          <div className="ats-sa-main"><b>{t.name}</b><span>{t.jobs} tjänster · {t.candidates} kandidater · {t.members} användare</span></div>
          <span className="ats-sa-when">{when(t.lastActivity)}</span>
        </div>)}</div>
      </>}

      {tab === "tenants" && data && <>
        <div className="ats-jobs-tools"><div className="ats-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök organisation…" /></div></div>
        <div className="ats-sa-rows">{T.map((t) => <div key={t.id} className={"ats-sa-row is-card" + (t.suspended ? " is-susp" : "")}>
          <div className="ats-sa-main">
            <div className="ats-sa-top"><b>{t.name}</b><span className={"ats-jobbadge is-" + (t.plan === "enterprise" ? "pub" : t.plan === "pro" ? "open" : "unpub")}>{PLAN_LABEL[t.plan] || t.plan}</span>{t.suspended && <span className="ats-jobbadge is-archived">Pausad</span>}</div>
            <span>{t.jobs}/{t.maxJobs === 999 ? "∞" : t.maxJobs} tjänster · {t.candidates} kandidater · {t.members} användare · {t.interviews} intervjuer · {kb(t.bytes)}{t.hrEmail ? " · " + t.hrEmail : ""}</span>
            <span className="ats-sa-when">Skapad {when(t.createdAt)} · Senast aktiv {when(t.lastActivity)}</span>
          </div>
          <div className="ats-sa-acts">
            <select className="ats-select is-sm" value={t.plan} onChange={(e) => act("set_plan", { org_id: t.id, plan: e.target.value }, "Paket ändrat till " + (PLAN_LABEL[e.target.value] || e.target.value))}>
              {Object.keys(PLAN_LABEL).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
            </select>
            <button className="ats-ghost is-sm" onClick={() => act("set_suspended", { org_id: t.id, suspended: !t.suspended }, t.suspended ? "Kontot aktiverat" : "Kontot pausat")}>{t.suspended ? <><Check size={13} /> Aktivera</> : <><PauseCircle size={13} /> Pausa</>}</button>
            <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => { setDelOrg(t); setDelText(""); }}><Trash2 size={13} /></button>
          </div>
        </div>)}</div>
        {T.length === 0 && <div className="ats-col-empty" style={{ padding: 30 }}>Ingen organisation matchar.</div>}
      </>}

      {tab === "users" && <div className="ats-sa-rows">
        {!users ? <div className="ats-col-empty" style={{ padding: 30 }}>Hämtar…</div>
          : users.map((u) => <div key={u.user_id} className="ats-sa-row is-card">
            <div className="ats-sa-main"><b>{u.email || u.user_id}</b><span>{u.orgName} · {ROLE_LABEL[u.role] || u.role}</span></div>
            <div className="ats-sa-acts">
              <select className="ats-select is-sm" value={u.role} onChange={(e) => act("set_member_role", { user_id: u.user_id, role: e.target.value }, "Roll ändrad")}>
                {Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => act("remove_member", { user_id: u.user_id }, "Användaren togs bort")}><Trash2 size={13} /></button>
            </div>
          </div>)}
      </div>}

      {tab === "system" && <div className="ats-auto">
        {!sys ? <div className="ats-col-empty" style={{ padding: 30 }}>Hämtar…</div> : <>
          {[["E-postutskick", sys.mail.ok, sys.mail.ok ? "Aktivt via " + sys.mail.provider + " · avsändare " + sys.mail.from : sys.mail.reason],
            ["Databas (Supabase)", sys.supabase, sys.supabase ? "Ansluten och svarar" : "Svarar inte"],
            ["Avisering vid ny ansökan", sys.notify, sys.notify ? "Aktiv (NOTIFY_SECRET satt + webhook i Supabase)" : "NOTIFY_SECRET saknas i Netlify"],
            ["Intervjupåminnelser", sys.reminders, sys.reminders ? "Aktiva · körs varje timme" : "SUPABASE_SERVICE_ROLE_KEY saknas"]].map(([l, on, d]) =>
            <div key={l} className={"ats-auto-row" + (on ? " is-on" : "")}>
              <div className="ats-auto-i">{on ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}</div>
              <div className="ats-auto-t"><b>{l}</b><span>{d}</span></div>
            </div>)}
          <div className="ats-sa-plans">{Object.entries(sys.plans).map(([p, v]) => <div key={p} className="ats-sa-plan"><b>{PLAN_LABEL[p] || p}</b><span>{v.maxJobs === 999 ? "Obegränsat" : v.maxJobs + " tjänster"}</span></div>)}</div>
        </>}
      </div>}

      {tab === "errors" && data && <div className="ats-sa-rows">
        {data.failures.length === 0 ? <div className="ats-col-empty" style={{ padding: 30 }}>Inga misslyckade utskick. Allt fungerar.</div>
          : data.failures.map((f, i) => <div key={i} className="ats-sa-row is-card is-err">
            <div className="ats-sa-main"><b>{f.to}</b><span>{f.org} · {f.subject}</span><span className="ats-msgerr">{f.error}</span></div>
            <span className="ats-sa-when">{when(f.at)}</span>
          </div>)}
      </div>}

      {tab === "audit" && <div className="ats-sa-rows">
        {!log ? <div className="ats-col-empty" style={{ padding: 30 }}>Hämtar…</div>
          : log.length === 0 ? <div className="ats-col-empty" style={{ padding: 30 }}>Inga registrerade åtgärder än.</div>
            : log.map((a) => <div key={a.id} className="ats-sa-row is-card">
              <div className="ats-sa-main"><b>{a.action}</b><span>{a.actor_email || "—"} → {a.target || "—"}{a.meta ? " · " + JSON.stringify(a.meta) : ""}</span></div>
              <span className="ats-sa-when">{when(a.at)}</span>
            </div>)}
      </div>}

      {delOrg && <Modal title="Radera organisationen permanent?" onClose={() => setDelOrg(null)}><div className="ats-erase">
        <p><b>{delOrg.name}</b> raderas helt: {delOrg.jobs} tjänster, {delOrg.candidates} kandidater, {delOrg.members} användare, alla ansökningar och all sparad data. Detta går inte att ångra.</p>
        <label className="ats-field"><span className="ats-field-l">Skriv organisationens namn för att bekräfta</span><input value={delText} onChange={(e) => setDelText(e.target.value)} placeholder={delOrg.name} /></label>
        <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setDelOrg(null)}>Avbryt</button><button className="ats-btn-danger" disabled={delText !== delOrg.name} onClick={doDelete}><Trash2 size={15} /> Radera permanent</button></div>
      </div></Modal>}
    </div>
  );
}
/* ---- Gemensam förflyttningspanel: används av kanban, kandidatpanel, tabell, mobil, bulk ---- */
function MovePanel({ cand, job, state, me, D, showToast, onClose, preset }) {
  const pipe = job.pipeline;
  const [to, setTo] = useState(preset || "");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [ownerId, setOwnerId] = useState(cand.ownerId || "");
  const [notify, setNotify] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const target = to ? stageById(pipe, to) : null;
  const opts = { reason, comment, ownerId: ownerId || null, notify, rev: cand.rev || 0 };
  const blockers = target ? moveBlockers(state, cand, job, target, me, opts) : [];
  const stages = liveStages(pipe).filter((st) => st.id !== cand.stageId).filter((st) => !q.trim() || st.name.toLowerCase().includes(q.toLowerCase()));
  const isSensitive = target && ["rejected", "hired", "offer", "withdrawn"].includes(target.type);
  const go = () => {
    if (!target || blockers.length || busy) return;
    setBusy(true);
    D({ type: "MOVE_CANDIDATE", id: cand.id, stageId: target.id, reqId: "r" + uid(), source: "manual", ...opts });
    showToast({ kind: "ok", msg: cand.name + " → " + target.name });
    onClose();
  };
  return <div className="ats-mv">
    <div className="ats-mv-cand"><span className="ats-avatar">{cand.name[0]}</span><div><b>{cand.name}</b><span>{(stageById(pipe, cand.stageId) || {}).name || "—"}</span></div></div>
    <label className="ats-field"><span className="ats-field-l">Flytta till</span>
      <input className="ats-inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök steg…" />
    </label>
    <div className="ats-mv-stages">{stages.map((st) => {
      const bl = moveBlockers(state, cand, job, st, me, { ...opts, reason: st.req.reason ? "x" : reason, comment: st.req.comment ? "x" : comment });
      const hard = bl.filter((b) => !["reason", "comment", "owner"].includes(b.code));
      return <button key={st.id} className={"ats-mv-stage" + (to === st.id ? " is-on" : "") + (hard.length ? " is-blocked" : "")} onClick={() => !hard.length && setTo(st.id)} disabled={hard.length > 0}>
        <span className="ats-mv-dot" style={{ background: st.color }} />
        <div><b>{st.name}</b><span>{STAGE_TYPES[st.type].label}{hard.length ? " · " + hard[0].msg : ""}</span></div>
        {hard.length ? <Lock size={14} /> : to === st.id ? <Check size={16} /> : null}
      </button>;
    })}</div>
    {stages.length === 0 && <div className="ats-col-empty" style={{ padding: 20 }}>Inget steg matchar.</div>}
    {target && <>
      {(target.req.reason || target.type === "rejected") && <label className="ats-field"><span className="ats-field-l">Anledning {target.req.reason && <i style={{ color: "var(--brick)" }}>*</i>}</span>
        <select className="ats-inp" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Välj anledning…</option>{REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>}
      {target.req.comment && <label className="ats-field"><span className="ats-field-l">Intern kommentar <i style={{ color: "var(--brick)" }}>*</i></span><textarea className="ats-inp" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} /></label>}
      <label className="ats-field"><span className="ats-field-l">Ansvarig</span><select className="ats-inp" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}><option value="">Ingen</option>{state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      {TRIGGER_FOR[legacyOf(target)] && <label className="ats-cb-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Skicka mejl till kandidaten ({(state.templates.find((t) => t.trigger === TRIGGER_FOR[legacyOf(target)]) || {}).name || "mall"})</label>}
      {blockers.length > 0 && <div className="ats-mv-block">{blockers.map((b) => <div key={b.code}><CircleAlert size={14} /><div><b>{b.msg}</b><span>{b.fix}</span></div></div>)}</div>}
      {isSensitive && blockers.length === 0 && <div className="ats-mv-warn"><AlertTriangle size={14} /><div>
        <b>Detta är ett beslut som inte går att ta tillbaka automatiskt.</b>
        <span>Kandidatens status blir <b>{STAGE_TYPES[target.type].label}</b>{TRIGGER_FOR[legacyOf(target)] && notify ? ", ett mejl skickas" : ", inget mejl skickas"}, och SLA för nuvarande steg avslutas.</span>
      </div></div>}
    </>}
    <div className="ats-erase-actions"><button className="ats-ghost" onClick={onClose}>Avbryt</button>
      <button className="ats-btn-primary" disabled={!target || blockers.length > 0 || busy} onClick={go}><ArrowRight size={15} /> Flytta kandidat</button></div>
  </div>;
}

/* ---- Kandidatkort i kanban ---- */
function PipeCard({ c, pipe, org, sel, onSel, onOpen, onMove, dense, dragProps, me }) {
  const sla = slaState(c, pipe, org, Date.now());
  const iv = ivActive(c) ? c.interview : null;
  const days = Math.floor(sla.inStage / 864e5);
  const tone = { critical: "brick", late: "brick", warning: "amber", paused: "blue", exempt: "muted", ontime: "petrol", none: "muted", done: "muted" }[sla.status];
  return <div className={"ats-pc" + (sel ? " is-sel" : "") + (dense ? " is-dense" : "")} {...dragProps} tabIndex={0} role="listitem"
    onKeyDown={(e) => { if (e.key === "Enter") onOpen(c.id); if (e.key === "m" || e.key === "M") { e.preventDefault(); onMove(c); } }}
    aria-label={c.name + ", " + SLA_LABEL[sla.status]}>
    <div className="ats-pc-h">
      {can(me.role, "decide") && <input type="checkbox" checked={sel} onChange={() => onSel(c.id)} onClick={(e) => e.stopPropagation()} aria-label={"Välj " + c.name} />}
      <button className="ats-pc-name" onClick={() => onOpen(c.id)}>{c.name}</button>
      <span className="ats-pc-score">{c.knockout ? <span className="ats-pc-ko">KO</span> : (c.total != null ? c.total + "%" : "—")}</span>
    </div>
    {!dense && <div className="ats-pc-meta">{c.source || "direkt"} · {days === 0 ? "idag" : days + " d i steget"}</div>}
    <div className="ats-pc-tags">
      <span className={"ats-pc-sla is-" + tone}><span className="ats-pc-dot" />{SLA_LABEL[sla.status]}{sla.status === "late" || sla.status === "critical" ? "" : sla.remaining > 0 ? " · " + Math.ceil(sla.remaining / 864e5) + " d kvar" : ""}</span>
      {!c.ownerId && <span className="ats-pc-warn"><UserCheck size={11} /> Ingen ansvarig</span>}
      {iv && <span className="ats-pc-iv"><CalendarCheck size={11} /> {fmtInterview(iv.at)}</span>}
      {c.rating > 0 && <span className="ats-pc-rate"><Star size={11} /> {c.rating}</span>}
    </div>
    <button className="ats-pc-move" onClick={() => onMove(c)} aria-label={"Flytta " + c.name}><ArrowRight size={14} /></button>
  </div>;
}

/* ---- Pipelinevyn: kanban, lista, tabell, stegvy, åtgärder, byggare ---- */
function PipelineView({ state, D, me, job, cands, showToast, setDetailId }) {
  const [view, setView] = useState(() => store.get("rekyl_pipeview", "kanban"));
  const [dense, setDense] = useState(false);
  const [sel, setSel] = useState([]);
  const [moveFor, setMoveFor] = useState(null);
  const [bulkTo, setBulkTo] = useState(null);
  const [bulkRes, setBulkRes] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [focus, setFocus] = useState(null);
  const [q, setQ] = useState("");
  const [fSla, setFSla] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [collapsed, setCollapsed] = useState([]);
  const [pauseFor, setPauseFor] = useState(null);
  const [exceptFor, setExceptFor] = useState(null);
  const [pReason, setPReason] = useState("");
  const [eDays, setEDays] = useState(3);
  useEffect(() => { store.set("rekyl_pipeview", view); }, [view]);

  if (!job || !job.pipeline) { D({ type: "PIPE_INIT", jobId: job && job.id }); return <div className="ats-view"><PageHeader title="Pipeline" /><div className="ats-col-empty" style={{ padding: 40 }}>Förbereder pipelinen…</div></div>; }
  const pipe = job.pipeline;
  const canDecide = can(me.role, "decide");
  const canEdit = can(me.role, "edit") && !isReadonly(job);
  const now = Date.now();
  const stages = liveStages(pipe);
  const enriched = cands.map((c) => ({ ...c, _sla: slaState(c, pipe, state.org, now) }));
  const filtered = enriched
    .filter((c) => !q.trim() || (c.name + " " + c.email + " " + (c.source || "")).toLowerCase().includes(q.toLowerCase()))
    .filter((c) => !fSla || c._sla.status === fSla)
    .filter((c) => !fOwner || (fOwner === "none" ? !c.ownerId : c.ownerId === fOwner));
  const inStage = (st) => filtered.filter((c) => c.stageId === st.id);
  const nameOf = (id) => (state.team.find((m) => m.id === id) || {}).name || null;

  const doMove = (c, stId, extra) => {
    const to = stageById(pipe, stId);
    const bl = moveBlockers(state, c, job, to, me, { rev: c.rev || 0, ...(extra || {}) });
    if (bl.length) { setMoveFor({ c, preset: stId }); return; }
    D({ type: "MOVE_CANDIDATE", id: c.id, stageId: stId, reqId: "r" + uid(), source: "kanban", rev: c.rev || 0, ...(extra || {}) });
    showToast({ kind: "ok", msg: c.name + " → " + to.name });
  };
  const runBulk = (stId) => {
    const to = stageById(pipe, stId);
    const chosen = enriched.filter((c) => sel.includes(c.id));
    const bulkId = "b" + uid();
    const res = { total: chosen.length, ok: 0, blocked: [] };
    chosen.forEach((c) => {
      const bl = moveBlockers(state, c, job, to, me, { rev: c.rev || 0 });
      if (bl.length || !to.allowBulk) { res.blocked.push({ name: c.name, why: !to.allowBulk ? "Steget tillåter inte bulkflytt" : bl[0].msg }); return; }
      D({ type: "MOVE_CANDIDATE", id: c.id, stageId: stId, reqId: "r" + uid(), source: "bulk", bulkId, rev: c.rev || 0 });
      res.ok++;
    });
    setBulkTo(null); setSel([]); setBulkRes(res);
  };
  const undo = (ev) => {
    const c = state.candidates.find((x) => x.id === ev.candId);
    if (!c) return;
    D({ type: "MOVE_CANDIDATE", id: c.id, stageId: ev.fromId, reqId: "r" + uid(), source: "undo", undoOf: ev.id, notify: false, reason: "Återställd förflyttning", rev: c.rev || 0 });
    showToast({ kind: "ok", msg: "Förflyttningen återställdes" });
  };

  const dragProps = (c) => canDecide ? {
    draggable: true,
    onDragStart: (e) => { setDrag(c.id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", c.id); } catch (err) { /* Safari */ } },
    onDragEnd: () => { setDrag(null); setOver(null); },
  } : {};
  const dropProps = (st) => canDecide ? {
    onDragOver: (e) => { e.preventDefault(); setOver(st.id); },
    onDragLeave: () => setOver((o) => o === st.id ? null : o),
    onDrop: (e) => { e.preventDefault(); setOver(null); const id = drag || e.dataTransfer.getData("text/plain"); const c = enriched.find((x) => x.id === id); setDrag(null); if (c && c.stageId !== st.id) doMove(c, st.id); },
  } : {};

  const VIEWS = [["kanban", "Kanban", Layers], ["list", "Lista", ListChecks], ["table", "Tabell", BarChart3], ["stage", "Steg", Blocks], ["action", "Åtgärder", AlertTriangle], ["build", "Bygg", SlidersHorizontal]];
  const attention = enriched.filter((c) => ["late", "critical", "warning"].includes(c._sla.status) || !c.ownerId || c._sla.status === "paused");

  return <div className="ats-view">
    <PageHeader title="Pipeline" meta={<><span>{job.title}</span><Dot /><span className="ats-mono">v{pipe.version}</span>{pipe.dirty && <><Dot /><span className="ats-pipe-dirty">Opublicerade ändringar</span></>}</>}
      right={<div className="ats-pipe-views">{VIEWS.filter((v) => v[0] !== "build" || canEdit).map(([id, l, I]) => <button key={id} className={view === id ? "is-on" : ""} onClick={() => setView(id)} aria-label={l}><I size={14} /> <span>{l}</span>{id === "action" && attention.length > 0 && <em>{attention.length}</em>}</button>)}</div>} />

    {view !== "build" && <div className="ats-jfilters">
      <div className="ats-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök kandidat…" /></div>
      <select className="ats-select is-sm" value={fSla} onChange={(e) => setFSla(e.target.value)} aria-label="SLA-status"><option value="">Alla SLA-lägen</option>{Object.entries(SLA_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select className="ats-select is-sm" value={fOwner} onChange={(e) => setFOwner(e.target.value)} aria-label="Ansvarig"><option value="">Alla ansvariga</option><option value="none">Utan ansvarig</option>{state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      {view === "kanban" && <button className="ats-ghost is-sm" onClick={() => setDense(!dense)}>{dense ? "Bekväm" : "Kompakt"}</button>}
    </div>}

    {sel.length > 0 && canDecide && <div className="ats-bulkbar">
      <b>{sel.length} valda</b>
      <button className="ats-ghost is-sm" onClick={() => setBulkTo(true)}><ArrowRight size={13} /> Flytta</button>
      <button className="ats-ghost is-sm" onClick={() => setSel([])}>Avmarkera</button>
    </div>}

    {view === "kanban" && (stages.length === 0
      ? <div className="ats-col-empty" style={{ padding: 44 }}>Pipelinen saknar steg. Lägg till steg under <b>Bygg</b>.</div>
      : <div className="ats-kb" role="list">{stages.map((st) => {
        const list = inStage(st);
        const late = list.filter((c) => ["late", "critical"].includes(c._sla.status)).length;
        const warn = list.filter((c) => c._sla.status === "warning").length;
        const col = collapsed.includes(st.id);
        return <section key={st.id} className={"ats-kb-col" + (over === st.id ? " is-over" : "") + (col ? " is-col" : "")} {...dropProps(st)} aria-label={st.name}>
          <header className="ats-kb-h" style={{ borderTopColor: st.color }}>
            <button className="ats-kb-collapse" onClick={() => setCollapsed(col ? collapsed.filter((x) => x !== st.id) : [...collapsed, st.id])} aria-label={col ? "Visa" : "Kollapsa"}>{col ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
            <div className="ats-kb-t"><b>{st.name}</b><span>{STAGE_TYPES[st.type].label}{st.sla.mode !== "none" ? " · " + st.sla.days + (st.sla.calendar === "business" ? " arbetsdagar" : " dagar") : ""}</span></div>
            <span className="ats-kb-n">{list.length}</span>
            {late > 0 && <span className="ats-kb-late" title="Försenade"><AlertTriangle size={11} /> {late}</span>}
            {warn > 0 && <span className="ats-kb-warn" title="Nära deadline">{warn}</span>}
          </header>
          {!col && <div className="ats-kb-body">
            {list.length === 0 ? <div className="ats-kb-empty">Inga kandidater</div>
              : list.slice(0, 80).map((c) => <PipeCard key={c.id} c={c} pipe={pipe} org={state.org} me={me} dense={dense}
                sel={sel.includes(c.id)} onSel={(id) => setSel((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x, id])}
                onOpen={setDetailId} onMove={(cc) => setMoveFor({ c: cc })} dragProps={dragProps(c)} />)}
            {list.length > 80 && <div className="ats-kb-more">+{list.length - 80} till — använd filter eller tabellvyn</div>}
          </div>}
        </section>;
      })}</div>)}

    {(view === "list" || view === "table") && <div className="ats-jtablewrap"><table className="ats-jtable">
      <thead><tr>{canDecide && <th><input type="checkbox" checked={filtered.length > 0 && filtered.every((c) => sel.includes(c.id))} onChange={(e) => setSel(e.target.checked ? filtered.map((c) => c.id) : [])} aria-label="Välj alla" /></th>}
        <th>Kandidat</th><th>Steg</th><th>SLA</th><th>Tid i steg</th><th>Ansvarig</th><th>Matchning</th><th>Källa</th><th /></tr></thead>
      <tbody>{filtered.map((c) => { const st = stageById(pipe, c.stageId) || {}; return <tr key={c.id} className={sel.includes(c.id) ? "is-sel" : ""}>
        {canDecide && <td><input type="checkbox" checked={sel.includes(c.id)} onChange={() => setSel((x) => x.includes(c.id) ? x.filter((y) => y !== c.id) : [...x, c.id])} aria-label={"Välj " + c.name} /></td>}
        <td><button className="ats-jobcard-title" onClick={() => setDetailId(c.id)}>{c.name}</button></td>
        <td><span className="ats-jtag" style={{ background: (st.color || "#888") + "1f", color: st.color }}>{st.name || "—"}</span></td>
        <td><span className={"ats-pc-sla is-" + ({ critical: "brick", late: "brick", warning: "amber", paused: "blue", exempt: "muted", ontime: "petrol", none: "muted", done: "muted" }[c._sla.status])}><span className="ats-pc-dot" />{SLA_LABEL[c._sla.status]}</span></td>
        <td>{Math.floor(c._sla.inStage / 864e5)} d</td>
        <td>{nameOf(c.ownerId) || <span className="ats-muted">Ingen</span>}</td>
        <td>{c.knockout ? "KO" : (c.total != null ? c.total + "%" : "—")}</td>
        <td>{c.source || "direkt"}</td>
        <td>{canDecide && <button className="ats-ghost is-sm" onClick={() => setMoveFor({ c })}><ArrowRight size={13} /></button>}</td>
      </tr>; })}</tbody>
    </table>{filtered.length === 0 && <div className="ats-col-empty" style={{ padding: 30 }}>Ingen kandidat matchar.</div>}</div>}

    {view === "stage" && <div className="ats-stagev">
      <div className="ats-stagev-tabs">{stages.map((st) => <button key={st.id} className={(focus || stages[0].id) === st.id ? "is-on" : ""} onClick={() => setFocus(st.id)} style={{ borderBottomColor: (focus || stages[0].id) === st.id ? st.color : "transparent" }}>{st.name} <em>{inStage(st).length}</em></button>)}</div>
      <div className="ats-stagev-list">{inStage(stageById(pipe, focus || stages[0].id) || stages[0]).map((c) => <PipeCard key={c.id} c={c} pipe={pipe} org={state.org} me={me}
        sel={sel.includes(c.id)} onSel={(id) => setSel((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x, id])} onOpen={setDetailId} onMove={(cc) => setMoveFor({ c: cc })} dragProps={{}} />)}
        {inStage(stageById(pipe, focus || stages[0].id) || stages[0]).length === 0 && <div className="ats-col-empty" style={{ padding: 30 }}>Inga kandidater i steget.</div>}</div>
    </div>}

    {view === "action" && <div className="ats-act">
      {attention.length === 0 ? <div className="ats-col-empty" style={{ padding: 44 }}>Inget kräver åtgärd just nu. Alla kandidater är inom tid och har ansvarig.</div>
        : <div className="ats-sa-rows">{[...attention].sort((a, b) => ({ critical: 0, late: 1, warning: 2, paused: 3 }[a._sla.status] ?? 4) - ({ critical: 0, late: 1, warning: 2, paused: 3 }[b._sla.status] ?? 4)).map((c) => {
          const st = stageById(pipe, c.stageId) || {};
          return <div key={c.id} className="ats-sa-row is-card">
            <div className="ats-sa-main">
              <div className="ats-sa-top"><button className="ats-jobcard-title" onClick={() => setDetailId(c.id)}>{c.name}</button>
                <span className={"ats-pc-sla is-" + ({ critical: "brick", late: "brick", warning: "amber", paused: "blue" }[c._sla.status] || "muted")}><span className="ats-pc-dot" />{SLA_LABEL[c._sla.status]}</span>
                {!c.ownerId && <span className="ats-pc-warn"><UserCheck size={11} /> Ingen ansvarig</span>}</div>
              <span>{st.name} · {Math.floor(c._sla.inStage / 864e5)} dagar i steget{c._sla.dueAt ? " · deadline " + new Date(c._sla.dueAt).toLocaleDateString("sv-SE") : ""}</span>
            </div>
            {canDecide && <div className="ats-sa-acts">
              <button className="ats-ghost is-sm" onClick={() => setMoveFor({ c })}><ArrowRight size={13} /> Flytta</button>
              <Menu align="right" trigger={<button className="ats-ghost is-sm"><Settings2 size={14} /></button>}>
                <div className="ats-menu-label">Ansvarig</div>
                {state.team.map((m) => <button key={m.id} className="ats-menu-item" onClick={() => D({ type: "SET_CAND_OWNER", id: c.id, ownerId: m.id })}>{m.name}</button>)}
                <div className="ats-menu-sep" />
                {c._sla.status === "paused"
                  ? <button className="ats-menu-item" onClick={() => D({ type: "SLA_PAUSE", id: c.id, end: true })}><RotateCw size={14} /> Avsluta paus</button>
                  : <button className="ats-menu-item" onClick={() => { setPauseFor(c); setPReason(""); }}><PauseCircle size={14} /> Pausa SLA</button>}
                <button className="ats-menu-item" onClick={() => { setExceptFor(c); setEDays(3); }}><CalendarClock size={14} /> SLA-undantag</button>
              </Menu>
            </div>}
          </div>;
        })}</div>}
    </div>}

    {view === "build" && canEdit && <PipeBuilder job={job} state={state} D={D} showToast={showToast} />}

    {moveFor && <Modal title="Flytta kandidat" onClose={() => setMoveFor(null)}>
      <MovePanel cand={state.candidates.find((c) => c.id === moveFor.c.id) || moveFor.c} job={job} state={state} me={me} D={D} showToast={showToast} preset={moveFor.preset} onClose={() => setMoveFor(null)} />
    </Modal>}
    {bulkTo && <Modal title={"Flytta " + sel.length + " kandidater"} onClose={() => setBulkTo(null)}><div className="ats-erase">
      <p>Kandidater som blockeras av stegkrav flyttas inte — övriga genomförs ändå. Du får en fullständig rapport efteråt.</p>
      <div className="ats-mv-stages">{stages.map((st) => <button key={st.id} className="ats-mv-stage" onClick={() => runBulk(st.id)} disabled={!st.allowBulk}>
        <span className="ats-mv-dot" style={{ background: st.color }} /><div><b>{st.name}</b><span>{st.allowBulk ? STAGE_TYPES[st.type].label : "Bulkflytt är avstängd för steget"}</span></div>
      </button>)}</div>
    </div></Modal>}
    {bulkRes && <Modal title="Resultat" onClose={() => setBulkRes(null)}><div className="ats-erase">
      <p><b>{bulkRes.ok}</b> av {bulkRes.total} kandidater flyttades.</p>
      {bulkRes.blocked.length > 0 && <><div className="ats-erase-note"><AlertTriangle size={14} /> {bulkRes.blocked.length} blockerades:</div>
        <ul className="ats-blocked">{bulkRes.blocked.map((b, i) => <li key={i}><b>{b.name}</b><span>{b.why}</span></li>)}</ul></>}
      <div className="ats-erase-actions"><button className="ats-btn-primary" onClick={() => setBulkRes(null)}>Stäng</button></div>
    </div></Modal>}
    {pauseFor && <Modal title="Pausa SLA" onClose={() => setPauseFor(null)}><div className="ats-erase">
      <p>SLA-klockan stannar för <b>{pauseFor.name}</b> tills pausen avslutas. Tiden i steget räknas inte upp under pausen.</p>
      <label className="ats-field"><span className="ats-field-l">Anledning</span><input className="ats-inp" value={pReason} onChange={(e) => setPReason(e.target.value)} placeholder="Väntar på referens" /></label>
      <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setPauseFor(null)}>Avbryt</button>
        <button className="ats-btn-primary" disabled={!pReason.trim()} onClick={() => { D({ type: "SLA_PAUSE", id: pauseFor.id, reason: pReason }); setPauseFor(null); showToast({ kind: "ok", msg: "SLA pausad" }); }}><PauseCircle size={15} /> Pausa</button></div>
    </div></Modal>}
    {exceptFor && <Modal title="SLA-undantag" onClose={() => setExceptFor(null)}><div className="ats-erase">
      <p>Ge <b>{exceptFor.name}</b> extra tid eller undanta kandidaten helt. Den ursprungliga deadlinen skrivs aldrig över — undantaget loggas separat.</p>
      <label className="ats-field"><span className="ats-field-l">Förläng med (dagar)</span><input className="ats-inp" type="number" min="1" max="60" value={eDays} onChange={(e) => setEDays(Number(e.target.value))} /></label>
      <label className="ats-field"><span className="ats-field-l">Anledning</span><input className="ats-inp" value={pReason} onChange={(e) => setPReason(e.target.value)} /></label>
      <div className="ats-erase-actions">
        <button className="ats-ghost" onClick={() => { D({ type: "SLA_EXCEPT", id: exceptFor.id, clear: true }); setExceptFor(null); }}>Ta bort undantag</button>
        <button className="ats-ghost" onClick={() => { D({ type: "SLA_EXCEPT", id: exceptFor.id, exempt: true, reason: pReason }); setExceptFor(null); showToast({ kind: "ok", msg: "Undantagen från SLA" }); }}>Undanta helt</button>
        <button className="ats-btn-primary" onClick={() => { D({ type: "SLA_EXCEPT", id: exceptFor.id, dueAt: Date.now() + eDays * 864e5, reason: pReason }); setExceptFor(null); showToast({ kind: "ok", msg: "Deadline förlängd" }); }}>Förläng</button>
      </div>
    </div></Modal>}

    {/* Senaste förflyttningar med återställning */}
    {view !== "build" && (state.moves || []).filter((m) => m.jobId === job.id).length > 0 && <div className="ats-moves">
      <h3>Senaste förflyttningar</h3>
      <div className="ats-moves-list">{(state.moves || []).filter((m) => m.jobId === job.id).slice(0, 8).map((m) => <div key={m.id} className="ats-move">
        <div><b>{m.candName}</b><span>{m.fromName} → {m.toName}{m.reason ? " · " + m.reason : ""}</span></div>
        <span className="ats-sa-when">{m.byName} · {timeAgo(m.at)}{m.undoOf ? " · återställning" : ""}{m.bulkId ? " · bulk" : ""}</span>
        {canDecide && !m.undoOf && <button className="ats-ghost is-sm" onClick={() => undo(m)}><RotateCcw size={13} /> Ångra</button>}
      </div>)}</div>
    </div>}
  </div>;
}

/* ---- Pipelinebyggare ---- */
function PipeBuilder({ job, state, D, showToast }) {
  const pipe = job.pipeline;
  const [selId, setSelId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("custom");
  const [archFor, setArchFor] = useState(null);
  const [moveTo, setMoveTo] = useState("");
  const [showVers, setShowVers] = useState(false);
  const [note, setNote] = useState("");
  const flow = pipe.stages.filter((st) => !STAGE_TYPES[st.type].final).sort((a, b) => a.order - b.order);
  const finals = pipe.stages.filter((st) => STAGE_TYPES[st.type].final).sort((a, b) => a.order - b.order);
  const st = selId ? stageById(pipe, selId) : null;
  const countIn = (id) => state.candidates.filter((c) => c.jobId === job.id && c.stageId === id).length;
  const setSt = (patch) => D({ type: "STAGE_SET", jobId: job.id, id: st.id, patch });

  const Row = ({ x, i, arr }) => <div className={"ats-pb-row" + (selId === x.id ? " is-on" : "") + (x.archived ? " is-arch" : "")}>
    <span className="ats-pb-dot" style={{ background: x.color }} />
    <button className="ats-pb-name" onClick={() => setSelId(x.id === selId ? null : x.id)}>
      <b>{x.name}</b><span>{STAGE_TYPES[x.type].label}{x.system ? " · systemsteg" : ""}{x.sla.mode !== "none" ? " · SLA " + x.sla.days + (x.sla.calendar === "business" ? " arbetsd." : " d") : ""}{x.hidden ? " · dold" : ""}</span>
    </button>
    <span className="ats-pb-n">{countIn(x.id)}</span>
    <div className="ats-pb-acts">
      {!x.system && arr && <>
        <button className="ats-ghost is-sm" disabled={i === 0} onClick={() => D({ type: "STAGE_MOVE", jobId: job.id, id: x.id, dir: -1 })} aria-label="Flytta upp"><ArrowUp size={13} /></button>
        <button className="ats-ghost is-sm" disabled={i === arr.length - 1} onClick={() => D({ type: "STAGE_MOVE", jobId: job.id, id: x.id, dir: 1 })} aria-label="Flytta ner"><ArrowDown size={13} /></button>
        <button className="ats-ghost is-sm" onClick={() => D({ type: "STAGE_DUP", jobId: job.id, id: x.id })} aria-label="Duplicera"><Copy size={13} /></button>
        <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => { const n = countIn(x.id); if (n && !x.archived) { setArchFor(x); setMoveTo(""); } else D({ type: "STAGE_ARCHIVE", jobId: job.id, id: x.id }); }} aria-label={x.archived ? "Återställ" : "Arkivera"}>{x.archived ? <RotateCcw size={13} /> : <Trash2 size={13} />}</button>
      </>}
      {x.system && <span className="ats-pb-lock"><Lock size={12} /> Låst</span>}
    </div>
  </div>;

  return <div className="ats-pb">
    <div className="ats-pb-main">
      <div className="ats-panel">
        <div className="ats-panel-h"><h2>Steg i processen</h2><button className="ats-ghost is-sm" onClick={() => setAdding(true)}><Plus size={14} /> Lägg till steg</button></div>
        <div className="ats-pb-list">{flow.map((x, i) => <Row key={x.id} x={x} i={i} arr={flow} />)}</div>
        <div className="ats-panel-h" style={{ marginTop: 18 }}><h2>Slutlägen</h2></div>
        <div className="ats-erase-note"><Lock size={14} /> Systemsteg kan inte raderas — de behövs för statistik, rapporter och historik.</div>
        <div className="ats-pb-list">{finals.map((x) => <Row key={x.id} x={x} />)}</div>
      </div>
      <div className="ats-pb-publish">
        <div><b>{pipe.dirty ? "Opublicerade ändringar" : "Allt publicerat"}</b><span>Version {pipe.version}{pipe.dirty ? " · ändringarna gäller redan för nya förflyttningar, publicera för att spara en version" : ""}</span></div>
        <div className="ats-pb-pacts">
          <button className="ats-ghost is-sm" onClick={() => setShowVers(true)}><History size={14} /> Versioner ({(pipe.versions || []).length})</button>
          <button className="ats-btn-primary is-sm" disabled={!pipe.dirty} onClick={() => { D({ type: "PIPE_PUBLISH", jobId: job.id, note }); setNote(""); showToast({ kind: "ok", msg: "Pipeline publicerad · v" + (pipe.version + 1) }); }}><Rocket size={14} /> Publicera version</button>
        </div>
      </div>
    </div>

    {st && <aside className="ats-pb-side">
      <div className="ats-panel">
        <div className="ats-panel-h"><h2>{st.name}</h2><button className="ats-ghost is-sm" onClick={() => setSelId(null)}><X size={15} /></button></div>
        <label className="ats-field"><span className="ats-field-l">Namn</span><input className="ats-inp" value={st.name} onChange={(e) => setSt({ name: e.target.value })} /></label>
        <label className="ats-field"><span className="ats-field-l">Beskrivning</span><textarea className="ats-inp" rows={2} value={st.desc} onChange={(e) => setSt({ desc: e.target.value })} /></label>
        <label className="ats-field"><span className="ats-field-l">Stegtyp</span><select className="ats-inp" value={st.type} disabled={st.system} onChange={(e) => setSt({ type: e.target.value })}>{Object.entries(STAGE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label className="ats-field"><span className="ats-field-l">Färg</span><div className="ats-tagcolors">{STAGE_COLORS.map((c) => <button key={c} className={"ats-tagcolor" + (st.color === c ? " is-on" : "")} style={{ background: c }} onClick={() => setSt({ color: c })} aria-label={"Färg " + c} />)}</div></label>
        <label className="ats-cb-check"><input type="checkbox" checked={!st.hidden} onChange={(e) => setSt({ hidden: !e.target.checked })} /> Aktivt (syns i pipelinen)</label>

        <h3 className="ats-pb-h">Ansvar</h3>
        <label className="ats-field"><span className="ats-field-l">Tilldelning vid inträde</span><select className="ats-inp" value={st.assign} onChange={(e) => setSt({ assign: e.target.value })}>
          <option value="keep">Behåll nuvarande ansvarig</option><option value="job">Tilldela jobbets rekryterare</option><option value="stage">Tilldela stegets ansvariga</option><option value="none">Lämna otilldelad</option></select></label>
        <label className="ats-field"><span className="ats-field-l">Stegets ansvariga</span><select className="ats-inp" value={st.ownerId || ""} onChange={(e) => setSt({ ownerId: e.target.value || null })}><option value="">Ingen</option>{state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>

        <h3 className="ats-pb-h">SLA</h3>
        <label className="ats-field"><span className="ats-field-l">Läge</span><select className="ats-inp" value={st.sla.mode} onChange={(e) => setSt({ sla: { ...st.sla, mode: e.target.value } })}>
          <option value="none">Ingen SLA</option><option value="soft">Rekommenderad tid</option><option value="hard">Hård deadline</option></select></label>
        {st.sla.mode !== "none" && <>
          <div className="ats-tpl-two">
            <label className="ats-field"><span className="ats-field-l">Antal dagar</span><input className="ats-inp" type="number" min="0" max="90" value={st.sla.days} onChange={(e) => setSt({ sla: { ...st.sla, days: Number(e.target.value) } })} /></label>
            <label className="ats-field"><span className="ats-field-l">Kalender</span><select className="ats-inp" value={st.sla.calendar} onChange={(e) => setSt({ sla: { ...st.sla, calendar: e.target.value } })}><option value="business">Arbetsdagar</option><option value="calendar">Kalenderdagar</option></select></label>
          </div>
          <div className="ats-tpl-two">
            <label className="ats-field"><span className="ats-field-l">Varna X dagar innan</span><input className="ats-inp" type="number" min="0" max="30" value={st.sla.warnDays} onChange={(e) => setSt({ sla: { ...st.sla, warnDays: Number(e.target.value) } })} /></label>
            <label className="ats-field"><span className="ats-field-l">Eskalera till</span><select className="ats-inp" value={st.sla.escalate} onChange={(e) => setSt({ sla: { ...st.sla, escalate: e.target.value } })}><option value="owner">Ansvarig</option><option value="manager">Rekryterande chef</option><option value="admin">Admin</option><option value="none">Ingen</option></select></label>
          </div>
        </>}

        <h3 className="ats-pb-h">Stegkrav</h3>
        {[["reason", "Anledning krävs"], ["comment", "Intern kommentar krävs"], ["assessment", "Bedömning (betyg) krävs"], ["interview", "Bokad intervju krävs"], ["cv", "CV måste finnas"], ["contact", "Giltig e-post måste finnas"], ["owner", "Ansvarig måste vara vald"]].map(([k, l]) =>
          <label key={k} className="ats-cb-check"><input type="checkbox" checked={!!st.req[k]} onChange={(e) => setSt({ req: { ...st.req, [k]: e.target.checked } })} /> {l}</label>)}
        <label className="ats-field"><span className="ats-field-l">Endast dessa roller får flytta hit</span><div className="ats-chipset">{Object.keys(ROLE_LABEL).map((r) => {
          const on = (st.req.roles || []).includes(r);
          return <button key={r} className={"ats-selchip" + (on ? " is-on" : "")} onClick={() => setSt({ req: { ...st.req, roles: on ? st.req.roles.filter((x) => x !== r) : [...(st.req.roles || []), r] } })}>{ROLE_LABEL[r]}</button>;
        })}</div>{(st.req.roles || []).length === 0 && <span className="ats-af-help">Tomt = alla med behörighet att fatta beslut.</span>}</label>

        <h3 className="ats-pb-h">Beteende</h3>
        <label className="ats-cb-check"><input type="checkbox" checked={st.allowBack} onChange={(e) => setSt({ allowBack: e.target.checked })} /> Kandidater får flyttas tillbaka härifrån</label>
        <label className="ats-cb-check"><input type="checkbox" checked={st.allowBulk} onChange={(e) => setSt({ allowBulk: e.target.checked })} /> Bulkflytt tillåten hit</label>
        <label className="ats-cb-check"><input type="checkbox" checked={st.confirm} onChange={(e) => setSt({ confirm: e.target.checked })} /> Kräv extra bekräftelse</label>
      </div>
    </aside>}

    {adding && <Modal title="Lägg till steg" onClose={() => setAdding(false)}><div className="ats-erase">
      <label className="ats-field"><span className="ats-field-l">Namn</span><input className="ats-inp" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Teknisk intervju" autoFocus /></label>
      <label className="ats-field"><span className="ats-field-l">Stegtyp</span><select className="ats-inp" value={newType} onChange={(e) => setNewType(e.target.value)}>{Object.entries(STAGE_TYPES).filter(([, v]) => !v.final).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
      <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setAdding(false)}>Avbryt</button>
        <button className="ats-btn-primary" disabled={!newName.trim()} onClick={() => { D({ type: "STAGE_ADD", jobId: job.id, name: newName.trim(), stageType: newType }); setNewName(""); setAdding(false); }}><Plus size={15} /> Lägg till</button></div>
    </div></Modal>}

    {archFor && <Modal title="Steget innehåller kandidater" onClose={() => setArchFor(null)}><div className="ats-erase">
      <p><b>{archFor.name}</b> innehåller <b>{countIn(archFor.id)} kandidater</b>. Du måste bestämma vart de ska flyttas — systemet lämnar aldrig kandidater i ett steg som inte går att tolka.</p>
      <label className="ats-field"><span className="ats-field-l">Flytta kandidaterna till</span><select className="ats-inp" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}><option value="">Välj steg…</option>{liveStages(pipe).filter((x) => x.id !== archFor.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setArchFor(null)}>Avbryt ändringen</button>
        <button className="ats-btn-primary" disabled={!moveTo} onClick={() => { D({ type: "STAGE_ARCHIVE", jobId: job.id, id: archFor.id, moveTo }); setArchFor(null); showToast({ kind: "ok", msg: "Steget arkiverades och kandidaterna flyttades" }); }}>Flytta och arkivera</button></div>
    </div></Modal>}

    {showVers && <Modal title="Pipelineversioner" onClose={() => setShowVers(false)} wide><div className="ats-erase">
      {(pipe.versions || []).length === 0 ? <div className="ats-col-empty" style={{ padding: 24 }}>Ingen version publicerad än.</div>
        : <div className="ats-sa-rows">{pipe.versions.map((v) => <div key={v.v} className="ats-sa-row is-card">
          <div className="ats-sa-main"><b>Version {v.v}</b><span>{v.stages.filter((x) => !x.archived).length} steg · {v.by}{v.note ? " · " + v.note : ""}</span></div>
          <span className="ats-sa-when">{new Date(v.at).toLocaleString("sv-SE").slice(0, 16)}</span>
          <button className="ats-ghost is-sm" onClick={() => { D({ type: "PIPE_RESTORE", jobId: job.id, v: v.v }); setShowVers(false); showToast({ kind: "ok", msg: "Återställd till v" + v.v + " — publicera för att spara" }); }}><RotateCcw size={13} /> Återställ</button>
        </div>)}</div>}
      <div className="ats-erase-note"><Info size={14} /> Historiska händelser behåller alltid det stegnamn som gällde när de inträffade — även om steget byter namn senare.</div>
    </div></Modal>}
  </div>;
}
/* ---- Poängförklaring: läsbar för en rekryterare, aldrig rå JSON ---- */
function ScoreExplain({ sc, compact }) {
  const [open, setOpen] = useState(compact ? [] : null);
  if (!sc) return <div className="ats-col-empty" style={{ padding: 24 }}>Ingen scoring beräknad än. Publicera en scoringprofil och kör beräkningen.</div>;
  const tone = sc.percent >= 75 ? "petrol" : sc.percent >= 50 ? "amber" : "brick";
  const gname = (id) => (sc.groups.find((g) => g.id === id) || {}).name || "Övrigt";
  const groups = sc.groups.filter((g) => g.n > 0);
  return <div className="ats-se">
    <div className="ats-se-top">
      <div className={"ats-se-score is-" + tone}><b>{sc.percent}%</b><span>{sc.raw} av {sc.maxApplicable} p</span></div>
      <div className="ats-se-meta">
        <div><span>Profil</span><b>{sc.profileName} · v{sc.version}</b></div>
        <div><span>Beräknad</span><b>{new Date(sc.at).toLocaleString("sv-SE").slice(0, 16)}</b></div>
        <div><span>Bedömd andel</span><b>{sc.assessedShare}%{sc.missingCount ? " · " + sc.missingCount + " saknas" : ""}</b></div>
      </div>
    </div>
    {sc.warnings.length > 0 && <div className="ats-se-warn"><AlertTriangle size={14} /><div>{sc.warnings.map((w, i) => <span key={i}>{w}</span>)}</div></div>}
    <div className="ats-se-groups">{groups.map((g) => {
      const rows = sc.criteria.filter((c) => c.groupId === g.id && c.applicable);
      const pct = g.pct == null ? 0 : Math.round(g.pct * 100);
      const isOpen = open === null || (Array.isArray(open) && open.includes(g.id));
      return <div key={g.id} className="ats-se-group">
        <button className="ats-se-gh" onClick={() => setOpen(Array.isArray(open) ? (isOpen ? open.filter((x) => x !== g.id) : [...open, g.id]) : [g.id])} aria-expanded={isOpen}>
          <b>{g.name}</b>
          <span className="ats-se-gbar"><i style={{ width: pct + "%" }} /></span>
          <em>{g.raw} / {g.max} p{g.weight ? " · vikt " + g.weight : ""}</em>
          <ChevronDown size={15} className={isOpen ? "is-open" : ""} />
        </button>
        {isOpen && <div className="ats-se-rows">{rows.map((c) => <div key={c.id} className={"ats-se-row" + (c.missing || c.pending ? " is-miss" : "") + (c.pts < 0 ? " is-neg" : "")}>
          <div className="ats-se-c"><b>{c.name}</b><span>{c.why}</span></div>
          <div className="ats-se-a">{c.answer != null && c.answer !== "" ? <em>{Array.isArray(c.answer) ? c.answer.join(", ") : String(c.answer)}</em> : <em className="ats-muted">—</em>}</div>
          <div className="ats-se-p"><b>{c.pts > 0 ? "+" : ""}{Math.round(c.pts * 10) / 10}</b><span>av {c.max}</span></div>
        </div>)}</div>}
      </div>;
    })}</div>
    {sc.criteria.filter((c) => !c.applicable).length > 0 && <div className="ats-se-na">
      <b>Gäller inte den här kandidaten</b>
      {sc.criteria.filter((c) => !c.applicable).map((c) => <div key={c.id}><span>{c.name}</span><em>{c.why}</em></div>)}
    </div>}
  </div>;
}

/* ---- Scoringvyn: profiler, byggare, versioner, förhandsvisning ---- */
function ScoringView({ state, D, me, job, cands, showToast }) {
  const [pid, setPid] = useState(null);
  const [selC, setSelC] = useState(null);
  const [tab, setTab] = useState("build");
  const [previewId, setPreviewId] = useState("");
  const [showVers, setShowVers] = useState(false);
  const [cmp, setCmp] = useState(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addSrc, setAddSrc] = useState({ groupId: "", source: "" });
  const canEdit = can(me.role, "edit") && job && !isReadonly(job);
  const canScore = can(me.role, "decide");

  useEffect(() => { if (job && !job.scoring) D({ type: "SCORING_INIT", jobId: job.id }); }, [job && job.id]);
  if (!job) return <div className="ats-view"><PageHeader title="Scoring" /><div className="ats-col-empty" style={{ padding: 40 }}>Välj en tjänst först.</div></div>;
  if (!job.scoring) return <div className="ats-view"><PageHeader title="Scoring" /><div className="ats-col-empty" style={{ padding: 40 }}>Förbereder scoringprofilen…</div></div>;

  const profiles = job.scoring.profiles;
  const p = profiles.find((x) => x.id === pid) || profiles.find((x) => x.primary) || profiles[0];
  const d = p.draft;
  const warns = profileWarnings(d, job);
  const errs = warns.filter((w) => w.kind === "err");
  const groups = [...(d.groups || [])].sort((a, b) => a.order - b.order);
  const crits = d.criteria || [];
  const cr = selC ? crits.find((c) => c.id === selC) : null;
  const fields = (job.criteria || []);
  const fieldOf = (id) => fields.find((f) => f.id === id);
  const totalMax = crits.filter((c) => c.active !== false).reduce((n, c) => n + maxPts(c), 0);
  const av = activeVersion(job);
  const dirty = !p.version || JSON.stringify({ g: d.groups, c: d.criteria, n: d.norm }) !== JSON.stringify((() => { const v = (p.versions || []).find((x) => x.v === p.version); return v ? { g: v.groups, c: v.criteria, n: v.norm } : {}; })());

  const setD = (patch) => D({ type: "SP_DRAFT", jobId: job.id, id: p.id, patch });
  const setCr = (patch) => D({ type: "SC_SET", jobId: job.id, profileId: p.id, id: cr.id, patch });
  const preview = previewId ? cands.find((c) => c.id === previewId) : null;
  const previewRes = preview ? runScoring({ ...d, norm: d.norm || p.norm }, preview, job) : null;

  const publish = () => {
    if (errs.length) { showToast({ kind: "warn", msg: "Kan inte publiceras: " + errs[0].msg }); return; }
    D({ type: "SP_PUBLISH", jobId: job.id, id: p.id });
    showToast({ kind: "ok", msg: "Scoringversion v" + (p.version + 1) + " publicerad" });
  };
  const recalc = () => {
    if (!av) { showToast({ kind: "warn", msg: "Publicera en primär profil först" }); return; }
    D({ type: "SCORE_RUN", jobId: job.id, reason: "manuell omberäkning" });
    showToast({ kind: "ok", msg: "Kandidaterna beräknades om mot v" + av.ver.v });
  };

  return <div className="ats-view">
    <PageHeader title="Scoring" meta={<><span>{job.title}</span><Dot /><span>{p.name}</span><Dot /><span className="ats-mono">{p.version ? "v" + p.version : "utkast"}</span>{dirty && p.version > 0 && <><Dot /><span className="ats-pipe-dirty">Opublicerade ändringar</span></>}</>}
      right={<>{canScore && av && <button className="ats-ghost is-sm" onClick={recalc}><RotateCw size={14} /> Beräkna om alla</button>}
        {canEdit && <button className="ats-btn-primary is-sm" disabled={errs.length > 0} onClick={publish} title={errs.length ? errs[0].msg : "Publicera"}><Rocket size={14} /> Publicera version</button>}</>} />

    <div className="ats-sv-profiles">
      {profiles.filter((x) => !x.archived).map((x) => <button key={x.id} className={"ats-sv-p" + (x.id === p.id ? " is-on" : "")} onClick={() => { setPid(x.id); setSelC(null); }}>
        <b>{x.name}</b>
        <span>{x.primary ? "Primär" : "Alternativ"}{x.version ? " · v" + x.version : " · utkast"}</span>
      </button>)}
      {canEdit && <button className="ats-sv-p is-add" onClick={() => setAdding(true)}><Plus size={16} /> Ny profil</button>}
    </div>

    <div className="ats-tabs">
      {[["build", "Byggare"], ["preview", "Förhandsvisning"], ["settings", "Profilinställningar"]].map(([id, l]) =>
        <button key={id} className={"ats-tab" + (tab === id ? " is-on" : "")} onClick={() => setTab(id)}>{l}{id === "build" && warns.length > 0 && <span className="ats-tab-n">{warns.length}</span>}</button>)}
    </div>

    {warns.length > 0 && tab === "build" && <div className="ats-sv-warns">{warns.map((w, i) =>
      <div key={i} className={"ats-sv-warn is-" + w.kind}>{w.kind === "err" ? <CircleAlert size={14} /> : <AlertTriangle size={14} />} {w.msg}</div>)}</div>}

    {tab === "build" && <div className="ats-sv">
      <div className="ats-sv-main">
        <div className="ats-sv-sum">
          <div><span>Maxpoäng</span><b>{Math.round(totalMax)}</b></div>
          <div><span>Kriterier</span><b>{crits.filter((c) => c.active !== false).length}</b></div>
          <div><span>Grupper</span><b>{groups.length}</b></div>
          <div><span>Normalisering</span><b>{NORM_METHODS[d.norm || p.norm]}</b></div>
        </div>
        {groups.map((g, gi) => {
          const rows = crits.filter((c) => c.groupId === g.id).sort((a, b) => a.order - b.order);
          const gmax = rows.filter((c) => c.active !== false).reduce((n, c) => n + maxPts(c), 0);
          return <div key={g.id} className="ats-panel ats-sv-group">
            <div className="ats-panel-h">
              <input className="ats-sv-gname" value={g.name} disabled={!canEdit} onChange={(e) => D({ type: "SG_SET", jobId: job.id, profileId: p.id, id: g.id, patch: { name: e.target.value } })} aria-label="Gruppnamn" />
              <div className="ats-sv-gm">
                <label className="ats-sv-w"><span>Vikt</span><input type="number" min="0" max="10" value={g.weight} disabled={!canEdit} onChange={(e) => D({ type: "SG_SET", jobId: job.id, profileId: p.id, id: g.id, patch: { weight: Number(e.target.value) } })} /></label>
                <span className="ats-sv-gmax">{Math.round(gmax)} p</span>
                {canEdit && <>
                  <button className="ats-ghost is-sm" disabled={gi === 0} onClick={() => D({ type: "SG_MOVE", jobId: job.id, profileId: p.id, id: g.id, dir: -1 })} aria-label="Flytta upp"><ArrowUp size={13} /></button>
                  <button className="ats-ghost is-sm" disabled={gi === groups.length - 1} onClick={() => D({ type: "SG_MOVE", jobId: job.id, profileId: p.id, id: g.id, dir: 1 })} aria-label="Flytta ner"><ArrowDown size={13} /></button>
                  <button className="ats-ghost is-sm ats-cal-cancel" disabled={groups.length < 2} onClick={() => D({ type: "SG_DEL", jobId: job.id, profileId: p.id, id: g.id })} aria-label="Ta bort grupp"><Trash2 size={13} /></button>
                </>}
              </div>
            </div>
            <div className="ats-sv-crits">
              {rows.map((c) => { const f = fieldOf(c.source); const broken = c.source !== "_cv" && c.model !== "manual" && !f;
                return <div key={c.id} className={"ats-sv-crit" + (selC === c.id ? " is-on" : "") + (c.active === false ? " is-off" : "") + (broken ? " is-broken" : "")}>
                  <button className="ats-sv-cn" onClick={() => setSelC(selC === c.id ? null : c.id)}>
                    <b>{c.name}</b>
                    <span>{SCORE_MODELS[c.model].label}{broken ? " · TRASIG DATAKÄLLA" : f ? " · " + f.label : ""}</span>
                  </button>
                  <span className="ats-sv-cw">{Math.round(maxPts(c))} p</span>
                  {canEdit && <div className="ats-sv-ca">
                    <button className="ats-ghost is-sm" onClick={() => D({ type: "SC_SET", jobId: job.id, profileId: p.id, id: c.id, patch: { active: c.active === false } })} aria-label={c.active === false ? "Aktivera" : "Inaktivera"}>{c.active === false ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                    <button className="ats-ghost is-sm" onClick={() => D({ type: "SC_DUP", jobId: job.id, profileId: p.id, id: c.id })} aria-label="Duplicera"><Copy size={13} /></button>
                    <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => { D({ type: "SC_DEL", jobId: job.id, profileId: p.id, id: c.id }); if (selC === c.id) setSelC(null); }} aria-label="Ta bort"><Trash2 size={13} /></button>
                  </div>}
                </div>; })}
              {rows.length === 0 && <div className="ats-kb-empty">Inga kriterier i gruppen.</div>}
              {canEdit && <button className="ats-ghost is-sm" onClick={() => setAddSrc({ groupId: g.id, source: "" })}><Plus size={13} /> Lägg till kriterium</button>}
            </div>
          </div>;
        })}
        {canEdit && <button className="ats-ghost" onClick={() => D({ type: "SG_ADD", jobId: job.id, profileId: p.id, name: "Ny grupp" })}><Plus size={15} /> Lägg till grupp</button>}
      </div>

      {cr && <aside className="ats-sv-side"><div className="ats-panel">
        <div className="ats-panel-h"><h2>{cr.name}</h2><button className="ats-ghost is-sm" onClick={() => setSelC(null)}><X size={15} /></button></div>
        <label className="ats-field"><span className="ats-field-l">Namn</span><input className="ats-inp" value={cr.name} disabled={!canEdit} onChange={(e) => setCr({ name: e.target.value })} /></label>
        <label className="ats-field"><span className="ats-field-l">Intern förklaring</span><textarea className="ats-inp" rows={2} value={cr.desc} disabled={!canEdit} onChange={(e) => setCr({ desc: e.target.value })} placeholder="Varför är detta relevant för rollen?" /></label>
        <label className="ats-field"><span className="ats-field-l">Datakälla</span>
          <select className="ats-inp" value={cr.source} disabled={!canEdit} onChange={(e) => setCr({ source: e.target.value })}>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.type})</option>)}
            <option value="_cv">CV är uppladdat</option>
          </select>
          {!fieldOf(cr.source) && cr.source !== "_cv" && <span className="ats-af-err"><CircleAlert size={13} /> Fältet finns inte längre i formuläret.</span>}
        </label>
        <label className="ats-field"><span className="ats-field-l">Poängmodell</span>
          <select className="ats-inp" value={cr.model} disabled={!canEdit} onChange={(e) => setCr({ model: e.target.value })}>{Object.entries(SCORE_MODELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <span className="ats-af-help">{SCORE_MODELS[cr.model].help}</span>
        </label>
        <div className="ats-tpl-two">
          <label className="ats-field"><span className="ats-field-l">Vikt (maxpoäng)</span><input className="ats-inp" type="number" min="0" max="100" value={cr.weight} disabled={!canEdit} onChange={(e) => setCr({ weight: Number(e.target.value) })} /></label>
          <label className="ats-field"><span className="ats-field-l">Riktning</span><select className="ats-inp" value={cr.dir} disabled={!canEdit} onChange={(e) => setCr({ dir: e.target.value })}>{Object.entries(SCORE_DIRS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        {cr.model === "linear" && <div className="ats-tpl-two">
          <label className="ats-field"><span className="ats-field-l">Målvärde</span><input className="ats-inp" type="number" value={cr.ideal ?? ""} disabled={!canEdit} onChange={(e) => setCr({ ideal: Number(e.target.value) })} /></label>
          <label className="ats-field"><span className="ats-field-l">Nollpunkt</span><input className="ats-inp" type="number" value={cr.floor ?? 0} disabled={!canEdit} onChange={(e) => setCr({ floor: Number(e.target.value) })} /></label>
        </div>}
        {cr.model === "band" && <div className="ats-tpl-two">
          <label className="ats-field"><span className="ats-field-l">Från</span><input className="ats-inp" type="number" value={cr.bandLo ?? ""} disabled={!canEdit} onChange={(e) => setCr({ bandLo: Number(e.target.value) })} /></label>
          <label className="ats-field"><span className="ats-field-l">Till</span><input className="ats-inp" type="number" value={cr.bandHi ?? ""} disabled={!canEdit} onChange={(e) => setCr({ bandHi: Number(e.target.value) })} /></label>
        </div>}
        {cr.model === "steps" && <div className="ats-field"><span className="ats-field-l">Trappsteg</span>
          <div className="ats-cb-list">{(cr.steps || []).map((st, i) => <div key={i} className="ats-cb-item">
            <input className="ats-inp" type="number" value={st.at} placeholder="Vid värde" disabled={!canEdit} onChange={(e) => { const n = [...cr.steps]; n[i] = { ...n[i], at: Number(e.target.value) }; setCr({ steps: n }); }} />
            <input className="ats-inp" type="number" value={st.pts} placeholder="Poäng" disabled={!canEdit} onChange={(e) => { const n = [...cr.steps]; n[i] = { ...n[i], pts: Number(e.target.value) }; setCr({ steps: n }); }} />
            <button className="ats-ghost is-sm" disabled={!canEdit} onClick={() => setCr({ steps: cr.steps.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>)}<button className="ats-ghost is-sm" disabled={!canEdit} onClick={() => setCr({ steps: [...(cr.steps || []), { at: 0, pts: 0 }] })}><Plus size={13} /> Lägg till steg</button></div>
        </div>}
        {cr.model === "perOption" && <div className="ats-field"><span className="ats-field-l">Poäng per alternativ</span>
          <div className="ats-cb-list">{(cr.options || []).map((o, i) => <div key={i} className="ats-cb-item">
            <input className="ats-inp" value={o.value} disabled={!canEdit} onChange={(e) => { const n = [...cr.options]; n[i] = { ...n[i], value: e.target.value }; setCr({ options: n }); }} />
            <input className="ats-inp" type="number" value={o.pts} disabled={!canEdit} onChange={(e) => { const n = [...cr.options]; n[i] = { ...n[i], pts: Number(e.target.value) }; setCr({ options: n }); }} />
            <button className="ats-ghost is-sm" disabled={!canEdit} onClick={() => setCr({ options: cr.options.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>)}<button className="ats-ghost is-sm" disabled={!canEdit} onClick={() => setCr({ options: [...(cr.options || []), { value: "", pts: 0 }] })}><Plus size={13} /> Lägg till</button></div>
        </div>}
        {cr.model === "match" && <label className="ats-field"><span className="ats-field-l">Förväntat värde</span><input className="ats-inp" value={cr.matchValue} disabled={!canEdit} onChange={(e) => setCr({ matchValue: e.target.value })} /></label>}
        <label className="ats-cb-check"><input type="checkbox" checked={!!cr.negative} disabled={!canEdit} onChange={(e) => setCr({ negative: e.target.checked })} /> Tillåt negativ poäng (avdrag)</label>
        <label className="ats-field"><span className="ats-field-l">Om svaret saknas</span><select className="ats-inp" value={cr.onMissing} disabled={!canEdit} onChange={(e) => setCr({ onMissing: e.target.value })}>{Object.entries(MISSING_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>

        <h3 className="ats-pb-h">Gäller bara när…</h3>
        <div className="ats-cb-list">
          {(cr.conditions.rules || []).map((r, i) => <div key={i} className="ats-sv-cond">
            <select className="ats-inp" value={r.field} disabled={!canEdit} onChange={(e) => { const n = [...cr.conditions.rules]; n[i] = { ...n[i], field: e.target.value }; setCr({ conditions: { ...cr.conditions, rules: n } }); }}>
              <option value="">Fält…</option>{fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            <select className="ats-inp" value={r.op} disabled={!canEdit} onChange={(e) => { const n = [...cr.conditions.rules]; n[i] = { ...n[i], op: e.target.value }; setCr({ conditions: { ...cr.conditions, rules: n } }); }}>
              {Object.entries(COND_OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input className="ats-inp" value={r.value || ""} disabled={!canEdit || ["empty", "notempty", "exists", "missing"].includes(r.op)} onChange={(e) => { const n = [...cr.conditions.rules]; n[i] = { ...n[i], value: e.target.value }; setCr({ conditions: { ...cr.conditions, rules: n } }); }} />
            <button className="ats-ghost is-sm" disabled={!canEdit} onClick={() => setCr({ conditions: { ...cr.conditions, rules: cr.conditions.rules.filter((_, j) => j !== i) } })}><Trash2 size={14} /></button>
          </div>)}
          {canEdit && <div className="ats-sv-condadd">
            <select className="ats-select is-sm" value={cr.conditions.mode} onChange={(e) => setCr({ conditions: { ...cr.conditions, mode: e.target.value } })}><option value="all">Alla villkor</option><option value="any">Något villkor</option></select>
            <button className="ats-ghost is-sm" onClick={() => setCr({ conditions: { ...cr.conditions, rules: [...(cr.conditions.rules || []), { field: fields[0] ? fields[0].id : "", op: "is", value: "" }] } })}><Plus size={13} /> Lägg till villkor</button>
          </div>}
          {(cr.conditions.rules || []).length === 0 && <span className="ats-af-help">Inga villkor — kriteriet gäller alla kandidater.</span>}
        </div>
      </div></aside>}
    </div>}

    {tab === "preview" && <div className="ats-sv-prev">
      <div className="ats-jfilters">
        <select className="ats-select is-sm" value={previewId} onChange={(e) => setPreviewId(e.target.value)} aria-label="Kandidat">
          <option value="">Välj kandidat att testa mot…</option>{cands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="ats-af-help">Förhandsvisningen räknar mot <b>utkastet</b> — riktig kandidatdata ändras aldrig.</span>
      </div>
      {previewRes
        ? <ScoreExplain sc={{ ...previewRes, profileName: p.name + " (utkast)", version: p.version + 1, at: Date.now() }} />
        : <div className="ats-col-empty" style={{ padding: 40 }}>{cands.length === 0 ? "Inga kandidater att testa mot än." : "Välj en kandidat för att se hur profilen skulle bedöma hen."}</div>}
    </div>}

    {tab === "settings" && <div className="ats-panel ats-sv-set">
      <label className="ats-field"><span className="ats-field-l">Profilnamn</span><input className="ats-inp" value={p.name} disabled={!canEdit} onChange={(e) => D({ type: "SP_SET", jobId: job.id, id: p.id, patch: { name: e.target.value } })} /></label>
      <label className="ats-field"><span className="ats-field-l">Intern beskrivning</span><textarea className="ats-inp" rows={2} value={p.desc} disabled={!canEdit} onChange={(e) => D({ type: "SP_SET", jobId: job.id, id: p.id, patch: { desc: e.target.value } })} /></label>
      <label className="ats-field"><span className="ats-field-l">Normalisering</span>
        <select className="ats-inp" value={d.norm || p.norm} disabled={!canEdit} onChange={(e) => setD({ norm: e.target.value })}>{Object.entries(NORM_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <span className="ats-af-help">{(d.norm || p.norm) === "weighted" ? "Varje grupp normaliseras för sig och vägs samman efter gruppvikt." : "All poäng summeras och delas med maximal tillämplig poäng."}</span>
      </label>
      <label className="ats-cb-check"><input type="checkbox" checked={!!p.primary} disabled={!canEdit} onChange={() => D({ type: "SP_SET", jobId: job.id, id: p.id, patch: { primary: true }, note: "Primär profil" })} /> Primär profil — den som används för kandidaternas poäng</label>
      <label className="ats-cb-check"><input type="checkbox" checked={p.active !== false} disabled={!canEdit} onChange={(e) => D({ type: "SP_SET", jobId: job.id, id: p.id, patch: { active: e.target.checked } })} /> Aktiv</label>
      <div className="ats-cb-brandacts">
        <button className="ats-ghost is-sm" onClick={() => setShowVers(true)}><History size={14} /> Versioner ({(p.versions || []).length})</button>
        {canEdit && <button className="ats-ghost is-sm" onClick={() => { D({ type: "SP_ADD", jobId: job.id, name: p.name + " (kopia)", from: p.id }); showToast({ kind: "ok", msg: "Profil duplicerad" }); }}><Copy size={14} /> Duplicera</button>}
        {canEdit && profiles.filter((x) => !x.archived).length > 1 && <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => { D({ type: "SP_DEL", jobId: job.id, id: p.id }); setPid(null); }}><Trash2 size={14} /> Ta bort</button>}
      </div>
    </div>}

    {adding && <Modal title="Ny scoringprofil" onClose={() => setAdding(false)}><div className="ats-erase">
      <label className="ats-field"><span className="ats-field-l">Namn</span><input className="ats-inp" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Seniorprofil" autoFocus /></label>
      <p>Profilen skapas som ett fristående utkast från formulärets fält. Den påverkar inga befintliga kandidatresultat.</p>
      <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setAdding(false)}>Avbryt</button>
        <button className="ats-ghost" disabled={!newName.trim()} onClick={() => { D({ type: "SP_ADD", jobId: job.id, name: newName.trim(), from: p.id }); setNewName(""); setAdding(false); }}>Kopiera {p.name}</button>
        <button className="ats-btn-primary" disabled={!newName.trim()} onClick={() => { D({ type: "SP_ADD", jobId: job.id, name: newName.trim() }); setNewName(""); setAdding(false); }}><Plus size={15} /> Skapa från formuläret</button></div>
    </div></Modal>}

    {addSrc.groupId && <Modal title="Lägg till kriterium" onClose={() => setAddSrc({ groupId: "", source: "" })}><div className="ats-erase">
      <p>Välj vilket formulärfält som ska bedömas. Poängmodellen föreslås automatiskt utifrån fälttypen.</p>
      <div className="ats-mv-stages">{fields.filter((f) => !crits.some((c) => c.source === f.id)).map((f) => <button key={f.id} className="ats-mv-stage" onClick={() => { D({ type: "SC_ADD", jobId: job.id, profileId: p.id, groupId: addSrc.groupId, source: f.id }); setAddSrc({ groupId: "", source: "" }); }}>
        <span className="ats-mv-dot" style={{ background: "var(--petrol)" }} /><div><b>{f.label}</b><span>{f.type} → {SCORE_MODELS[MODEL_FOR_FIELD[f.type] || "fixed"].label}</span></div>
      </button>)}</div>
      {fields.filter((f) => !crits.some((c) => c.source === f.id)).length === 0 && <div className="ats-col-empty" style={{ padding: 24 }}>Alla formulärfält används redan.</div>}
    </div></Modal>}

    {showVers && <Modal title="Scoringversioner" onClose={() => { setShowVers(false); setCmp(null); }} wide><div className="ats-erase">
      {(p.versions || []).length === 0 ? <div className="ats-col-empty" style={{ padding: 24 }}>Ingen version publicerad än.</div>
        : <div className="ats-sa-rows">{p.versions.map((v) => <div key={v.v} className="ats-sa-row is-card">
          <div className="ats-sa-main"><b>Version {v.v}{v.v === p.version ? " · aktiv" : ""}</b>
            <span>{v.criteria.filter((c) => c.active !== false).length} kriterier · {v.groups.length} grupper · {NORM_METHODS[v.norm]} · {v.by}{v.note ? " · " + v.note : ""}</span></div>
          <span className="ats-sa-when">{new Date(v.at).toLocaleString("sv-SE").slice(0, 16)}</span>
          <button className="ats-ghost is-sm" onClick={() => setCmp(cmp === v.v ? null : v.v)}><GitCompare size={13} /> Jämför</button>
          {canEdit && <button className="ats-ghost is-sm" onClick={() => { D({ type: "SP_RESTORE", jobId: job.id, id: p.id, v: v.v }); setShowVers(false); showToast({ kind: "ok", msg: "Utkast skapat från v" + v.v + " — publicera för att aktivera" }); }}><RotateCcw size={13} /> Skapa utkast</button>}
        </div>)}</div>}
      {cmp && (() => {
        const v = p.versions.find((x) => x.v === cmp);
        const nowIds = new Set(d.criteria.map((c) => c.id)), oldIds = new Set(v.criteria.map((c) => c.id));
        const added = d.criteria.filter((c) => !oldIds.has(c.id));
        const removed = v.criteria.filter((c) => !nowIds.has(c.id));
        const changed = d.criteria.filter((c) => { const o = v.criteria.find((x) => x.id === c.id); return o && JSON.stringify(o) !== JSON.stringify(c); });
        return <div className="ats-sv-diff">
          <h4>Skillnad mot utkastet</h4>
          {added.length === 0 && removed.length === 0 && changed.length === 0 && <p>Ingen skillnad.</p>}
          {added.map((c) => <div key={c.id} className="is-add">+ Tillagt: {c.name}</div>)}
          {removed.map((c) => <div key={c.id} className="is-del">− Borttaget: {c.name}</div>)}
          {changed.map((c) => { const o = v.criteria.find((x) => x.id === c.id); return <div key={c.id} className="is-chg">~ Ändrat: {c.name}{o.weight !== c.weight ? " · vikt " + o.weight + " → " + c.weight : ""}{o.model !== c.model ? " · modell " + SCORE_MODELS[o.model].label + " → " + SCORE_MODELS[c.model].label : ""}</div>; })}
        </div>;
      })()}
      <div className="ats-erase-note"><Info size={14} /> Publicerade versioner är oföränderliga. Kandidaternas historiska resultat pekar alltid på den version som faktiskt användes.</div>
    </div></Modal>}
  </div>;
}
/* ===================== KALENDER ===================== */
function CalendarView({ state, D, me, showToast, setDetailId }) {
  const [jobFilter, setJobFilter] = useState("all");
  const [rebook, setRebook] = useState(null);
  const [cancelC, setCancelC] = useState(null);
  const [reminded, setReminded] = useState({});
  useEffect(() => { if (!sbEnabled || !SB_ORG) return; let alive = true; (async () => { const rows = await sbGet("reminders_sent?org_id=eq." + SB_ORG + "&select=candidate_id"); if (alive && Array.isArray(rows)) { const m = {}; rows.forEach((r) => { m[r.candidate_id] = true; }); setReminded(m); } })(); return () => { alive = false; }; }, []);
  const canDecide = can(me.role, "decide");
  const now = Date.now();
  const jobOf = (c) => state.jobs.find((j) => j.id === c.jobId);
  const all = state.candidates
    .filter(ivActive)
    .filter((c) => jobFilter === "all" || c.jobId === jobFilter)
    .map((c) => ({ c, at: new Date(c.interview.at).getTime() }))
    .sort((a, b) => a.at - b.at);
  const unbooked = state.candidates.filter((c) => c.status === "interview" && !ivActive(c)).filter((c) => jobFilter === "all" || c.jobId === jobFilter);
  const upcoming = all.filter((x) => ivEnd(x.c.interview) >= now);
  const past = all.filter((x) => ivEnd(x.c.interview) < now).reverse();
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
  const todayK = dayKey(now), tomorrowK = dayKey(now + 864e5);
  const dayLabel = (k, t) => { const d = new Date(t); return k === todayK ? "Idag" : k === tomorrowK ? "I morgon" : DAY_NAMES[d.getDay()].charAt(0).toUpperCase() + DAY_NAMES[d.getDay()].slice(1) + " " + pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1); };
  const groups = [];
  upcoming.forEach((x) => { const k = dayKey(x.at); const g = groups.find((y) => y.k === k); if (g) g.items.push(x); else groups.push({ k, at: x.at, items: [x] }); });
  const conflictIds = new Set();
  upcoming.forEach((a, i) => upcoming.slice(i + 1).forEach((b) => { if (ivOverlap(a.c.interview, b.c.interview)) { conflictIds.add(a.c.id); conflictIds.add(b.c.id); } }));
  const nameOf = (id) => (state.team.find((m) => m.id === id) || {}).name || null;
  const doCancel = (c) => { setCancelC(null); D({ type: "CANCEL_INTERVIEW", id: c.id }); showToast({ kind: "ok", msg: "Intervjun avbokad · avbokning skickas till " + c.name }); };
  const doRebook = (iv) => { const c = rebook; setRebook(null); D({ type: "SET_INTERVIEW", id: c.id, interview: iv }); showToast({ kind: "ok", msg: "Ombokad till " + fmtInterview(iv.at) + " · ny inbjudan skickas" }); };
  const Row = ({ x, isPast }) => {
    const c = x.c, iv = c.interview, m = INTERVIEW_MODES[iv.mode] || INTERVIEW_MODES.video, I = m.icon;
    const who = nameOf(iv.interviewerId);
    return <div className={"ats-cal-row" + (isPast ? " is-past" : "")}>
      <div className="ats-cal-time"><b>{pad2(new Date(iv.at).getHours())}.{pad2(new Date(iv.at).getMinutes())}</b><small>{iv.duration || 45} min</small></div>
      <div className="ats-cal-main">
        <div className="ats-cal-top"><button className="ats-cal-name" onClick={() => setDetailId(c.id)}>{c.name}</button>{conflictIds.has(c.id) && !isPast && <span className="ats-cal-conflict"><AlertTriangle size={11} /> Krock</span>}{reminded[c.id] && <span className="ats-cal-remind"><Bell size={11} /> Påminnelse skickad</span>}</div>
        <div className="ats-cal-meta">{(jobOf(c) || {}).title || "—"} · {c.email}</div>
        <div className="ats-cal-mode"><I size={13} /> {m.label}{iv.location ? " · " + iv.location : ""}{who ? " · " + who : ""}</div>
      </div>
      {canDecide && !isPast && <div className="ats-cal-acts">
        <button className="ats-ghost is-sm" onClick={() => setRebook(c)}><RotateCw size={13} /> Boka om</button>
        <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => setCancelC(c)}><CalendarX size={13} /> Avboka</button>
      </div>}
    </div>;
  };
  return (
    <div className="ats-view">
      <PageHeader title="Kalender" meta={<><span>{upcoming.length} kommande</span>{unbooked.length > 0 && <><Dot /><span className="ats-cal-warn">{unbooked.length} att boka</span></>}{conflictIds.size > 0 && <><Dot /><span className="ats-cal-warn">{conflictIds.size} krockar</span></>}</>} right={<select className="ats-select is-sm" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}><option value="all">Alla tjänster</option>{state.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>} />
      {unbooked.length > 0 && <div className="ats-cal-day">
        <div className="ats-cal-dayh is-todo"><CircleAlert size={14} /> Att boka<span>{unbooked.length} i intervjusteget utan tid</span></div>
        <div className="ats-cal-rows">{unbooked.map((c) => <div key={c.id} className="ats-cal-row is-todo">
          <div className="ats-cal-time"><b>—</b><small>ingen tid</small></div>
          <div className="ats-cal-main"><div className="ats-cal-top"><button className="ats-cal-name" onClick={() => setDetailId(c.id)}>{c.name}</button></div><div className="ats-cal-meta">{(jobOf(c) || {}).title || "—"} · {c.email}</div></div>
          {canDecide && <div className="ats-cal-acts"><button className="ats-btn-primary is-sm" onClick={() => setRebook(c)}><CalendarCheck size={13} /> Boka tid</button></div>}
        </div>)}</div>
      </div>}
      {upcoming.length === 0 && past.length === 0 && unbooked.length === 0
        ? <div className="ats-col-empty" style={{ padding: 44 }}>Inga bokade intervjuer. Boka en genom att swipa upp i kön eller från kandidatens panel.</div>
        : <>
          {groups.map((g) => <div key={g.k} className="ats-cal-day">
            <div className="ats-cal-dayh"><CalendarClock size={14} /> {dayLabel(g.k, g.at)}<span>{g.items.length} intervju{g.items.length === 1 ? "" : "er"}</span></div>
            <div className="ats-cal-rows">{g.items.map((x) => <Row key={x.c.id} x={x} />)}</div>
          </div>)}
          {past.length > 0 && <div className="ats-cal-day">
            <div className="ats-cal-dayh is-muted"><History size={14} /> Genomförda<span>{past.length}</span></div>
            <div className="ats-cal-rows">{past.slice(0, 20).map((x) => <Row key={x.c.id} x={x} isPast />)}</div>
          </div>}
        </>}
      {rebook && <InterviewModal cand={rebook} job={jobOf(rebook)} state={state} onClose={() => setRebook(null)} onConfirm={doRebook} />}
      {cancelC && <Modal title="Avboka intervjun?" onClose={() => setCancelC(null)}><div className="ats-erase">
        <p>Intervjun med <b>{cancelC.name}</b> ({fmtInterview(cancelC.interview.at)}) avbokas. Kandidaten får ett mejl och kalenderinbjudan tas bort automatiskt ur hens kalender.</p>
        <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setCancelC(null)}>Behåll</button><button className="ats-btn-danger" onClick={() => doCancel(cancelC)}><CalendarX size={15} /> Avboka och meddela</button></div>
      </div></Modal>}
    </div>
  );
}
/* ===================== TJANSTER ===================== */
function JobsView({ state, D, me, showToast, setView, allScored, setNewJob }) {
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ status: "", tag: "", owner: "", loc: "", dep: "", prio: "" });
  const [sort, setSort] = useState("updated");
  const [mode, setMode] = useState("list");
  const [sel, setSel] = useState([]);
  const [bulk, setBulk] = useState(null);
  const [bulkRes, setBulkRes] = useState(null);
  const [dup, setDup] = useState(null);
  const [dupOpts, setDupOpts] = useState({ annons: true, form: true, scoring: true, knockout: true, automations: true, team: true, tags: true });
  const [statusFor, setStatusFor] = useState(null);
  const [reason, setReason] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [settingsFor, setSettingsFor] = useState(null);
  const [actFor, setActFor] = useState(null);
  const [actFilter, setActFilter] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [viewName, setViewName] = useState("");
  const [tagPanel, setTagPanel] = useState(false);
  const [newTag, setNewTag] = useState("");

  const canEdit = can(me.role, "edit");
  const canPub = can(me.role, "publish");
  const canDel = can(me.role, "delete_job");
  const canTags = can(me.role, "tags");
  const now = Date.now();
  const byId = useMemo(() => { const m = {}; allScored.forEach(({ job, list }) => { m[job.id] = list; }); return m; }, [allScored]);
  const nameOf = (id) => (state.team.find((m) => m.id === id) || {}).name || null;
  const tagOf = (id) => state.tags.find((t) => t.id === id);

  const jobs = state.jobs.map(migrateJob).map((j) => {
    const list = byId[j.id] || [];
    return { ...j, _n: list.length, _new: list.filter((c) => c.status === "new").length,
      _avg: list.length ? Math.round(list.reduce((x, c) => x + (c.total || 0), 0) / list.length) : 0,
      _hired: list.filter((c) => c.status === "hired").length,
      _days: j.createdAt ? Math.max(0, Math.round((now - j.createdAt) / 864e5)) : null,
      _stage: STAGES.reduce((m, st) => ({ ...m, [st.id]: list.filter((c) => c.status === st.id).length }), {}) };
  });
  const inArchive = (j) => j.status === "archived";
  const pool = jobs.filter((j) => (tab === "archive" ? inArchive(j) : !inArchive(j)));
  const uniq = (k) => [...new Set(jobs.map((j) => j[k]).filter(Boolean))].sort();
  const shown = pool
    .filter((j) => !q.trim() || (j.title + " " + j.ref + " " + (j.team || "")).toLowerCase().includes(q.toLowerCase()))
    .filter((j) => !f.status || j.status === f.status)
    .filter((j) => !f.tag || j.tags.includes(f.tag))
    .filter((j) => !f.owner || (f.owner === "none" ? !j.ownerId : j.ownerId === f.owner))
    .filter((j) => !f.loc || (j.annons && j.annons.location) === f.loc)
    .filter((j) => !f.dep || j.team === f.dep)
    .filter((j) => !f.prio || j.priority === f.prio)
    .sort((a, b) => sort === "updated" ? (b.updatedAt || 0) - (a.updatedAt || 0) : sort === "new" ? b._new - a._new : sort === "title" ? a.title.localeCompare(b.title, "sv") : (b._n - a._n));
  const activeF = Object.entries(f).filter(([, v]) => v);
  const clearF = () => { setF({ status: "", tag: "", owner: "", loc: "", dep: "", prio: "" }); setQ(""); };

  const toggle = (id) => setSel((s2) => s2.includes(id) ? s2.filter((x) => x !== id) : [...s2, id]);
  const allSel = shown.length > 0 && shown.every((j) => sel.includes(j.id));

  const runBulk = (op, value) => {
    const targets = jobs.filter((j) => sel.includes(j.id));
    const blocked = targets.filter((j) => (isReadonly(j) && op !== "restore") || (op === "status" && !canMove(j.status, value)));
    const okIds = targets.filter((j) => !blocked.includes(j)).map((j) => j.id);
    if (okIds.length) D({ type: "JOB_BULK", ids: okIds, op, value });
    setBulk(null);
    setBulkRes({ ok: okIds.length, blocked: blocked.map((j) => ({ title: j.title, why: isReadonly(j) ? "Arkiverad — återställ först" : "Övergången " + JOB_LIFE[j.status].label + " → " + (JOB_LIFE[value] || {}).label + " är inte tillåten" })) });
    setSel([]);
  };
  const doStatus = (j, st) => {
    if (JOB_LIFE[st].reason && !reason.trim()) return;
    D({ type: "JOB_STATUS", id: j.id, status: st, reason: reason.trim() });
    setStatusFor(null); setReason(""); setNextStatus("");
    showToast({ kind: "ok", msg: j.title + " · " + JOB_LIFE[st].label });
  };
  const doDup = () => { D({ type: "DUPLICATE_JOB", jobId: dup.id, opts: dupOpts }); setDup(null); showToast({ kind: "ok", msg: "Duplicerad som utkast" }); };
  const openJob = (j, dest) => { D({ type: "SET_ACTIVE_JOB", id: j.id }); setView(dest); };
  const exportSel = () => {
    const rows = [["Referens", "Titel", "Status", "Avdelning", "Plats", "Ansvarig", "Kandidater", "Nya", "Snitt", "Anställda"]];
    jobs.filter((j) => sel.includes(j.id)).forEach((j) => rows.push([j.ref, j.title, JOB_LIFE[j.status].label, j.team || "", (j.annons && j.annons.location) || "", nameOf(j.ownerId) || "", j._n, j._new, j._avg + "%", j._hired]));
    downloadCSV(rows, "tjanster.csv");
    showToast({ kind: "ok", msg: sel.length + " tjänster exporterade" });
  };

  const Badge = ({ j }) => <span className={"ats-jobbadge is-" + JOB_LIFE[j.status].tone}>{JOB_LIFE[j.status].label}</span>;
  const Tags = ({ j }) => <>{j.tags.map((id) => { const t = tagOf(id); return t ? <span key={id} className="ats-jtag" style={{ background: t.color + "1f", color: t.color }}>{t.name}</span> : null; })}</>;
  const Sel = ({ v, on, opts, ph }) => <select className="ats-select is-sm" value={v} onChange={(e) => on(e.target.value)} aria-label={ph}><option value="">{ph}</option>{opts.map((o) => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}</select>;

  const Menu2 = ({ j }) => <Menu align="right" trigger={<button className="ats-ghost is-sm ats-jobcard-more" aria-label="Fler åtgärder"><Settings2 size={15} /></button>}>
    <button className="ats-menu-item" onClick={() => setSettingsFor(j)}><SlidersHorizontal size={14} /> Inställningar</button>
    <button className="ats-menu-item" onClick={() => setActFor(j)}><History size={14} /> Aktivitet</button>
    <div className="ats-menu-sep" />
    {canPub && <div className="ats-menu-label">Byt status</div>}
    {canPub && JOB_LIFE[j.status].next.map((st) => <button key={st} className="ats-menu-item" onClick={() => { setStatusFor(j); setNextStatus(st); setReason(""); }}>{JOB_LIFE[st].label}</button>)}
    <div className="ats-menu-sep" />
    {canEdit && <button className="ats-menu-item" onClick={() => { setDup(j); setDupOpts({ annons: true, form: true, scoring: true, knockout: true, automations: true, team: true, tags: true }); }}><Copy size={14} /> Duplicera</button>}
    {canDel && <button className="ats-menu-item is-danger" onClick={() => setConfirmDel(j)}><Trash2 size={14} /> Radera</button>}
  </Menu>;

  return (
    <div className="ats-view">
      <PageHeader title="Tjänster" meta={<><span>{jobs.filter((j) => !inArchive(j)).length} aktiva</span><Dot /><span>{jobs.filter(inArchive).length} arkiverade</span></>}
        right={<>{canTags && <button className="ats-ghost is-sm" onClick={() => setTagPanel(true)}><Tag size={15} /> Taggar</button>}
          {canEdit && <button className="ats-btn-primary is-sm" onClick={() => setNewJob(true)}><Plus size={15} /> Ny tjänst</button>}</>} />

      <div className="ats-tabs">
        <button className={"ats-tab" + (tab === "active" ? " is-on" : "")} onClick={() => { setTab("active"); setSel([]); }}>Aktiva<span className="ats-tab-n">{jobs.filter((j) => !inArchive(j)).length}</span></button>
        <button className={"ats-tab" + (tab === "archive" ? " is-on" : "")} onClick={() => { setTab("archive"); setSel([]); }}>Arkiv<span className="ats-tab-n">{jobs.filter(inArchive).length}</span></button>
      </div>

      <div className="ats-jfilters">
        <div className="ats-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök titel eller referens…" /></div>
        <Sel v={f.status} on={(v) => setF({ ...f, status: v })} opts={Object.keys(JOB_LIFE).filter((k) => tab === "archive" ? k === "archived" : k !== "archived").map((k) => ({ v: k, l: JOB_LIFE[k].label }))} ph="Alla statusar" />
        {state.tags.length > 0 && <Sel v={f.tag} on={(v) => setF({ ...f, tag: v })} opts={state.tags.filter((t) => !t.archived).map((t) => ({ v: t.id, l: t.name }))} ph="Alla taggar" />}
        <Sel v={f.owner} on={(v) => setF({ ...f, owner: v })} opts={[{ v: "none", l: "Utan ansvarig" }, ...state.team.map((m) => ({ v: m.id, l: m.name }))]} ph="Alla ansvariga" />
        {uniq("team").length > 0 && <Sel v={f.dep} on={(v) => setF({ ...f, dep: v })} opts={uniq("team")} ph="Alla avdelningar" />}
        <Sel v={f.prio} on={(v) => setF({ ...f, prio: v })} opts={Object.entries(JOB_PRIO).map(([v, l]) => ({ v, l }))} ph="Alla prioriteter" />
        <select className="ats-select is-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortering">
          <option value="updated">Senast ändrad</option><option value="new">Flest i kö</option><option value="cands">Flest kandidater</option><option value="title">Titel</option>
        </select>
        <div className="ats-jmode">
          <button className={mode === "list" ? "is-on" : ""} onClick={() => setMode("list")} aria-label="Listvy"><Layers size={14} /></button>
          <button className={mode === "table" ? "is-on" : ""} onClick={() => setMode("table")} aria-label="Tabellvy"><ListChecks size={14} /></button>
        </div>
      </div>

      {(activeF.length > 0 || q.trim()) && <div className="ats-cs-meta">
        <span>{shown.length} träffar</span>
        <div className="ats-cs-active">
          {q.trim() && <button className="ats-cs-tag" onClick={() => setQ("")}>{q} <X size={13} /></button>}
          {activeF.map(([k, v]) => <button key={k} className="ats-cs-tag" onClick={() => setF({ ...f, [k]: "" })}>{k === "tag" ? (tagOf(v) || {}).name : k === "owner" ? (v === "none" ? "Utan ansvarig" : nameOf(v)) : k === "status" ? JOB_LIFE[v].label : k === "prio" ? JOB_PRIO[v] : v} <X size={13} /></button>)}
          <button className="ats-cs-clear" onClick={clearF}>Rensa alla</button>
          {canEdit && <div className="ats-jsave"><input className="ats-inp" value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="Spara som vy…" />
            <button className="ats-ghost is-sm" disabled={!viewName.trim()} onClick={() => { D({ type: "VIEW_ADD", name: viewName.trim(), f: { ...f, q } }); setViewName(""); showToast({ kind: "ok", msg: "Vy sparad" }); }}><Plus size={13} /></button></div>}
        </div>
      </div>}

      {state.jobViews.length > 0 && <div className="ats-jviews">{state.jobViews.map((v) => <span key={v.id} className="ats-jview">
        <button onClick={() => { setF({ status: v.f.status || "", tag: v.f.tag || "", owner: v.f.owner || "", loc: v.f.loc || "", dep: v.f.dep || "", prio: v.f.prio || "" }); setQ(v.f.q || ""); }}>{v.name}</button>
        {canEdit && <button className="ats-jview-x" onClick={() => D({ type: "VIEW_DEL", id: v.id })} aria-label="Ta bort vy"><X size={12} /></button>}
      </span>)}</div>}

      {sel.length > 0 && <div className="ats-bulkbar">
        <b>{sel.length} valda</b>
        {canPub && <button className="ats-ghost is-sm" onClick={() => setBulk("status")}><RotateCw size={13} /> Byt status</button>}
        {canEdit && <button className="ats-ghost is-sm" onClick={() => setBulk("owner")}><UserCheck size={13} /> Ansvarig</button>}
        {canTags && state.tags.length > 0 && <button className="ats-ghost is-sm" onClick={() => setBulk("tag_add")}><Tag size={13} /> Tagga</button>}
        {tab === "archive" && canEdit && <button className="ats-ghost is-sm" onClick={() => runBulk("restore")}><RotateCcw size={13} /> Återställ</button>}
        <button className="ats-ghost is-sm" onClick={exportSel}><Download size={13} /> Exportera</button>
        <button className="ats-ghost is-sm" onClick={() => setSel([])}>Avmarkera</button>
      </div>}

      {shown.length === 0
        ? <div className="ats-col-empty" style={{ padding: 44 }}>{tab === "archive" ? "Inga arkiverade tjänster." : (activeF.length || q.trim()) ? "Ingen tjänst matchar filtren." : canEdit ? "Inga tjänster än. Skapa din första med Ny tjänst." : "Inga tjänster."}
          {(activeF.length > 0 || q.trim()) && <div style={{ marginTop: 16 }}><button className="ats-ghost" onClick={clearF}>Rensa filter</button></div>}</div>
        : mode === "table"
          ? <div className="ats-jtablewrap"><table className="ats-jtable">
            <thead><tr>
              <th><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : shown.map((j) => j.id))} aria-label="Välj alla" /></th>
              <th>Referens</th><th>Titel</th><th>Status</th><th>Avdelning</th><th>Ansvarig</th><th>Kandidater</th><th>I kö</th><th>Snitt</th><th /></tr></thead>
            <tbody>{shown.map((j) => <tr key={j.id} className={sel.includes(j.id) ? "is-sel" : ""}>
              <td><input type="checkbox" checked={sel.includes(j.id)} onChange={() => toggle(j.id)} aria-label={"Välj " + j.title} /></td>
              <td className="ats-mono">{j.ref}</td>
              <td><button className="ats-jobcard-title" onClick={() => openJob(j, "queue")}>{j.title}</button>{j.internal && <span className="ats-jobbadge is-blue">Intern</span>}</td>
              <td><Badge j={j} /></td><td>{j.team || "—"}</td><td>{nameOf(j.ownerId) || <span className="ats-muted">Ingen</span>}</td>
              <td>{j._n}</td><td>{j._new}</td><td>{j._avg}%</td>
              <td><Menu2 j={j} /></td>
            </tr>)}</tbody>
          </table></div>
          : <div className="ats-joblist">{shown.map((j) => <div key={j.id} className={"ats-jobcard is-" + j.status + (sel.includes(j.id) ? " is-sel" : "")}>
            {canEdit && <input className="ats-jcheck" type="checkbox" checked={sel.includes(j.id)} onChange={() => toggle(j.id)} aria-label={"Välj " + j.title} />}
            <div className="ats-jobcard-main">
              <div className="ats-jobcard-top">
                <button className="ats-jobcard-title" onClick={() => openJob(j, "queue")}>{j.title}</button>
                <Badge j={j} />
                {j.internal && <span className="ats-jobbadge is-blue">Intern</span>}
                {j.priority !== "normal" && <span className={"ats-jobbadge is-" + (j.priority === "urgent" ? "brick" : j.priority === "high" ? "amber" : "muted")}>{JOB_PRIO[j.priority]}</span>}
                <Tags j={j} />
              </div>
              <div className="ats-jobcard-meta">{j.ref} · {j.team || "Ingen avdelning"}{(j.annons && j.annons.location) ? " · " + j.annons.location : ""} · {nameOf(j.ownerId) || "Ingen ansvarig"}{j._days != null ? " · " + (j._days === 0 ? "skapad idag" : j._days + " d") : ""}</div>
              <div className="ats-jobcard-stats"><span><b>{j._n}</b> ansökningar</span><span><b>{j._new}</b> i kö</span><span><b>{j._avg}%</b> snitt</span>{j._hired > 0 && <span className="is-hired"><BadgeCheck size={12} /> {j._hired} anställd</span>}</div>
            </div>
            <div className="ats-jobcard-acts">
              <button className="ats-ghost is-sm" onClick={() => openJob(j, "queue")}><Layers size={13} /> Kö{j._new > 0 && <span className="ats-jobcard-qn">{j._new}</span>}</button>
              <button className="ats-ghost is-sm" onClick={() => openJob(j, "form")}><Blocks size={13} /> Formulär</button>
              <Menu2 j={j} />
            </div>
          </div>)}</div>}

      {/* Statusövergång */}
      {statusFor && nextStatus && <Modal title={"Byt status till " + JOB_LIFE[nextStatus].label} onClose={() => { setStatusFor(null); setNextStatus(""); }}><div className="ats-erase">
        <p><b>{statusFor.title}</b> går från <b>{JOB_LIFE[statusFor.status].label}</b> till <b>{JOB_LIFE[nextStatus].label}</b>.</p>
        <div className="ats-erase-note"><Info size={14} /> {JOB_LIFE[nextStatus].public ? "Tjänsten blir synlig publikt" : "Tjänsten syns inte publikt"} · {JOB_LIFE[nextStatus].accepts ? "tar emot nya ansökningar" : "tar inte emot nya ansökningar"}{JOB_LIFE[nextStatus].readonly ? " · skrivskyddad tills den återställs" : ""}.</div>
        {JOB_LIFE[nextStatus].reason && <label className="ats-field"><span className="ats-field-l">Anledning (krävs)</span><input className="ats-inp" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Varför avbryts rekryteringen?" /></label>}
        <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => { setStatusFor(null); setNextStatus(""); }}>Avbryt</button>
          <button className="ats-btn-primary" disabled={JOB_LIFE[nextStatus].reason && !reason.trim()} onClick={() => doStatus(statusFor, nextStatus)}>Bekräfta</button></div>
      </div></Modal>}

      {/* Duplicering */}
      {dup && <Modal title="Duplicera tjänsten" onClose={() => setDup(null)}><div className="ats-erase">
        <p>Kopian skapas som <b>utkast</b>. Kandidater, intervjuer, meddelanden, historik, länkar och statistik kopieras aldrig.</p>
        <div className="ats-dupgrid">{[["annons", "Jobbannons"], ["form", "Ansökningsformulär"], ["scoring", "Scoringprofiler"], ["knockout", "Knockoutregler"], ["automations", "Automatiseringar"], ["team", "Rekryteringsteam"], ["tags", "Taggar"]].map(([k, l]) =>
          <label key={k} className="ats-cb-check"><input type="checkbox" checked={dupOpts[k]} onChange={(e) => setDupOpts({ ...dupOpts, [k]: e.target.checked })} /> {l}</label>)}</div>
        <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setDup(null)}>Avbryt</button><button className="ats-btn-primary" onClick={doDup}><Copy size={15} /> Duplicera</button></div>
      </div></Modal>}

      {/* Bulk */}
      {bulk && <Modal title="Bulkåtgärd" onClose={() => setBulk(null)}><div className="ats-erase">
        <p>{sel.length} tjänster är valda.</p>
        {bulk === "status" && <div className="ats-bulkopts">{Object.entries(JOB_LIFE).map(([k, v]) => <button key={k} className="ats-ghost" onClick={() => runBulk("status", k)}>{v.label}</button>)}</div>}
        {bulk === "owner" && <div className="ats-bulkopts">{state.team.map((m) => <button key={m.id} className="ats-ghost" onClick={() => runBulk("owner", m.id)}>{m.name}</button>)}<button className="ats-ghost" onClick={() => runBulk("owner", "")}>Ingen ansvarig</button></div>}
        {bulk === "tag_add" && <div className="ats-bulkopts">{state.tags.filter((t) => !t.archived).map((t) => <button key={t.id} className="ats-ghost" onClick={() => runBulk("tag_add", t.id)}>{t.name}</button>)}</div>}
      </div></Modal>}
      {bulkRes && <Modal title="Resultat" onClose={() => setBulkRes(null)}><div className="ats-erase">
        <p><b>{bulkRes.ok}</b> tjänster uppdaterades.</p>
        {bulkRes.blocked.length > 0 && <><div className="ats-erase-note"><AlertTriangle size={14} /> {bulkRes.blocked.length} kunde inte behandlas:</div>
          <ul className="ats-blocked">{bulkRes.blocked.map((b, i) => <li key={i}><b>{b.title}</b><span>{b.why}</span></li>)}</ul></>}
        <div className="ats-erase-actions"><button className="ats-btn-primary" onClick={() => setBulkRes(null)}>Stäng</button></div>
      </div></Modal>}

      {/* Inställningar */}
      {settingsFor && <Modal title={"Inställningar — " + settingsFor.title} onClose={() => setSettingsFor(null)} wide>
        <JobSettings j={jobs.find((x) => x.id === settingsFor.id) || settingsFor} state={state} D={D} canEdit={canEdit && !isReadonly(settingsFor)} onClose={() => setSettingsFor(null)} />
      </Modal>}

      {/* Aktivitet */}
      {actFor && <Modal title={"Aktivitet — " + actFor.title} onClose={() => setActFor(null)} wide><div className="ats-jact">
        <div className="ats-jact-f">
          <select className="ats-select is-sm" value={actFilter} onChange={(e) => setActFilter(e.target.value)}><option value="">Alla händelser</option>{Object.entries(JOB_ACT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        {(() => { const acts = ((jobs.find((x) => x.id === actFor.id) || actFor).activity || []).filter((a) => !actFilter || a.kind === actFilter);
          return acts.length === 0 ? <div className="ats-col-empty" style={{ padding: 30 }}>Ingen aktivitet registrerad.</div>
            : <div className="ats-jact-list">{acts.map((a) => <div key={a.id} className="ats-jact-i">
              <span className="ats-jact-k">{JOB_ACT[a.kind] || a.kind}</span>
              <div><b>{a.note || "—"}</b><span>{a.by} · {timeAgo(a.at)}</span></div>
            </div>)}</div>; })()}
      </div></Modal>}

      {/* Taggar */}
      {tagPanel && <Modal title="Taggar" onClose={() => setTagPanel(false)}><div className="ats-erase">
        <p>Taggar används för att gruppera och filtrera tjänster. De är interna och syns aldrig publikt.</p>
        <div className="ats-tagadd">
          <input className="ats-inp" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Ny tagg…" onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { D({ type: "TAG_ADD", name: newTag }); setNewTag(""); } }} />
          <button className="ats-btn-primary is-sm" disabled={!newTag.trim() || state.tags.some((t) => normTag(t.name) === normTag(newTag))} onClick={() => { D({ type: "TAG_ADD", name: newTag }); setNewTag(""); }}><Plus size={14} /></button>
        </div>
        {newTag.trim() && state.tags.some((t) => normTag(t.name) === normTag(newTag)) && <span className="ats-af-err"><CircleAlert size={13} /> Taggen finns redan.</span>}
        <div className="ats-taglist">{state.tags.map((t) => <div key={t.id} className="ats-tagrow">
          <span className="ats-jtag" style={{ background: t.color + "1f", color: t.color }}>{t.name}</span>
          <div className="ats-tagcolors">{TAG_COLORS.map((c) => <button key={c} className={"ats-tagcolor" + (t.color === c ? " is-on" : "")} style={{ background: c }} onClick={() => D({ type: "TAG_SET", id: t.id, patch: { color: c } })} aria-label={"Färg " + c} />)}</div>
          <span className="ats-muted">{jobs.filter((j) => j.tags.includes(t.id)).length} tjänster</span>
          <button className="ats-ghost is-sm ats-cal-cancel" onClick={() => D({ type: "TAG_DEL", id: t.id })} aria-label="Ta bort tagg"><Trash2 size={13} /></button>
        </div>)}</div>
        {state.tags.length === 0 && <div className="ats-col-empty" style={{ padding: 24 }}>Inga taggar än.</div>}
      </div></Modal>}

      {confirmDel && <Modal title="Radera tjänsten permanent?" onClose={() => setConfirmDel(null)}><div className="ats-erase">
        <p><b>{confirmDel.title}</b> och alla dess kandidater, ansökningar och bilagor raderas permanent från både appen och molnet. Detta går inte att ångra.</p>
        <div className="ats-erase-note"><ShieldCheck size={14} /> Uppfyller rätt att bli glömd (GDPR) — all kandidatdata för tjänsten tas bort.</div>
        <div className="ats-erase-actions"><button className="ats-ghost" onClick={() => setConfirmDel(null)}>Avbryt</button><button className="ats-btn-danger" onClick={async () => { const j = confirmDel; setConfirmDel(null); await deleteJobFull(j, state.candidates, D); showToast({ kind: "ok", msg: "Tjänsten raderades" }); }}><Trash2 size={15} /> Radera permanent</button></div>
      </div></Modal>}
    </div>
  );
}

function JobSettings({ j, state, D, canEdit, onClose }) {
  const set = (patch, kind) => D({ type: "JOB_PATCH", id: j.id, patch, kind: kind || "edited" });
  const F = ({ l, k, ph, type }) => <label className="ats-field"><span className="ats-field-l">{l}</span><input className="ats-inp" type={type || "text"} value={j[k] || ""} disabled={!canEdit} onChange={(e) => set({ [k]: e.target.value })} placeholder={ph} /></label>;
  const A = ({ l, k, ph }) => <label className="ats-field"><span className="ats-field-l">{l}</span><input className="ats-inp" value={(j.annons || {})[k] || ""} disabled={!canEdit} onChange={(e) => set({ annons: { ...j.annons, [k]: e.target.value } }, "annons")} placeholder={ph} /></label>;
  return <div className="ats-jset">
    {!canEdit && <div className="ats-erase-note"><Lock size={14} /> {isReadonly(j) ? "Arkiverade tjänster är skrivskyddade. Återställ tjänsten för att kunna ändra." : "Du har inte behörighet att ändra tjänsten."}</div>}
    <h3>Grunduppgifter</h3>
    <div className="ats-tpl-two"><F l="Intern titel" k="title" /><F l="Publik titel" k="publicTitle" ph="Visas i annonsen" /></div>
    <div className="ats-tpl-two"><F l="Referensnummer" k="ref" /><label className="ats-field"><span className="ats-field-l">Prioritet</span><select className="ats-inp" value={j.priority} disabled={!canEdit} onChange={(e) => set({ priority: e.target.value })}>{Object.entries(JOB_PRIO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></div>
    <div className="ats-tpl-two"><F l="Avdelning" k="team" ph="Sälj" /><F l="Team" k="unit" ph="Nykund" /></div>
    <h3>Anställningsvillkor</h3>
    <div className="ats-tpl-two"><A l="Plats" k="location" ph="Växjö" /><A l="Arbetsform" k="workmode" ph="Hybrid" /></div>
    <div className="ats-tpl-two"><A l="Anställningsform" k="employment" ph="Tillsvidare" /><F l="Omfattning" k="extent" ph="Heltid" /></div>
    <div className="ats-tpl-two"><A l="Lön" k="salary" ph="Enligt överenskommelse" /><A l="Startdatum" k="start" ph="Enligt överenskommelse" /></div>
    <div className="ats-tpl-two"><A l="Sista ansökningsdag" k="deadline" ph="2026-08-31" /><F l="Publik jobbkategori" k="category" ph="Försäljning" /></div>
    <h3>Rekryteringsteam</h3>
    <div className="ats-tpl-two">
      <label className="ats-field"><span className="ats-field-l">Ansvarig rekryterare</span><select className="ats-inp" value={j.ownerId || ""} disabled={!canEdit} onChange={(e) => set({ ownerId: e.target.value || null }, "owner")}><option value="">Ingen</option>{state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label className="ats-field"><span className="ats-field-l">Rekryterande chef</span><select className="ats-inp" value={j.managerId || ""} disabled={!canEdit} onChange={(e) => set({ managerId: e.target.value || null }, "owner")}><option value="">Ingen</option>{state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    </div>
    <label className="ats-field"><span className="ats-field-l">Rekryteringsteam</span><div className="ats-chipset">{state.team.map((m) => {
      const on = (j.teamIds || []).includes(m.id);
      return <button key={m.id} className={"ats-selchip" + (on ? " is-on" : "")} disabled={!canEdit} onClick={() => set({ teamIds: on ? j.teamIds.filter((x) => x !== m.id) : [...(j.teamIds || []), m.id] }, "owner")}>{m.name}</button>;
    })}</div></label>
    <h3>Taggar och synlighet</h3>
    {state.tags.length > 0 && <label className="ats-field"><span className="ats-field-l">Interna taggar</span><div className="ats-chipset">{state.tags.filter((t) => !t.archived).map((t) => {
      const on = j.tags.includes(t.id);
      return <button key={t.id} className={"ats-selchip" + (on ? " is-on" : "")} disabled={!canEdit} onClick={() => set({ tags: on ? j.tags.filter((x) => x !== t.id) : [...j.tags, t.id] }, "tags")}>{t.name}</button>;
    })}</div></label>}
    <label className="ats-cb-check"><input type="checkbox" checked={!!j.internal} disabled={!canEdit} onChange={(e) => set({ internal: e.target.checked })} /> Intern rekrytering — tjänsten publiceras aldrig publikt och nås inte via länk</label>
    {j.internal && <div className="ats-erase-note"><ShieldAlert size={14} /> Interna tjänster laddas aldrig upp till den publika databasen. Även den som känner till adressen kan inte nå dem.</div>}
    <div className="ats-erase-actions"><button className="ats-btn-primary" onClick={onClose}>Klar</button></div>
  </div>;
}

/* ===================== OVERSIKT ===================== */
function DashboardView({ allScored, state, D, cands, job, setView, setDetailId }) {
  const now = Date.now();
  const qualified = cands.filter((c) => !c.knockout && c.total >= 55).length;
  const ko = cands.filter((c) => c.knockout).length;
  const avg = cands.length ? Math.round(cands.reduce((s, c) => s + c.total, 0) / cands.length) : 0;
  const waiting = cands.filter((c) => c.status === "new" && now - c.appliedAt > 24 * 3600e3).length;
  const queue = cands.filter((c) => c.status === "new");
  const best = [...queue].filter((c) => !c.knockout).sort((a, b) => b.total - a.total)[0];
  const shortlisted = cands.filter((c) => c.status === "shortlist" || c.status === "interview").length;
  const kpis = [
    { label: "Kvalificerade", value: qualified, icon: Check, tone: "green" },
    { label: "Diskvalificerade", value: ko, icon: ShieldAlert, tone: "brick" },
    { label: "Snittmatchning", value: avg + "%", icon: Gauge, tone: "petrol" },
    { label: "Väntar > 24h", value: waiting, icon: Clock, tone: waiting ? "amber" : "petrol" },
  ];
  return (
    <div className="ats-view">
      <PageHeader title="Översikt" meta={<><span>{state.org.companyName}</span><Dot /><span>{state.jobs.length} tjänster</span></>} right={<button className="ats-ghost is-accent" onClick={() => setView("queue")}><Layers size={15} /> Till kön</button>} />
      <div className="ats-stats">{kpis.map((k) => <div key={k.label} className="ats-stat"><span className={"ats-stat-ic is-" + k.tone}><k.icon size={16} /></span><div><div className="ats-stat-v">{k.value}</div><div className="ats-stat-l">{k.label}</div></div></div>)}</div>
      <div className="ats-grid-2">
        <div className="ats-hero"><div className="ats-hero-l"><span className="ats-eyebrow">Att gora nu</span><div className="ats-hero-big">{queue.length}</div><p>{queue.length ? `väntar på beslut i ${job.title}. Swipa så skickas rätt mejl automatiskt.` : "Kön är tom just nu."}</p><button className="ats-hero-cta" onClick={() => setView("queue")} disabled={!queue.length}>Fortsatt i kön <ArrowRight size={16} /></button></div>
          <div className="ats-hero-r">{best ? <><span className="ats-hero-tag"><Flame size={12} /> Bast i kön</span><button className="ats-hero-best" onClick={() => setDetailId(best.id)}><div className="ats-avatar">{initials(best.name)}</div><div><b>{best.name}</b><span>{best.total}% matchning</span></div></button><div className="ats-hero-score">{shortlisted} i shortlist/intervju</div></> : <span className="ats-hero-tag">Ingen i kön</span>}</div></div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Portfölj</h2><span className="ats-summono">alla tjänster</span></div>
          {allScored.map(({ job: j, list }) => { const q = list.filter((c) => c.status === "new").length; const b = [...list].filter((c) => c.status === "new" && !c.knockout).sort((a, b) => b.total - a.total)[0]; return <button key={j.id} className={"ats-portrow" + (j.id === state.activeJobId ? " is-active" : "")} onClick={() => { D({ type: "SET_ACTIVE_JOB", id: j.id }); setView("queue"); }}><div><b>{j.title}</b><span>{j.team}</span></div><div className="ats-portrow-r"><span className="ats-portrow-q">{q} i ko</span>{b && <span className="ats-portrow-b">{b.name.split(" ")[0]} {b.total}%</span>}</div></button>; })}
        </div>
      </div>
      <div className="ats-panel"><div className="ats-panel-h"><h2>Snabbstatus · {job.title}</h2><button className="ats-linkbtn" onClick={() => setView("stats")}>Statistik <ChevronRight size={14} /></button></div>
        <div className="ats-quickgrid">
          <div className="ats-quick"><span className="ats-quick-v">{job.stats.submitted}/{job.stats.started}</span><span className="ats-quick-l">Skickade / påbörjade</span></div>
          <div className="ats-quick"><span className="ats-quick-v">{Math.round((job.stats.submitted / Math.max(1, job.stats.started)) * 100)}%</span><span className="ats-quick-l">Completion rate</span></div>
          <div className="ats-quick"><span className="ats-quick-v">{cands.filter((c) => c.missing.length).length}</span><span className="ats-quick-l">Ofullständiga</span></div>
          <div className="ats-quick"><span className="ats-quick-v">{cands.filter((c) => c.status === "hired").length}</span><span className="ats-quick-l">Anställda</span></div>
        </div>
      </div>
    </div>
  );
}

/* ===================== KANDIDATKORT ===================== */
function flagsOf(c) {
  const green = [], red = [];
  (c.tags || []).forEach((t) => green.push(t));
  c.parts.filter((p) => p.kind === "scored").forEach((p) => { if (p.frac >= 0.8) green.push("Stark: " + p.label.toLowerCase()); else if (p.frac <= 0.34) red.push("Svag: " + p.label.toLowerCase()); });
  if (c.answers?.availability === "Omgående") green.push("Kan börja omgående");
  c.knockoutReasons.forEach((r) => red.unshift(r));
  if (c.belowThreshold) red.push("Under tröskeln");
  return { green: green.slice(0, 3), red: red.slice(0, 3) };
}
function recommendation(c) {
  if (c.knockout) return { action: "Avslag", tone: "brick", icon: "ShieldAlert", why: "Uppfyller inte obligatoriska krav" };
  if (c.missing && c.missing.length > 0) return { action: "Begär komplettering", tone: "amber", icon: "Info", why: "Saknar: " + c.missing.slice(0, 2).join(", ") };
  if (c.total >= 75) return { action: "Boka intervju", tone: "petrol", icon: "CalendarCheck", why: "Stark matchning · " + c.total + "%" };
  if (c.total >= 55) return { action: "Shortlist", tone: "green", icon: "ThumbsUp", why: "God matchning · " + c.total + "%" };
  if (c.total < 42) return { action: "Reservlista", tone: "amber", icon: "PauseCircle", why: "Låg matchning · " + c.total + "%" };
  return { action: "Granska närmare", tone: "blue", icon: "Eye", why: "Mittemellan · " + c.total + "%" };
}
function CardFace({ c, onStar, onOpen, showActions }) {
  const musts = c.parts.filter((p) => p.kind === "must");
  const scored = c.parts.filter((p) => p.kind === "scored").sort((a, b) => b.earned - a.earned).slice(0, 3);
  const { green, red } = flagsOf(c);
  const last = (c.timeline || [])[0];
  return (
    <div className="ats-face">
      <div className="ats-face-top"><div className="ats-face-id"><div className="ats-avatar">{initials(c.name)}</div><div className="ats-face-idtxt"><div className="ats-name">{c.name}{c.starred && <Star size={13} className="ats-starred" fill="currentColor" />}</div><div className="ats-face-mail"><Mail size={11} /> {c.email}</div></div></div><ScoreDial value={c.total} knockout={c.knockout} size={70} /></div>
      <div className="ats-face-statusrow"><span className={"ats-statuspill is-" + c.status}>{statusLabel(c.status)}</span><span className="ats-face-src">{c.source} · {timeAgo(c.appliedAt)}</span></div>
      {(() => { const r = recommendation(c); const RIc = ICONS[r.icon] || Sparkles; return <div className={"ats-reco tone-" + r.tone}><span className="ats-reco-ic"><RIc size={16} /></span><div className="ats-reco-txt"><span className="ats-reco-lbl">Rekommenderad åtgärd</span><b>{r.action}</b></div><span className="ats-reco-why">{r.why}</span></div>; })()}
      {c.knockout && <div className="ats-ko"><ShieldAlert size={14} /> Diskvalificerad — {c.knockoutReasons.join(", ").toLowerCase()}</div>}
      {musts.length > 0 && <div className="ats-musts">{musts.map((m) => { const Icon = ICONS[m.icon] || ShieldCheck; return <span key={m.id} className={"ats-must" + (m.ok ? " is-ok" : " is-no")}><Icon size={12} /> {m.label} {m.ok ? "OK" : "saknas"}</span>; })}</div>}
      <div className="ats-flagcols">
        <div className="ats-flagcol"><div className="ats-flagcol-h is-green"><Check size={12} /> Green flags</div>{green.length ? green.map((g, i) => <span key={i} className="ats-flag is-green">{g}</span>) : <span className="ats-flag-none">—</span>}</div>
        <div className="ats-flagcol"><div className="ats-flagcol-h is-red"><AlertTriangle size={12} /> Red flags</div>{red.length ? red.map((g, i) => <span key={i} className="ats-flag is-red">{g}</span>) : <span className="ats-flag-none">Inga</span>}</div>
      </div>
      <div className="ats-break"><div className="ats-break-h"><span>Viktigaste krav</span><span className="ats-break-max">bidrag</span></div>
        {scored.map((p) => { const Icon = ICONS[p.icon] || Award; return <div key={p.id} className="ats-break-row"><span className="ats-break-ic"><Icon size={13} /></span><div className="ats-break-main"><div className="ats-break-label"><span>{p.label}</span><span className="ats-break-detail">{p.detail}</span></div><div className="ats-break-bar"><div className={"ats-break-bar-fill" + (p.frac >= 0.66 ? " is-strong" : p.frac <= 0.34 ? " is-weak" : "")} style={{ width: Math.round(p.frac * 100) + "%" }} /></div></div><span className="ats-break-pts">+{Math.round(p.earned)}</span></div>; })}
      </div>
      {c.missing?.length > 0 && <div className="ats-face-missing"><MissingChips items={c.missing} /></div>}
      <div className="ats-face-foot"><div className="ats-face-foot-l">{last && <span className="ats-face-last"><Activity size={11} /> {TL_LABEL[last.kind] || last.kind} · {timeAgo(last.at)}</span>}<VoteSummary reviews={c.reviews} /></div><div className="ats-face-foot-r">{onStar && <button className={"ats-iconbtn" + (c.starred ? " is-on" : "")} onClick={(e) => { e.stopPropagation(); onStar(); }} title="Stjärnmarkera"><Star size={14} fill={c.starred ? "currentColor" : "none"} /></button>}{onOpen && <button className="ats-openbtn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>Öppna kandidat <ChevronRight size={13} /></button>}</div></div>
    </div>
  );
}

/* ===================== KO (swipe) ===================== */
function QueueView({ cands, D, me, job, state, showToast, setReasonFor, setDetailId }) {
  const [sort, setSort] = useState("score"); const [hideKO, setHideKO] = useState(false); const [query, setQuery] = useState("");
  const [drag, setDrag] = useState({ dx: 0, dy: 0, active: false }); const [exit, setExit] = useState(null); const [last, setLast] = useState(null);
  const [rejectId, setRejectId] = useState(null); const [interviewId, setInterviewId] = useState(null);
  const allowed = can(me.role, "decide"); const startRef = useRef(null);
  const deck = useMemo(() => { let d = cands.filter((c) => c.status === "new"); if (query.trim()) d = d.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())); if (hideKO) d = d.filter((c) => !c.knockout); d.sort((a, b) => sort === "score" ? (a.knockout !== b.knockout ? (a.knockout ? 1 : -1) : b.total - a.total) : b.appliedAt - a.appliedAt); return d; }, [cands, sort, hideKO, query]);
  const reviewed = cands.filter((c) => c.status !== "new").length, total = cands.length; const top = deck[0];
  const DIRS = { right: { status: "shortlist", label: "Shortlist", toast: "intressemejl" }, up: { status: "interview", label: "Intervju", toast: "intervjumejl" }, down: { status: "reserve", label: "Reservlista", toast: "reservmejl" }, left: { status: "reject", label: "Avslag", toast: "avslagsmejl" } };

  const runExit = useCallback((dir, extra, cand) => {
    const d = DIRS[dir]; setExit({ dir });
    setTimeout(() => { D({ type: "DECIDE", id: cand.id, status: d.status, ...(extra || {}) }); setExit(null); setDrag({ dx: 0, dy: 0, active: false }); setLast({ id: cand.id, name: cand.name, email: cand.email }); showToast({ kind: cand.email ? "ok" : "warn", msg: cand.email ? `${d.label} · ${d.toast} köat` : `${d.label} · mejl EJ köat (saknar e-post)` }); }, 300);
  }, [D, showToast]);
  const commit = useCallback((dir) => {
    if (!top || exit || !allowed) return;
    if (dir === "left") { setRejectId(top.id); return; }
    if (dir === "up") { setInterviewId(top.id); return; }
    runExit(dir, null, top);
  }, [top, exit, allowed, runExit]);
  useEffect(() => { const onKey = (e) => { if (e.key === "ArrowRight") commit("right"); else if (e.key === "ArrowLeft") commit("left"); else if (e.key === "ArrowUp") commit("up"); else if (e.key === "ArrowDown") commit("down"); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [commit]);
  const onDown = (e) => { if (exit || !allowed) return; startRef.current = { x: e.clientX, y: e.clientY }; setDrag({ dx: 0, dy: 0, active: true }); e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (!drag.active || !startRef.current) return; setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y, active: true }); };
  const onUp = () => { if (!drag.active) return; const { dx, dy } = drag; if (Math.abs(dx) > Math.abs(dy)) { if (dx > 120) commit("right"); else if (dx < -120) commit("left"); else setDrag({ dx: 0, dy: 0, active: false }); } else { if (dy < -110) commit("up"); else if (dy > 110) commit("down"); else setDrag({ dx: 0, dy: 0, active: false }); } startRef.current = null; };

  const header = <PageHeader title="Kö" meta={<><JobSwitch state={state} D={D} /><Dot /><span>{deck.length} väntar</span></>} right={<div className="ats-queue-filters"><div className="ats-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök…" /></div><button className={"ats-chip" + (sort === "score" ? " is-on" : "")} onClick={() => setSort("score")}>Bast</button><button className={"ats-chip" + (sort === "new" ? " is-on" : "")} onClick={() => setSort("new")}>Senaste</button><button className={"ats-chip" + (hideKO ? " is-on" : "")} onClick={() => setHideKO((v) => !v)}>Dolj diskade</button></div>} />;

  if (!top) return <div className="ats-view">{header}<div className="ats-empty"><div className="ats-empty-badge"><Check size={22} /></div><h3>Kön är tömd</h3><p>Alla {total} ansökningar är genomgångna. Nya kandidater dyker upp här direkt när de skickar formuläret.</p></div></div>;
  const dir = Math.abs(drag.dx) > Math.abs(drag.dy) ? (drag.dx > 60 ? "right" : drag.dx < -60 ? "left" : null) : (drag.dy < -60 ? "up" : drag.dy > 60 ? "down" : null);
  let cardStyle;
  if (exit) { const tx = exit.dir === "right" ? 620 : exit.dir === "left" ? -620 : 0; const ty = exit.dir === "up" ? -640 : exit.dir === "down" ? 640 : 0; const rot = exit.dir === "right" ? 16 : exit.dir === "left" ? -16 : 0; cardStyle = { transform: `translate(${tx}px,${ty}px) rotate(${rot}deg)`, opacity: 0, transition: "transform .3s cubic-bezier(.4,0,.2,1), opacity .3s" }; }
  else cardStyle = { transform: `translate(${drag.dx}px,${drag.dy}px) rotate(${drag.dx * 0.045}deg)`, transition: drag.active ? "none" : "transform .35s cubic-bezier(.4,0,.2,1)" };

  return (
    <div className="ats-view ats-queue">
      {header}
      {!allowed && <div className="ats-rolebar"><AlertTriangle size={14} /> Du är {ROLE_LABEL[me.role].toLowerCase()} och kan bladdra men inte fatta beslut.</div>}
      <div className="ats-progress"><div className="ats-progress-track"><div className="ats-progress-fill" style={{ width: `${(reviewed / Math.max(1, total)) * 100}%` }} /></div><span className="ats-progress-txt">{reviewed} av {total} genomgångna</span></div>
      <div className="ats-deck">
        {deck.slice(1, 3).reverse().map((c, i, arr) => { const depth = arr.length - i; return <div key={c.id} className="ats-card is-behind" style={{ transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.035})`, zIndex: 1 }}><CardFace c={c} /></div>; })}
        <div className="ats-card is-top" style={{ ...cardStyle, zIndex: 5 }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>{dir && !exit && <div className={"ats-stamp is-" + dir}>{DIRS[dir].label}</div>}<CardFace c={top} onStar={() => D({ type: "STAR", id: top.id })} onOpen={() => setDetailId(top.id)} /></div>
      </div>
      <div className="ats-actions"><button className="ats-act is-reject" disabled={!allowed} onClick={() => commit("left")} title="Avslå (vänster)"><X size={20} /></button><button className="ats-act is-reserve" disabled={!allowed} onClick={() => commit("down")} title="Reserv (ner)"><PauseCircle size={18} /></button><button className="ats-act is-interview" disabled={!allowed} onClick={() => commit("up")} title="Intervju (upp)"><CalendarCheck size={18} /></button><button className="ats-act is-yes" disabled={!allowed} onClick={() => commit("right")} title="Shortlist (höger)"><Check size={22} /></button></div>
      <p className="ats-hint"><ArrowRight size={12} /> shortlist · <span className="ats-hint-up">upp</span> intervju · <span className="ats-hint-dn">ner</span> reserv · <ArrowLeftIcon /> avslag — rätt mejl skickas automatiskt</p>
      {rejectId && <ReasonModal onClose={() => setRejectId(null)} onPick={(reason) => { const c = cands.find((x) => x.id === rejectId); setRejectId(null); if (c) runExit("left", { reason }, c); }} />}
      {interviewId && <InterviewModal cand={cands.find((x) => x.id === interviewId)} job={job} state={state} onClose={() => setInterviewId(null)} onConfirm={(iv) => { const c = cands.find((x) => x.id === interviewId); setInterviewId(null); if (c) runExit("up", { interviewTime: fmtInterview(iv.at), interview: { ...iv, seq: 0, cancelled: false } }, c); }} />}
    </div>
  );
}
function ArrowLeftIcon() { return <ChevronLeft size={12} style={{ display: "inline", verticalAlign: "-2px" }} />; }
function InterviewModal({ cand, job, state, onClose, onConfirm }) {
  const prev = cand && cand.interview && !cand.interview.cancelled ? cand.interview : null;
  const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const init = () => { if (prev && prev.at) return isoLocal(new Date(prev.at)); const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(10, 0, 0, 0); return isoLocal(d); };
  const [dt, setDt] = useState(init);
  const [duration, setDuration] = useState(prev ? prev.duration || 45 : 45);
  const [mode, setMode] = useState(prev ? prev.mode || "video" : "video");
  const [location, setLocation] = useState(prev ? prev.location || "" : "");
  const [interviewerId, setInterviewerId] = useState(prev ? prev.interviewerId || "" : "");
  const preset = (days, hour) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); setDt(isoLocal(d)); };
  const at = dt ? new Date(dt).toISOString() : null;
  const past = at && new Date(at).getTime() < Date.now();
  const cfg = INTERVIEW_MODES[mode];
  const needsLoc = mode !== "phone";
  const conflicts = !at ? [] : state.candidates.filter((c) => c.id !== cand.id && ivActive(c) && ivOverlap({ at, duration }, c.interview));
  const valid = !!at && !past && duration >= 15 && duration <= 240 && (!needsLoc || location.trim().length > 2);
  const submit = () => { if (!valid) return; onConfirm({ at, duration: Number(duration), mode, location: location.trim(), interviewerId: interviewerId || null }); };
  return <Modal title={prev ? "Boka om intervju" : "Boka intervjutid"} onClose={onClose}>
    <div className="ats-intv">
      <p className="ats-intv-sub">Tiden skickas till <b>{cand?.name}</b> med en kalenderinbjudan (.ics) som läggs direkt i kandidatens kalender.</p>
      {!prev && <div className="ats-intv-presets">{[[1, 10, "I morgon 10.00"], [2, 14, "Om 2 dagar 14.00"], [3, 9, "Om 3 dagar 09.00"]].map(([d, h, l]) => <button key={l} className="ats-chip" onClick={() => preset(d, h)}>{l}</button>)}</div>}
      <div className="ats-tpl-two">
        <label className="ats-field"><span className="ats-field-l">Datum och tid</span><input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} /></label>
        <label className="ats-field"><span className="ats-field-l">Längd (minuter)</span><input type="number" min="15" max="240" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
      </div>
      <div className="ats-field"><span className="ats-field-l">Form</span><div className="ats-intv-modes">{Object.entries(INTERVIEW_MODES).map(([k, m]) => { const I = m.icon; return <button key={k} className={"ats-intv-mode" + (mode === k ? " is-on" : "")} onClick={() => setMode(k)}><I size={15} /> {m.label}</button>; })}</div></div>
      <label className="ats-field"><span className="ats-field-l">{cfg.locLabel}</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={cfg.ph} /></label>
      <label className="ats-field"><span className="ats-field-l">Intervjuare</span><select value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}><option value="">Ej tilldelad</option>{state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      {past && <div className="ats-intv-warn is-err"><CircleAlert size={14} /> Tiden har redan passerat — välj en framtida tid.</div>}
      {needsLoc && location.trim().length <= 2 && !past && <div className="ats-intv-warn"><Info size={14} /> Ange {cfg.locLabel.toLowerCase()} så kandidaten vet vart hen ska.</div>}
      {conflicts.length > 0 && <div className="ats-intv-warn is-warn"><AlertTriangle size={14} /> Krockar med {conflicts.map((c) => c.name).join(", ")} ({fmtInterview(conflicts[0].interview.at)}).</div>}
      <div className="ats-intv-preview"><CalendarCheck size={15} /> {at && !past ? fmtInterview(at) + " · " + duration + " min · " + cfg.label : "Ingen giltig tid vald"}</div>
      <div className="ats-intv-actions"><button className="ats-ghost" onClick={onClose}>Avbryt</button><button className="ats-btn-primary" disabled={!valid} onClick={submit}><CalendarCheck size={15} /> {prev ? "Boka om och skicka" : "Boka och skicka"}</button></div>
    </div>
  </Modal>;
}
function toCSV(list) { const head = ["Namn", "E-post", "Telefon", "Matchning", "Status", "Källa", "Betyg", "Diskvalificerad", "Saknar", "Avslagsanledning"]; const rows = list.map((c) => [c.name, c.email || "", c.phone || "", c.total + "%", statusLabel(c.status), c.source, c.rating || "", c.knockout ? "Ja" : "Nej", (c.missing || []).join("|"), c.reason || ""]); return [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"); }
function RecruitmentReport({ job, cands, state }) {
  const org = state.org;
  const byStatus = {}; STAGES.forEach((st) => { byStatus[st.id] = cands.filter((c) => c.status === st.id).length; });
  const avg = cands.length ? Math.round(cands.reduce((x, c) => x + (c.total || 0), 0) / cands.length) : 0;
  const sources = {}; cands.forEach((c) => { const s = c.source || "Okänd"; if (!sources[s]) sources[s] = { n: 0, sum: 0 }; sources[s].n++; sources[s].sum += c.total || 0; });
  const decided = cands.filter((c) => c.status !== "new").sort((a, b) => b.total - a.total);
  const hired = cands.filter((c) => c.status === "hired");
  const a = job.annons || {};
  return <div className="ats-pr ats-report">
    <div className="ats-pr-head"><div><div className="ats-pr-co">{org.companyName}</div><div className="ats-pr-title">Rekryteringsrapport · {job.title}</div></div><div className="ats-pr-score"><b>{cands.length}</b><small>ansökningar</small></div></div>
    <div className="ats-report-meta">{job.team}{a.location ? " · " + a.location : ""} · Genererad {new Date().toLocaleDateString("sv-SE")}</div>
    <div className="ats-report-sec"><h3>Sammanfattning</h3><div className="ats-report-grid">{STAGES.map((st) => <div key={st.id} className="ats-report-stat"><b>{byStatus[st.id]}</b><span>{st.label}</span></div>)}<div className="ats-report-stat"><b>{avg}%</b><span>Snittmatchning</span></div></div></div>
    {hired.length > 0 && <div className="ats-report-sec"><h3>Anställd kandidat</h3>{hired.map((c) => <div key={c.id} className="ats-report-hired"><Check size={15} /> <b>{c.name}</b> — {c.total}% matchning · {c.email} · källa: {c.source}</div>)}</div>}
    <div className="ats-report-sec"><h3>Kanaler och kvalitet</h3><table className="ats-pr-table"><thead><tr><th>Kanal</th><th>Ansökningar</th><th>Snittmatchning</th></tr></thead><tbody>{Object.entries(sources).sort((x, y) => y[1].n - x[1].n).map(([s, v]) => <tr key={s}><td>{s}</td><td>{v.n}</td><td>{v.n ? Math.round(v.sum / v.n) : 0}%</td></tr>)}</tbody></table></div>
    <div className="ats-report-sec"><h3>Beslutslogg och motiveringar</h3><table className="ats-pr-table"><thead><tr><th>Kandidat</th><th>Matchning</th><th>Beslut</th><th>Motivering</th></tr></thead><tbody>{decided.length === 0 ? <tr><td colSpan={4}>Inga beslut fattade än.</td></tr> : decided.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.total}%</td><td>{statusLabel(c.status)}</td><td>{c.reason || (c.knockout ? c.knockoutReasons.join(", ") : "—")}</td></tr>)}</tbody></table></div>
    <div className="ats-pr-foot">Deterministiskt underlag från Rekyl · viktade kriterier, ingen AI · {org.companyName} · {new Date().toLocaleString("sv-SE")}</div>
  </div>;
}
function ScorecardDoc({ job, c, org }) { return <div className="ats-pr"><div className="ats-pr-head"><div><div className="ats-pr-co">{org.companyName}</div><div className="ats-pr-title">Kandidatunderlag · {job.title}</div></div><div className="ats-pr-score"><b>{c.total}</b><small>% matchning</small></div></div><div className="ats-pr-name">{c.name} {c.knockout && <span className="ats-pr-ko">Diskvalificerad</span>}</div><div className="ats-pr-sub">{c.email} · {c.phone || "telefon saknas"} · {c.source} · formulär v{c.formVersion}</div><table className="ats-pr-table"><thead><tr><th>Kriterium</th><th>Kandidat</th><th>Uppfyllt</th><th>Bidrag</th></tr></thead><tbody>{c.parts.filter((p) => p.kind === "scored").map((p) => <tr key={p.id}><td>{p.label}</td><td>{p.detail}</td><td>{Math.round(p.frac * 100)}%</td><td>+{Math.round(p.earned)}</td></tr>)}{c.parts.filter((p) => p.kind === "must").map((p) => <tr key={p.id}><td>{p.label}</td><td>Obligatoriskt</td><td colSpan={2}>{p.ok ? "Uppfyllt" : "Saknas"}</td></tr>)}</tbody></table>{c.parts.find((p) => p.kind === "text")?.value && <div className="ats-pr-mot"><b>Motivering</b><p>{c.parts.find((p) => p.kind === "text").value}</p></div>}<div className="ats-pr-foot">Deterministiskt underlag från Rekyl · viktade kriterier, ingen AI · {new Date().toLocaleDateString("sv-SE")}</div></div>; }
function CommentBox({ onAdd }) { const [t, setT] = useState(""); return <div className="ats-cmtbox"><input value={t} onChange={(e) => setT(e.target.value)} placeholder="Skriv en kommentar…" onKeyDown={(e) => { if (e.key === "Enter" && t.trim()) { onAdd(t.trim()); setT(""); } }} /><button disabled={!t.trim()} onClick={() => { if (t.trim()) { onAdd(t.trim()); setT(""); } }}><ArrowRight size={15} /></button></div>; }

function CandidatesView({ cands, D, me, job, state, showToast, setDetailId, compareIds, toggleCompare, openCompare }) {
  const [tab, setTab] = useState("all"); const [q, setQ] = useState(""); const [source, setSource] = useState("all"); const [sort, setSort] = useState("score");
  const sources = ["all", ...Array.from(new Set(cands.map((c) => c.source)))];
  const counts = useMemo(() => { const m = { all: cands.length }; STAGES.forEach((s) => m[s.id] = cands.filter((c) => c.status === s.id).length); return m; }, [cands]);
  const list = useMemo(() => { let l = [...cands]; if (tab !== "all") l = l.filter((c) => c.status === tab); if (q.trim()) l = l.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())); if (source !== "all") l = l.filter((c) => c.source === source); l.sort((a, b) => sort === "score" ? b.total - a.total : sort === "new" ? b.appliedAt - a.appliedAt : a.name.localeCompare(b.name)); return l; }, [cands, tab, q, source, sort]);
  const exportCSV = () => { const csv = toCSV(list); const ok = downloadText(`kandidater-${job.slug}.csv`, csv, "text/csv"); copyText(csv); showToast({ kind: "ok", msg: ok ? "CSV nedladdad" : "CSV kopierad" }); };
  return (
    <div className="ats-view">
      <PageHeader title="Kandidater" meta={<><JobSwitch state={state} D={D} /><Dot /><span>{cands.length} totalt</span></>} right={<>{compareIds.length >= 2 && <button className="ats-ghost is-accent" onClick={openCompare}><GitCompare size={15} /> Jämför ({compareIds.length})</button>}<button className="ats-ghost" onClick={exportCSV}><Download size={15} /> CSV</button></>} />
      <div className="ats-tabs">{[{ id: "all", label: "Alla" }, ...STAGES].map((s) => <button key={s.id} className={"ats-tab" + (tab === s.id ? " is-on" : "") + (s.tone ? " tone-" + s.tone : "")} onClick={() => setTab(s.id)}>{s.label}<span className="ats-tab-n">{counts[s.id] || 0}</span></button>)}</div>
      <div className="ats-cand-tools"><div className="ats-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök kandidat…" /></div>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="ats-select">{sources.map((s) => <option key={s} value={s}>{s === "all" ? "Alla källor" : s}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ats-select"><option value="score">Matchning</option><option value="new">Senaste</option><option value="name">Namn</option></select>
        {compareIds.length > 0 && <span className="ats-cmp-hint"><GitCompare size={13} /> {compareIds.length} valda för jämförelse (2–4)</span>}
      </div>
      <div className="ats-table"><div className="ats-tr ats-th"><span></span><span>Kandidat</span><span>Matchning</span><span>Status</span><span>Team</span><span></span></div>
        {list.map((c) => <div key={c.id} className={"ats-tr" + (c.knockout ? " is-ko" : "")}>
          <span><input type="checkbox" className="ats-cmpcheck" checked={compareIds.includes(c.id)} onChange={() => toggleCompare(c.id)} title="Lägg till i jämförelse" /></span>
          <button className="ats-td-name" onClick={() => setDetailId(c.id)}><div className="ats-avatar is-sm">{initials(c.name)}</div><div><b>{c.name} {c.starred && <Star size={11} fill="currentColor" className="ats-starred" />}</b><div className="ats-td-flags"><span className="ats-td-mail">{c.email}</span>{c.missing.length > 0 && <MissingChips items={c.missing.slice(0, 2)} />}</div></div></button>
          <span className="ats-td-score"><div className="ats-td-bar"><div className={"is-" + tierOf(c)} style={{ width: c.total + "%" }} /></div><b className={"is-" + tierOf(c)}>{c.total}%</b></span>
          <span><span className={"ats-statuspill is-" + c.status}>{statusLabel(c.status)}</span></span>
          <span className="ats-td-votes"><VoteSummary reviews={c.reviews} /></span>
          <button className="ats-td-go" onClick={() => setDetailId(c.id)}><ChevronRight size={16} /></button>
        </div>)}
        {list.length === 0 && <div className="ats-col-empty" style={{ padding: 30 }}>Inga kandidater i denna vy.</div>}
      </div>
    </div>
  );
}

/* ===================== KANDIDATPANEL (drawer) ===================== */
function CandidateDrawer({ cand, state, D, me, job, onClose, showToast, setPrintDoc, dupIndex, compareIds, toggleCompare }) {
  const c = { ...cand, ...scoreCandidate(job, cand.answers), missing: missingInfo(job, cand) };
  const canVote = can(me.role, "vote"), canComment = can(me.role, "comment"), canDecide = can(me.role, "decide"), canMsg = can(me.role, "message");
  const [erasing, setErasing] = useState(false); const [eraseBusy, setEraseBusy] = useState(false);
  const doErase = async () => { setEraseBusy(true); await eraseCandidate(c, D); setEraseBusy(false); setErasing(false); showToast({ kind: "ok", msg: "Kandidatens data raderad permanent" }); onClose(); };
  const dupOf = (dupIndex[(c.email || "").toLowerCase()] || []).filter((x) => x.id !== c.id);
  const [booking, setBooking] = useState(false);
  const decide = (status, reason) => { D({ type: "DECIDE", id: c.id, status, reason }); showToast({ kind: c.email ? "ok" : "warn", msg: c.email ? `${statusLabel(status)} · mejl köat` : `${statusLabel(status)} · mejl EJ köat (saknar e-post)` }); };
  const sendMsg = (trigger) => { D({ type: "SEND_MESSAGE", id: c.id, trigger }); showToast({ kind: c.email ? "ok" : "warn", msg: c.email ? "Mejl köat i mejlloggen" : "EJ köat — saknar e-post" }); };
  return (
    <div className="ats-drawer-bg" onClick={onClose}><div className="ats-drawer" onClick={(e) => e.stopPropagation()}>
      <div className="ats-drawer-h"><div><h3>{c.name}</h3><span>{c.email || "e-post saknas"} · {c.phone || "telefon saknas"}</span></div><button onClick={onClose}><X size={18} /></button></div>
      <div className="ats-drawer-body">
        <div className="ats-drawer-score"><ScoreDial value={c.total} knockout={c.knockout} size={84} /><div><span className={"ats-statuspill is-" + c.status}>{statusLabel(c.status)}</span>{c.knockout ? <div className="ats-ko is-mini"><ShieldAlert size={13} /> {c.knockoutReasons.join(", ")}</div> : <div className="ats-below is-ok"><Check size={13} /> Uppfyller obligatoriska krav</div>}<TagPills tags={c.tags} /><MissingChips items={c.missing} /></div></div>
        {(() => { const r = recommendation(c); const RIc = ICONS[r.icon] || Sparkles; return <div className={"ats-reco tone-" + r.tone} style={{ marginTop: 12 }}><span className="ats-reco-ic"><RIc size={16} /></span><div className="ats-reco-txt"><span className="ats-reco-lbl">Rekommenderad åtgärd</span><b>{r.action}</b></div><span className="ats-reco-why">{r.why}</span></div>; })()}
        {dupOf.length > 0 && <div className="ats-dupbox"><History size={13} /> Har sökt {dupOf.length + 1} gånger. {dupOf.map((d) => { const j = state.jobs.find((x) => x.id === d.jobId); return <span key={d.id} className="ats-dup-item">{j ? j.title : d.jobId} · {statusLabel(d.status)}</span>; })}</div>}

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><UserCheck size={12} /> Team review</div><div className="ats-verdicts">{[["yes", "Ja", ThumbsUp], ["maybe", "Osäker", HelpCircle], ["no", "Nej", ThumbsDown]].map(([v, label, Ic]) => <button key={v} disabled={!canVote} className={"ats-verdict is-" + v + (c.reviews[me.id] === v ? " is-on" : "")} onClick={() => D({ type: "REVIEW", id: c.id, verdict: v })}><Ic size={14} /> {label}</button>)}</div>{Object.keys(c.reviews).length > 0 && <div className="ats-cons-pills">{state.team.filter((r) => c.reviews[r.id]).map((r) => <span key={r.id} className={"ats-cons is-" + c.reviews[r.id]}>{r.initials}: {c.reviews[r.id] === "yes" ? "Ja" : c.reviews[r.id] === "no" ? "Nej" : "Osäker"}</span>)}</div>}</div>

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><Activity size={12} /> Timeline</div><div className="ats-tline">{(c.timeline || []).slice(0, 9).map((e) => <div key={e.id} className="ats-tline-row"><span className="ats-tline-dot" /><div className="ats-tline-main"><b>{TL_LABEL[e.kind] || e.kind}</b>{e.detail && <span> · {e.detail}</span>}</div><span className="ats-tline-time">{timeAgo(e.at)}</span></div>)}</div></div>

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><Gauge size={12} /> Poängunderlag</div>{c.parts.filter((p) => p.kind === "scored").map((p) => <div key={p.id} className="ats-break-row"><div className="ats-break-main"><div className="ats-break-label"><span>{p.label}</span><span className="ats-break-detail">{p.detail}</span></div><div className="ats-break-bar"><div className="ats-break-bar-fill" style={{ width: Math.round(p.frac * 100) + "%" }} /></div></div><span className="ats-break-pts">+{Math.round(p.earned)}</span></div>)}</div>

        {c.parts.filter((p) => p.kind === "file" || p.kind === "text").length > 0 && <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><FileText size={12} /> Svar & bilagor</div>{c.parts.filter((p) => p.kind === "file" || p.kind === "text").map((p) => { const fv = p.kind === "file" ? fileVal(p.value) : null; return <div key={p.id} className="ats-answer-row"><span className="ats-answer-l">{p.label}</span>{p.kind === "file" ? (fv ? (fv.url ? <a className="ats-answer-file" href={fv.url} target="_blank" rel="noreferrer"><FileText size={13} /> {fv.name} <Download size={12} /></a> : <span className="ats-answer-file is-nolink"><FileText size={13} /> {fv.name}</span>) : <span className="ats-answer-empty">Ingen fil</span>) : <span className="ats-answer-v">{p.value || "—"}</span>}</div>; })}</div>}
        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><Star size={12} /> Betyg</div><Stars value={c.rating} readOnly={!canComment} onSet={(n) => D({ type: "RATE", id: c.id, rating: n })} /></div>
        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><FileText size={12} /> Kommentarer</div>{c.comments.map((m) => { const a = state.team.find((r) => r.id === m.by); return <div key={m.id} className="ats-cmt"><span className="ats-avatar is-xs">{a?.initials || "?"}</span><div><b>{a?.name}</b> <small>{timeAgo(m.at)}</small><p>{m.text}</p></div></div>; })}{canComment && <CommentBox onAdd={(t) => D({ type: "COMMENT", id: c.id, text: t })} />}</div>

        {canMsg && <div className="ats-drawer-msgs">{c.missing.length > 0 && <button className="ats-ghost" onClick={() => sendMsg("completion")}><Bell size={14} /> Begär komplettering</button>}<button className="ats-ghost" onClick={() => sendMsg("reminder")}><Mail size={14} /> Påminnelse</button><button className="ats-ghost" onClick={() => { toggleCompare(c.id); showToast({ kind: "ok", msg: compareIds.includes(c.id) ? "Borttagen från jämförelse" : "Tillagd i jämförelse" }); }}><GitCompare size={14} /> {compareIds.includes(c.id) ? "I jämförelse" : "Jämför"}</button></div>}
      </div>
      {c.consentAt && <div className="ats-consent"><ShieldCheck size={12} /> Samtycke registrerat {new Date(c.consentAt).toLocaleDateString("sv-SE")} · rätt att bli glömd tillgänglig</div>}
      <div className="ats-drawer-foot">
        <button className="ats-ghost is-sm" onClick={() => setPrintDoc({ title: "Scorecard", node: <ScorecardDoc job={job} c={c} org={state.org} /> })}><FileText size={14} /> PDF</button>
        <button className="ats-ghost is-sm" title="Exportera kandidatens data (GDPR-portabilitet)" onClick={() => downloadJSON("kandidat-" + (c.name || "data").replace(/\s+/g, "_") + ".json", { namn: c.name, epost: c.email, telefon: c.phone, kalla: c.source, status: statusLabel(c.status), matchning: c.total + "%", svar: c.answers, motivering: c.reason, samtycke: c.consentAt ? new Date(c.consentAt).toISOString() : null, ansokt: new Date(c.appliedAt).toISOString(), timeline: c.timeline })}><Download size={14} /> Exportera</button>
        {me.role === "admin" && <button className="ats-ghost is-sm is-danger" title="Radera all data (rätt att bli glömd)" onClick={() => setErasing(true)}><Trash2 size={14} /> Radera</button>}
        {erasing && <Modal title="Radera kandidatens data permanent?" onClose={() => !eraseBusy && setErasing(false)}><div className="ats-erase"><p><b>{c.name}</b> och all tillhörande data (svar, bilagor, motiveringar och timeline) raderas permanent från både appen och molnet. Detta går inte att ångra.</p><p className="ats-erase-note"><ShieldCheck size={13} /> Uppfyller den registrerades rätt att bli glömd enligt GDPR artikel 17.</p><div className="ats-erase-actions"><button className="ats-ghost" disabled={eraseBusy} onClick={() => setErasing(false)}>Avbryt</button><button className="ats-btn-danger" disabled={eraseBusy} onClick={doErase}>{eraseBusy ? "Raderar…" : "Radera permanent"}</button></div></div></Modal>}
        {booking && <InterviewModal cand={c} job={job} state={state} onClose={() => setBooking(false)} onConfirm={(iv) => { setBooking(false); D({ type: "SET_INTERVIEW", id: c.id, interview: iv }); showToast({ kind: "ok", msg: "Intervju " + (ivActive(c) ? "ombokad" : "bokad") + " · " + fmtInterview(iv.at) + " · inbjudan skickas" }); }} />}
        {canDecide && <div className="ats-drawer-decide">
          <Menu align="right" trigger={<button className="ats-dq-rej" title="Avslå"><X size={15} /></button>}><div className="ats-menu-label">Avslagsanledning</div>{REASONS.map((r) => <button key={r} className="ats-menu-item" onClick={() => decide("reject", r)}>{r}</button>)}</Menu>
          <button className="ats-dq-res" title="Reservlista" onClick={() => decide("reserve")}><PauseCircle size={15} /></button>
          <button className="ats-dq-int" title={ivActive(c) ? "Boka om intervju" : "Boka intervju"} onClick={() => setBooking(true)}><CalendarCheck size={15} /></button>
          <button className="ats-dq-yes" title="Shortlist" onClick={() => decide("shortlist")}><Check size={15} /></button>
          <button className="ats-dq-hire" title="Anställ" onClick={() => decide("hired")}><BadgeCheck size={15} /> Anställ</button>
        </div>}
      </div>
    </div></div>
  );
}

/* ===================== JAMFOR (modal) ===================== */
function CompareModal({ cands, compareIds, toggleCompare, onClose, job }) {
  const list = compareIds.map((id) => cands.find((c) => c.id === id)).filter(Boolean);
  const rows = [
    { label: "Matchning", get: (c) => <b className={"is-" + tierOf(c)}>{c.total}%</b> },
    { label: "Status", get: (c) => statusLabel(c.status) },
    { label: "Erfarenhet", get: (c) => (c.answers.experience ?? "—") + " år" },
    { label: "Kan börja", get: (c) => c.answers.availability || "—" },
    { label: "Löneanspråk", get: (c) => c.answers.salary ? sek(c.answers.salary) + " kr" : "—" },
    { label: "Krav uppfyllda", get: (c) => c.knockout ? <span className="ats-x">Nej</span> : <span className="ats-ok">Ja</span> },
    { label: "Saknar", get: (c) => c.knockout ? c.knockoutReasons.join(", ") : (c.missing.length ? c.missing.join(", ") : "—") },
    { label: "Taggar", get: (c) => c.tags?.join(", ") || "—" },
    { label: "Team", get: (c) => { const v = Object.values(c.reviews || {}); return v.length ? `${v.filter((x) => x === "yes").length} ja / ${v.filter((x) => x === "no").length} nej` : "—"; } },
  ];
  return <Modal title={`Jämför ${list.length} kandidater`} onClose={onClose} wide>
    <div className="ats-cmp-modal"><div className="ats-cmp-grid" style={{ gridTemplateColumns: `140px repeat(${list.length},1fr)` }}>
      <div className="ats-cmp-corner" />{list.map((c) => <div key={c.id} className="ats-cmp-head"><div className="ats-avatar is-sm">{initials(c.name)}</div><b>{c.name.split(" ")[0]}</b><button onClick={() => toggleCompare(c.id)}><X size={13} /></button></div>)}
      {rows.map((r) => <Fragment key={r.label}><div className="ats-cmp-rl">{r.label}</div>{list.map((c) => <div key={c.id + r.label} className="ats-cmp-cell">{r.get(c)}</div>)}</Fragment>)}
    </div></div>
  </Modal>;
}

/* ===================== FORMULAR ===================== */
function buildField(block) {
  const base = { id: block + "_" + uid(), scored: false, display: true, required: false, knockout: false, koValue: false, showIf: null, step: 3, help: "", placeholder: "" };
  switch (block) {
    case "experience": return { ...base, label: "Års erfarenhet", block, type: "number", icon: "Briefcase", scored: true, weight: 15, ideal: 4, unit: "år", step: 2 };
    case "skills": return { ...base, label: "Kompetenser", block, type: "multiselect", icon: "Zap", scored: true, weight: 20, options: [{ value: "Kompetens 1", must: false }, { value: "Kompetens 2", must: false }, { value: "Kompetens 3", must: false }] };
    case "availability": return { ...base, label: "Kan börja", block, type: "ordinal", icon: "Clock", scored: true, weight: 12, direction: "desc", scale: ["Omgående", "Inom 1 månad", "1-3 månader", "Mer än 3 månader"], step: 4 };
    case "salary": return { ...base, label: "Löneanspråk", block, type: "budget", icon: "Wallet", scored: true, weight: 12, budget: 40000, unit: "kr/mån", step: 4 };
    case "cert": return { ...base, label: "Certifikat / behörighet", block, type: "boolean", icon: "ShieldCheck", knockout: true, required: true, step: 3 };
    case "yesno": return { ...base, label: "Ja/nej-fråga", block, type: "boolean", icon: "ListChecks", step: 3 };
    case "choice": return { ...base, label: "Flervalsfråga", block, type: "select", icon: "ListChecks", scored: true, weight: 8, options: ["Alternativ 1", "Alternativ 2", "Alternativ 3"], step: 3 };
    case "rating": return { ...base, label: "Skattning (1-5)", block, type: "ordinal", icon: "Star", scored: true, weight: 8, direction: "asc", scale: ["1", "2", "3", "4", "5"], step: 3 };
    case "date": return { ...base, label: "Datum", block, type: "date", icon: "CalendarClock", step: 4 };
    case "phone": return { ...base, label: "Telefon (extra)", block, type: "phone", icon: "Phone", step: 2 };
    case "url": return { ...base, label: "Länk (portfölj m.m.)", block, type: "url", icon: "Link2", step: 5, placeholder: "https://" };
    case "text": return { ...base, label: "Fritext", block, type: "text", icon: "FileText", step: 5, placeholder: "Skriv här…" };
    case "file": return { ...base, label: "Bilaga", block, type: "file", icon: "Upload", display: false, step: 5 };
    default: return { ...base, label: "Fält", block: "text", type: "text", icon: "FileText" };
  }
}
const ADDABLE = [["experience", "Erfarenhet"], ["skills", "Kompetenser"], ["availability", "Tillgänglighet"], ["salary", "Lön"], ["cert", "Certifikat (knockout)"], ["yesno", "Ja/nej"], ["choice", "Flerval"], ["rating", "Skattning 1-5"], ["date", "Datum"], ["phone", "Telefon"], ["url", "Länk"], ["text", "Fritext"], ["file", "Bilaga"]];
const STEP_LABEL = { 2: "Bakgrund", 3: "Kompetens & krav", 4: "Praktiskt", 5: "Om dig" };
const getPages = (job) => { const present = Array.from(new Set(job.criteria.map((c) => c.step))).sort((a, b) => a - b); const explicit = job.pages && job.pages.length ? job.pages : null; if (explicit) return Array.from(new Set([...explicit, ...present])).sort((a, b) => a - b); return present.length ? present : [2]; };
const pageLabel = (job, n) => (job.pageLabels && job.pageLabels[n]) || STEP_LABEL[n] || ("Sida " + n);

function optLabel(o){ return typeof o === "string" ? o : o.value; }
function FieldInspector({ field: c, pages, allFields, onPatch, onDelete, onDuplicate }) {
  const [adv, setAdv] = useState(false);
  const [condSel, setCondSel] = useState("");
  const condCandidates = allFields.filter((x) => x.id !== c.id && (x.type === "boolean" || x.type === "select"));
  const hasOptions = c.type === "multiselect" || c.type === "select" || c.type === "ordinal";
  const optArr = c.type === "ordinal" ? (c.scale || []) : (c.options || []);
  const writeOpts = (arr) => onPatch(c.type === "ordinal" ? { scale: arr } : { options: arr });
  const renameOpt = (i, val) => writeOpts(optArr.map((o, k) => k === i ? (c.type === "multiselect" ? { ...o, value: val } : val) : o));
  const removeOpt = (i) => writeOpts(optArr.filter((_, k) => k !== i));
  const addOpt = () => writeOpts([...optArr, c.type === "multiselect" ? { value: "Nytt alternativ", must: false } : "Nytt alternativ"]);
  const toggleMust = (i) => writeOpts(optArr.map((o, k) => k === i ? { ...o, must: !o.must } : o));
  const TypeIc = ICONS[c.icon] || FileText;
  const canPlace = c.type === "text" || c.type === "phone" || c.type === "url" || c.type === "number" || c.type === "budget";
  return (
    <div className="ats-insp">
      <div className="ats-insp-head"><span className="ats-insp-ic"><TypeIc size={15} /></span><div className="ats-insp-head-t"><b>{TYPE_LABEL[c.type] || c.type}</b><span>Fältinställningar</span></div><div className="ats-insp-head-acts"><button title="Duplicera" onClick={onDuplicate}><Copy size={14} /></button><button title="Ta bort" className="is-danger" onClick={onDelete}><Trash2 size={14} /></button></div></div>
      <label className="ats-fset-row"><span>Etikett</span><input value={c.label} onChange={(e) => onPatch({ label: e.target.value })} /></label>
      <label className="ats-fset-row"><span>Hjälptext</span><input value={c.help || ""} onChange={(e) => onPatch({ help: e.target.value })} placeholder="Visas för kandidaten" /></label>
      {canPlace && <label className="ats-fset-row"><span>Platshållare</span><input value={c.placeholder || ""} onChange={(e) => onPatch({ placeholder: e.target.value })} /></label>}
      <div className="ats-fset-toggles">
        {c.type !== "text" && c.type !== "file" && c.type !== "date" && c.type !== "phone" && c.type !== "url" && <button className={"ats-toggle" + (c.scored ? " is-on" : "")} onClick={() => onPatch({ scored: !c.scored })}><Gauge size={12} /> Poäng</button>}
        <button className={"ats-toggle" + (c.required ? " is-on" : "")} onClick={() => onPatch({ required: !c.required })}><CircleAlert size={12} /> Obligatorisk</button>
        {c.type === "boolean" && <button className={"ats-toggle is-ko" + (c.knockout ? " is-on" : "")} onClick={() => onPatch({ knockout: !c.knockout })}><ShieldAlert size={12} /> Knockout</button>}
      </div>
      {c.scored && c.type !== "text" && c.type !== "file" && <label className="ats-fset-row"><span>Vikt {c.weight ?? 10}</span><input type="range" min="0" max="40" value={c.weight ?? 10} onChange={(e) => onPatch({ weight: Number(e.target.value) })} /></label>}
      {c.type === "number" && <label className="ats-fset-row"><span>Målvärde</span><input type="number" value={c.ideal} onChange={(e) => onPatch({ ideal: Number(e.target.value) })} /></label>}
      {c.type === "budget" && <label className="ats-fset-row"><span>Lönetak (kr/mån)</span><input type="number" value={c.budget} onChange={(e) => onPatch({ budget: Number(e.target.value) })} /></label>}
      {hasOptions && <div className="ats-optedit"><div className="ats-optedit-h"><ListChecks size={12} /> Alternativ</div>{optArr.map((o, i) => <div key={i} className="ats-optrow"><input value={optLabel(o)} onChange={(e) => renameOpt(i, e.target.value)} />{c.type === "multiselect" && <button className={"ats-optmust" + (o.must ? " is-on" : "")} onClick={() => toggleMust(i)} title="Krav (knockout)"><ShieldAlert size={12} /></button>}<button className="ats-optdel" onClick={() => removeOpt(i)}><X size={13} /></button></div>)}<button className="ats-ghost is-sm" onClick={addOpt}><Plus size={12} /> Lägg till alternativ</button></div>}
      <button className="ats-advtoggle" onClick={() => setAdv((v) => !v)}>{adv ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Avancerat</button>
      {adv && <div className="ats-adv">
        <label className="ats-fset-row"><span>Sida</span><select value={c.step} onChange={(e) => onPatch({ step: Number(e.target.value) })}>{pages.map((s, i) => <option key={s} value={s}>{"Sida " + (i + 2) + " – " + pageLabel({ pageLabels: {} }, s)}</option>)}</select></label>
        <button className={"ats-toggle" + (c.display ? " is-on" : "")} onClick={() => onPatch({ display: !c.display })}><Eye size={12} /> Syns på kandidatkort</button>
        {c.type === "boolean" && c.knockout && <label className="ats-fset-row"><span>Diskvalificera om svar</span><select value={String(c.koValue)} onChange={(e) => onPatch({ koValue: e.target.value === "true" })}><option value="false">Nej</option><option value="true">Ja</option></select></label>}
        <div className="ats-fset-cond"><div className="ats-fset-cond-h"><Workflow size={12} /> Visa endast om</div>
          {c.showIf ? <div className="ats-fset-condrow"><span>{allFields.find((x) => x.id === c.showIf.field)?.label || c.showIf.field} = <b>{String(c.showIf.equals)}</b></span><button onClick={() => onPatch({ showIf: null })}><X size={12} /></button></div>
            : condCandidates.length > 0 ? <div className="ats-fset-condadd"><select className="ats-select is-sm" value={condSel} onChange={(e) => setCondSel(e.target.value)}><option value="">Välj fält…</option>{condCandidates.map((x) => x.type === "boolean" ? [<option key={x.id + "t"} value={x.id + "::true"}>{x.label} = Ja</option>, <option key={x.id + "f"} value={x.id + "::false"}>{x.label} = Nej</option>] : (x.options || []).map((o) => { const val = optLabel(o); return <option key={x.id + val} value={x.id + "::" + val}>{x.label} = {val}</option>; }))}</select><button className="ats-ghost is-sm" disabled={!condSel} onClick={() => { const [field, raw] = condSel.split("::"); const equals = raw === "true" ? true : raw === "false" ? false : raw; onPatch({ showIf: { field, equals } }); setCondSel(""); }}><Plus size={12} /></button></div>
              : <span className="ats-muted" style={{ fontSize: 12 }}>Lägg till ett ja/nej- eller flervalsfält först.</span>}
        </div>
      </div>}
    </div>
  );
}
function FieldInput({ c, value, onChange }) {
  if (c.type === "number" || c.type === "budget") return <input type="number" className="ats-inp" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} placeholder={c.placeholder || (c.type === "budget" ? "kr/mån" : c.unit)} />;
  if (c.type === "date") return <input type="date" className="ats-inp" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  if (c.type === "phone") return <input type="tel" className="ats-inp" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={c.placeholder || "070-…"} />;
  if (c.type === "url") return <input type="url" className="ats-inp" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={c.placeholder || "https://"} />;
  if (c.type === "text") return <textarea className="ats-inp" rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={c.placeholder} />;
  if (c.type === "file") return <FileDrop value={value} onChange={onChange} />;
  if (c.type === "boolean") return <div className="ats-yn"><button className={value === true ? "is-on" : ""} onClick={() => onChange(true)}>Ja</button><button className={value === false ? "is-on" : ""} onClick={() => onChange(false)}>Nej</button></div>;
  if (c.type === "multiselect") { const sel = Array.isArray(value) ? value : []; return <div className="ats-chipset">{(c.options||[]).map((o) => { const v = o.value; const on = sel.includes(v); return <button key={v} className={"ats-selchip" + (on ? " is-on" : "") + (o.must ? " is-must" : "")} onClick={() => onChange(on ? sel.filter((x) => x !== v) : [...sel, v])}>{on && <Check size={12} />}{v}{o.must && <span className="ats-mustdot">krav</span>}</button>; })}</div>; }
  const opts = c.type === "ordinal" ? c.scale : c.options; return <div className="ats-chipset">{(opts||[]).map((o) => <button key={o} className={"ats-selchip" + (value === o ? " is-on" : "")} onClick={() => onChange(o)}>{value === o && <Check size={12} />}{o}</button>)}</div>;
}

function ApplyForm({ job, D, org, showToast, onSubmit, source, annons, site }) {
  const [answers, setAnswers] = useState({}); const [base, setBase] = useState({ name: "", email: "", phone: "" }); const [consent, setConsent] = useState(false); const [step, setStep] = useState(0); const [sent, setSent] = useState(false); const [touched, setTouched] = useState(false);
  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const visible = job.criteria.filter((c) => isVisible(c, answers));
  const pageNums = getPages(job).filter((n) => visible.some((c) => c.step === n));
  const steps = [{ key: "base", label: "Om dig" }, ...pageNums.map((n) => ({ key: n, label: pageLabel(job, n) })), { key: "gdpr", label: "Granska och skicka" }];
  const cur = steps[step];
  const nextStep = steps[step + 1];
  const stepFields = typeof cur.key === "number" ? visible.filter((c) => c.step === cur.key) : [];
  const nameOk = base.name.trim().length > 1; const emailOk = validEmail(base.email.trim());
  const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
  const canNext = cur.key === "base" ? (nameOk && emailOk) : cur.key === "gdpr" ? consent : stepFields.filter((c) => c.required).every((c) => !isEmpty(answers[c.id]));
  const pct = Math.round(((step + 1) / steps.length) * 100);
  const topRef = useRef(null);
  const goStep = (n) => { setStep(n); setTouched(false); if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const next = () => { if (!canNext) { setTouched(true); return; } goStep(step + 1); };

  const submit = () => {
    if (!nameOk || !emailOk || !consent) { setTouched(true); return; }
    const cand = { id: "c" + uid(), name: base.name.trim(), email: base.email.trim(), phone: base.phone.trim() || null, source: source || (onSubmit ? "Länk" : "Förhandsvisning"), answers, consentAt: Date.now() };
    if (onSubmit) onSubmit(cand); else D({ type: "ADD_CANDIDATE", cand, jobId: job.id });
    setSent(true);
    if (showToast) showToast({ kind: "ok", msg: "Ansökan skickad" });
  };

  if (sent) return (
    <div className="ats-af-done">
      <div className="ats-af-done-mark"><Check size={30} strokeWidth={2.4} /></div>
      <h2>Tack {base.name.trim().split(" ")[0]} — vi har din ansökan</h2>
      <p>Din ansökan till <b>{job.title}</b> hos {org.companyName} är registrerad. En bekräftelse är på väg till <b>{base.email}</b>.</p>
      <div className="ats-af-nextup">
        <h3>Vad händer nu?</h3>
        <ol>
          <li><span>1</span><div><b>Vi läser din ansökan</b><small>Varje ansökan gås igenom av en människa.</small></div></li>
          <li><span>2</span><div><b>Du får besked</b><small>Vi hör av oss oavsett hur det går — du behöver inte undra.</small></div></li>
          <li><span>3</span><div><b>Nästa steg</b><small>Går du vidare bokar vi en tid som passar dig.</small></div></li>
        </ol>
      </div>
      {annons && <div className="ats-af-summary">
        <h3>Din ansökan</h3>
        <div className="ats-af-rrow"><span>Tjänst</span><b>{job.title}</b></div>
        <div className="ats-af-rrow"><span>Företag</span><b>{org.companyName}</b></div>
        {annons.location && <div className="ats-af-rrow"><span>Plats</span><b>{annons.location}</b></div>}
        {annons.employment && <div className="ats-af-rrow"><span>Anställning</span><b>{annons.employment}</b></div>}
      </div>}
      {(annons && annons.contact && annons.contact.email) || org.hrEmail
        ? <p className="ats-af-done-foot">Frågor om din ansökan? Kontakta {(annons && annons.contact && annons.contact.name) || org.hrName || org.companyName} på <a href={"mailto:" + ((annons && annons.contact && annons.contact.email) || org.hrEmail)}>{(annons && annons.contact && annons.contact.email) || org.hrEmail}</a>.</p>
        : null}
      <div className="ats-af-done-acts">
        {site && <button className="ats-lp-cta" type="button" onClick={() => navTo("/karriar/" + site.slug + "/jobb")}>Se andra lediga jobb <ArrowRight size={16} /></button>}
        {site && <button className="ats-af-back" type="button" onClick={() => navTo("/karriar/" + site.slug)}>Till karriärsidan</button>}
        <button className="ats-af-back" type="button" onClick={() => { const el = document.querySelector(".ats-jp-hero"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}><ChevronLeft size={16} /> Tillbaka till annonsen</button>
      </div>
      <p className="ats-af-privacy"><ShieldCheck size={14} /> Dina uppgifter används endast för den här rekryteringen och delas aldrig vidare. Du kan när som helst be oss radera dem.</p>
    </div>
  );

  return (
    <div className="ats-af" ref={topRef}>
      <div className="ats-af-head">
        <h2>Ansök till {job.title}</h2>
        <p>Ett steg i taget. Ha gärna ditt CV till hands.</p>
      </div>

      <div className="ats-af-prog" role="group" aria-label="Formulärets framsteg">
        <div className="ats-af-prog-t">
          <span className="ats-af-stepno">Steg {step + 1} av {steps.length}</span>
          {nextStep && <span className="ats-af-nextlbl">Nästa: {nextStep.label}</span>}
        </div>
        <div className="ats-af-bar"><div className="ats-af-bar-fill" style={{ width: pct + "%" }} /></div>
        <h3 className="ats-af-curstep">{cur.label}</h3>
      </div>

      <div className="ats-af-body" key={step}>
        {cur.key === "base" && <div className="ats-af-fields">
          <div className="ats-af-f">
            <label className="ats-af-l" htmlFor="af-name">Namn <i aria-hidden="true">*</i><span className="ats-sr">obligatoriskt</span></label>
            <input id="af-name" className={"ats-inp" + (touched && !nameOk ? " is-err" : "")} value={base.name} onChange={(e) => setBase((b) => ({ ...b, name: e.target.value }))} placeholder="För- och efternamn" autoComplete="name" aria-invalid={touched && !nameOk} />
            {touched && !nameOk && <span className="ats-af-err"><CircleAlert size={14} /> Fyll i ditt namn.</span>}
          </div>
          <div className="ats-af-f">
            <label className="ats-af-l" htmlFor="af-mail">E-post <i aria-hidden="true">*</i><span className="ats-sr">obligatoriskt</span></label>
            <input id="af-mail" className={"ats-inp" + (touched && !emailOk ? " is-err" : "")} type="email" value={base.email} onChange={(e) => setBase((b) => ({ ...b, email: e.target.value }))} placeholder="din@epost.se" autoComplete="email" aria-invalid={touched && !emailOk} />
            {touched && !emailOk ? <span className="ats-af-err"><CircleAlert size={14} /> Ange en giltig e-postadress.</span> : <span className="ats-af-help">Hit skickar vi besked om din ansökan.</span>}
          </div>
          <div className="ats-af-f">
            <label className="ats-af-l" htmlFor="af-tel">Telefon</label>
            <input id="af-tel" className="ats-inp" type="tel" value={base.phone} onChange={(e) => setBase((b) => ({ ...b, phone: e.target.value }))} placeholder="070-123 45 67" autoComplete="tel" />
            <span className="ats-af-help">Frivilligt, men gör det lättare att nå dig.</span>
          </div>
        </div>}

        {typeof cur.key === "number" && <div className="ats-af-fields">
          {stepFields.map((c) => {
            const bad = touched && c.required && isEmpty(answers[c.id]);
            return <div key={c.id} className={"ats-af-f" + (bad ? " is-err" : "")}>
              <span className="ats-af-l">{c.label} {c.required && <><i aria-hidden="true">*</i><span className="ats-sr">obligatoriskt</span></>}</span>
              {c.help && <span className="ats-af-help is-top">{c.help}</span>}
              <FieldInput c={c} value={answers[c.id]} onChange={(v) => set(c.id, v)} />
              {bad && <span className="ats-af-err"><CircleAlert size={14} /> Den här frågan behöver besvaras.</span>}
            </div>;
          })}
          {stepFields.length === 0 && <p className="ats-af-help">Inga frågor i det här steget.</p>}
        </div>}

        {cur.key === "gdpr" && <div className="ats-af-fields">
          <div className="ats-af-review">
            <h3>Dina uppgifter</h3>
            <div className="ats-af-rrow"><span>Namn</span><b>{base.name || "—"}</b></div>
            <div className="ats-af-rrow"><span>E-post</span><b>{base.email || "—"}</b></div>
            {base.phone && <div className="ats-af-rrow"><span>Telefon</span><b>{base.phone}</b></div>}
            <div className="ats-af-rrow"><span>Tjänst</span><b>{job.title}</b></div>
            <button className="ats-af-edit" type="button" onClick={() => goStep(0)}>Ändra</button>
          </div>
          <div className="ats-af-gdpr">
            <h3>Så hanterar vi dina uppgifter</h3>
            <ul>
              <li>Uppgifterna används enbart för den här rekryteringen — urval, kontakt och besked.</li>
              <li>De delas aldrig vidare för marknadsföring och säljs inte.</li>
              <li>Du kan när som helst be oss radera allt, så gör vi det.</li>
            </ul>
            <label className={"ats-af-consent" + (touched && !consent ? " is-err" : "")}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={touched && !consent} />
              <span>Jag godkänner att {org.companyName} behandlar mina uppgifter för den här rekryteringen.</span>
            </label>
            {touched && !consent && <span className="ats-af-err"><CircleAlert size={14} /> Du behöver godkänna hanteringen för att kunna skicka in.</span>}
            {org.hrEmail && <p className="ats-af-gdpr-foot">Frågor om hur vi hanterar dina uppgifter? Mejla <a href={"mailto:" + org.hrEmail}>{org.hrEmail}</a>.</p>}
          </div>
        </div>}
      </div>

      <div className="ats-af-nav">
        {step > 0 && <button className="ats-af-back" onClick={() => goStep(step - 1)} type="button"><ChevronLeft size={17} /> Bakåt</button>}
        {step < steps.length - 1
          ? <button className="ats-af-next" onClick={next} type="button">Nästa <ArrowRight size={17} /></button>
          : <button className="ats-af-submit" onClick={submit} type="button">Skicka ansökan <ArrowRight size={17} /></button>}
      </div>
    </div>
  );
}
function FormView({ job, D, me, state, showToast }) {
  const [tab, setTab] = useState("bygg"); const [selId, setSelId] = useState(job.criteria[0]?.id);
  const canEdit = can(me.role, "edit");
  const sel = job.criteria.find((c) => c.id === selId);
  const pages = getPages(job);
  const [undo, setUndo] = useState([]); const [redo, setRedo] = useState([]);
  const [overKey, setOverKey] = useState(null); const [dragging, setDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false); const [showShare, setShowShare] = useState(false);
  const [dirty, setDirty] = useState(false);
  const snap = () => { setUndo((u) => [...u.slice(-40), job.criteria]); setRedo([]); };
  const setPages = (np) => { D({ type: "SET_FORM", patch: { pages: np } }); setDirty(true); };
  const doUndo = () => { if (!undo.length) return; setRedo((r) => [job.criteria, ...r]); const prev = undo[undo.length - 1]; setUndo((u) => u.slice(0, -1)); D({ type: "SET_FORM", patch: { criteria: prev } }); setDirty(true); };
  const doRedo = () => { if (!redo.length) return; setUndo((u) => [...u, job.criteria]); const nxt = redo[0]; setRedo((r) => r.slice(1)); D({ type: "SET_FORM", patch: { criteria: nxt } }); setDirty(true); };
  const flatten = (crit) => { const out = []; const used = new Set(); pages.forEach((p) => crit.forEach((c) => { if (c.step === p && !used.has(c.id)) { used.add(c.id); out.push(c); } })); crit.forEach((c) => { if (!used.has(c.id)) { used.add(c.id); out.push(c); } }); return out; };
  const patchField = (id, patch) => { snap(); D({ type: "SET_FORM", patch: { criteria: flatten(job.criteria.map((c) => c.id === id ? { ...c, ...patch } : c)) } }); setDirty(true); };
  const deleteField = (id) => { snap(); const nc = job.criteria.filter((c) => c.id !== id); D({ type: "SET_FORM", patch: { criteria: nc } }); setDirty(true); if (selId === id) setSelId(nc[0]?.id); };
  const duplicateField = (id) => { const f = job.criteria.find((c) => c.id === id); if (!f) return; const clone = { ...JSON.parse(JSON.stringify(f)), id: f.block + "_" + uid(), label: f.label + " (kopia)" }; snap(); const idx = job.criteria.findIndex((c) => c.id === id); const nc = [...job.criteria]; nc.splice(idx + 1, 0, clone); D({ type: "SET_FORM", patch: { criteria: flatten(nc) } }); setDirty(true); setSelId(clone.id); };
  const placeAt = (payload, step, index) => { if (!payload) return; snap(); let field, base = job.criteria; if (payload.slice(0, 6) === "block:") field = { ...buildField(payload.slice(6)), step }; else { const id = payload.slice(6); const found = base.find((c) => c.id === id); if (!found) return; field = { ...found, step }; base = base.filter((c) => c.id !== id); } const pageItems = base.filter((c) => c.step === step); pageItems.splice(index, 0, field); const out = []; const used = new Set(); pages.forEach((p) => { const items = p === step ? pageItems : base.filter((c) => c.step === p); items.forEach((it) => { if (!used.has(it.id)) { used.add(it.id); out.push(it); } }); }); [field, ...base].forEach((c) => { if (!used.has(c.id)) { used.add(c.id); out.push(c); } }); D({ type: "SET_FORM", patch: { criteria: out } }); setDirty(true); if (payload.slice(0, 6) === "block:") setSelId(field.id); };
  const addPage = () => { setPages([...pages, Math.max(1, ...pages) + 1]); };
  const A = job.annons || {};
  const setA = (patch) => { D({ type: "SET_FORM", patch: { annons: { ...(job.annons || {}), ...patch } } }); setDirty(true); };
  const missingPub = publishBlockers(job);
  const publish = () => {
    if (missingPub.length) { showToast({ kind: "warn", msg: "Kan inte publiceras: " + missingPub[0] }); return; }
    if (job.internal) { D({ type: "SET_FORM", patch: {}, bump: true }); D({ type: "JOB_STATUS", id: job.id, status: "published" }); setDirty(false); showToast({ kind: "ok", msg: "Intern tjänst — publiceras aldrig publikt" }); return; }
    D({ type: "SET_FORM", patch: {}, bump: true });
    D({ type: "JOB_STATUS", id: job.id, status: "published" });
    setDirty(false);
    if (sbEnabled) { sbUpsert("jobs", { slug: job.slug, title: job.publicTitle || job.title, company: state.org.companyName, org: state.org, form: { criteria: job.criteria, pages: getPages(job), pageLabels: job.pageLabels || {}, version: job.version + 1, annons: job.annons, team: job.team, status: "published" }, published: true, org_id: SB_ORG }).then((ok) => showToast({ kind: ok ? "ok" : "warn", msg: ok ? "Publicerat till molnet · länken funkar överallt nu" : "Molnet svarar inte — kontrollera anslutningen (ändringar sparas lokalt)" })); } else { showToast({ kind: "ok", msg: "Publicerat · v" + (job.version + 1) }); }
  };
  const skills = job.criteria.find((c) => c.id === "skills");
  const scored = job.criteria.filter((c) => c.scored && c.type !== "text" && c.type !== "file");
  const link = (typeof window !== "undefined" ? window.location.origin : state.org.appUrl) + "/j/" + job.slug; const embed = `<iframe src="${link}/inbäddad" width="100%" height="720" style="border:0" title="${job.title}"></iframe>`;
  const [advScore, setAdvScore] = useState(false);
  const addDefaults = () => { D({ type: "ADD_AUTORULE", rule: { field: "total", op: ">=", value: 85, then: "shortlist" } }); D({ type: "ADD_AUTORULE", rule: { field: "total", op: "<", value: 45, then: "reject" } }); showToast({ kind: "ok", msg: "Smarta standardregler tillagda" }); };

  return (
    <div className="ats-view">
      <PageHeader title="Formulär" meta={<><JobSwitch state={state} D={D} /><Dot /><span>formulär v{job.version}</span></>} right={<button className="ats-ghost is-accent" onClick={() => setTab("dela")}><Eye size={15} /> Förhandsvisa</button>} />
      <div className="ats-subtabs">{[["bygg", "Formulär", Blocks], ["annons", "Jobbannons", Building2], ["scoring", "Scoring & krav", Gauge], ["auto", "Automation", Workflow], ["dela", "Dela & förhandsvisa", Link2]].map(([id, label, Ic]) => <button key={id} className={"ats-subtab" + (tab === id ? " is-on" : "")} onClick={() => setTab(id)}><Ic size={14} /> {label}</button>)}</div>

      {tab === "bygg" && <>
        <div className="ats-fb-toolbar">
          <div className="ats-fb-tgroup"><button className="ats-ghost is-sm" disabled={!undo.length} onClick={doUndo}><RotateCcw size={13} /> Ångra</button><button className="ats-ghost is-sm" disabled={!redo.length} onClick={doRedo}><RotateCw size={13} /> Gör om</button></div>
          <div className="ats-fb-tgroup"><span className={"ats-fb-saved" + (dirty ? " is-dirty" : "")}>{dirty ? "Osparade ändringar" : "Allt sparat"}</span><button className="ats-ghost is-sm" onClick={() => setShowPreview(true)}><Eye size={13} /> Förhandsvisa</button><button className="ats-ghost is-sm" onClick={() => setShowShare(true)}><Share2 size={13} /> Dela</button>{canEdit && <button className="ats-btn-primary" onClick={publish}><Rocket size={14} /> Publicera v{job.version + 1}</button>}</div>
        </div>
        <div className="ats-fb">
          <div className="ats-fb-palette"><div className="ats-fb-palette-h"><Blocks size={13} /> Fält</div><p className="ats-fb-palette-note">Dra ut till formuläret &rarr;</p>{ADDABLE.map(([b, label]) => { const Ic = ICONS[buildField(b).icon] || FileText; return <div key={b} className={"ats-fb-pal" + (canEdit ? "" : " is-off")} draggable={canEdit} onDragStart={(e) => { e.dataTransfer.setData("text/plain", "block:" + b); setDragging(true); }} onDragEnd={() => { setDragging(false); setOverKey(null); }}><span className="ats-fb-pal-ic"><Ic size={15} /></span><span className="ats-fb-pal-l">{label}</span><GripVertical size={13} className="ats-fb-pal-grip" /></div>; })}</div>
          <div className={"ats-fb-canvas" + (dragging ? " is-dragging" : "")}>
            <div className="ats-fb-page is-locked"><div className="ats-fb-page-h"><span className="ats-fb-page-badge">1</span><b>Grunduppgifter</b><span className="ats-fb-page-lock"><Lock size={11} /> alltid först</span></div><div className="ats-fb-basefields"><div className="ats-fb-basef"><Users size={13} /> Namn <i>*</i></div><div className="ats-fb-basef"><AtSign size={13} /> E-post <i>*</i></div><div className="ats-fb-basef"><Phone size={13} /> Telefon</div></div></div>
            {pages.map((p, pi) => { const items = job.criteria.filter((c) => c.step === p); return <div key={p} className="ats-fb-page"><div className="ats-fb-page-h"><span className="ats-fb-page-badge">{pi + 2}</span><input className="ats-fb-page-title" value={pageLabel(job, p)} disabled={!canEdit} onChange={(e) => { D({ type: "SET_FORM", patch: { pageLabels: { ...(job.pageLabels || {}), [p]: e.target.value } } }); setDirty(true); }} />{items.length === 0 && pages.length > 1 && canEdit && <button className="ats-fb-page-del" title="Ta bort tom sida" onClick={() => setPages(pages.filter((x) => x !== p))}><Trash2 size={12} /></button>}</div>
              <div className="ats-fb-zone">
                {items.length === 0 && <div className={"ats-fb-empty" + (overKey === p + ":0" ? " is-over" : "")} onDragOver={(e) => { e.preventDefault(); setOverKey(p + ":0"); }} onDragLeave={() => setOverKey(null)} onDrop={(e) => { e.preventDefault(); placeAt(e.dataTransfer.getData("text/plain"), p, 0); setOverKey(null); }}><Plus size={15} /> Släpp fält här</div>}
                {items.map((c, i) => { const Ic = ICONS[c.icon] || FileText; return <Fragment key={c.id}>
                  {overKey === p + ":" + i && <div className="ats-fb-ind" />}
                  <div className={"ats-fb-card" + (selId === c.id ? " is-sel" : "")} draggable={canEdit} onDragStart={(e) => { e.dataTransfer.setData("text/plain", "field:" + c.id); setDragging(true); }} onDragEnd={() => { setDragging(false); setOverKey(null); }} onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setOverKey(p + ":" + (e.clientY < r.top + r.height / 2 ? i : i + 1)); }} onDrop={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); placeAt(e.dataTransfer.getData("text/plain"), p, e.clientY < r.top + r.height / 2 ? i : i + 1); setOverKey(null); }} onClick={() => setSelId(c.id)}>
                    <span className="ats-fb-card-grip"><GripVertical size={15} /></span>
                    <div className="ats-fb-card-main"><div className="ats-fb-card-top"><span className="ats-fb-card-ic"><Ic size={13} /></span><b>{c.label || "(namnlöst)"}</b>{c.required && <span className="ats-fb-tag is-req">obligatorisk</span>}{c.knockout && <span className="ats-fb-tag is-ko">knockout</span>}{c.scored && <span className="ats-fb-tag is-score">vikt {weightOf(job, c)}</span>}{c.showIf && <span className="ats-fb-tag is-cond">villkorad</span>}</div><div className="ats-fb-card-prev"><FieldInput c={c} value={undefined} onChange={() => {}} /></div>{c.help && <small className="ats-fieldhelp">{c.help}</small>}</div>
                    {canEdit && <div className="ats-fb-card-acts"><button title="Duplicera" onClick={(e) => { e.stopPropagation(); duplicateField(c.id); }}><Copy size={13} /></button><button title="Ta bort" className="is-danger" onClick={(e) => { e.stopPropagation(); deleteField(c.id); }}><Trash2 size={13} /></button></div>}
                  </div>
                  {i === items.length - 1 && overKey === p + ":" + (i + 1) && <div className="ats-fb-ind" />}
                </Fragment>; })}
              </div>
            </div>; })}
            {canEdit && <button className="ats-fb-addpage" onClick={addPage}><Plus size={14} /> Lägg till sida</button>}
            <div className="ats-fb-page is-locked"><div className="ats-fb-page-h"><span className="ats-fb-page-badge"><Check size={12} /></span><b>Skicka in</b><span className="ats-fb-page-lock"><ShieldCheck size={11} /> GDPR-samtycke</span></div></div>
          </div>
          <div className="ats-fb-insp">{sel && canEdit ? <FieldInspector field={sel} pages={pages} allFields={job.criteria} onPatch={(patch) => patchField(sel.id, patch)} onDelete={() => deleteField(sel.id)} onDuplicate={() => duplicateField(sel.id)} /> : <div className="ats-fb-insp-empty"><MousePointerClick size={22} /><p>Klicka på ett fält för att redigera — eller dra ut ett nytt fält från paletten.</p><div className="ats-buildsum"><div><span>Fält</span><b>{job.criteria.length}</b></div><div><span>Poäng</span><b>{job.criteria.filter((c) => c.scored).length}</b></div><div><span>Knockout</span><b>{job.criteria.filter((c) => c.knockout).length}</b></div><div><span>Sidor</span><b>{pages.length}</b></div></div></div>}</div>
        </div>
        {showPreview && <Modal title="Förhandsvisning — så ser kandidaten formuläret" onClose={() => setShowPreview(false)} wide><div className="ats-fb-prevwrap"><ApplyForm job={job} D={() => {}} org={state.org} showToast={() => {}} /></div></Modal>}
        {showShare && <ShareModal job={job} state={state} onClose={() => setShowShare(false)} showToast={showToast} />}
      </>}

      {tab === "annons" && <div className="ats-anned">
        <p className="ats-anned-intro"><Sparkles size={13} /> Fyll i så byggs en professionell publik jobbsida på <b>/j/{job.slug}</b> automatiskt. Förhandsvisa via länken under "Dela".</p>
        <div className="ats-anned-grid">
          <label className="ats-field"><span className="ats-field-l">Plats</span><input value={A.location || ""} onChange={(e) => setA({ location: e.target.value })} placeholder="t.ex. Göteborg" /></label>
          <label className="ats-field"><span className="ats-field-l">Arbetsform</span><input value={A.workmode || ""} onChange={(e) => setA({ workmode: e.target.value })} placeholder="Hybrid / På plats / Distans" /></label>
          <label className="ats-field"><span className="ats-field-l">Anställningsform</span><input value={A.employment || ""} onChange={(e) => setA({ employment: e.target.value })} placeholder="Heltid · tillsvidare" /></label>
          <label className="ats-field"><span className="ats-field-l">Lön / lönespann</span><input value={A.salary || ""} onChange={(e) => setA({ salary: e.target.value })} placeholder="t.ex. 38 000–48 000 kr/mån" /></label>
          <label className="ats-field"><span className="ats-field-l">Startdatum</span><input value={A.start || ""} onChange={(e) => setA({ start: e.target.value })} placeholder="Enligt överenskommelse" /></label>
          <label className="ats-field"><span className="ats-field-l">Sök senast (deadline)</span><input value={A.deadline || ""} onChange={(e) => setA({ deadline: e.target.value })} placeholder="t.ex. 31 augusti" /></label>
        </div>
        <label className="ats-field ats-anned-full"><span className="ats-field-l">Kort pitch (visas stort överst)</span><textarea rows={2} value={A.pitch || ""} onChange={(e) => setA({ pitch: e.target.value })} placeholder="En mening som säljer in rollen." /></label>
        <label className="ats-field ats-anned-full"><span className="ats-field-l">Full arbetsbeskrivning</span><textarea rows={5} value={A.description || ""} onChange={(e) => setA({ description: e.target.value })} placeholder="Beskriv rollen, ansvar och vardagen." /></label>
        <div className="ats-anned-lists">
          <AnnListEditor label="Vi söker dig som (krav)" items={A.requirements || []} onChange={(v) => setA({ requirements: v })} placeholder="t.ex. 3 års erfarenhet" />
          <AnnListEditor label="Meriterande" items={A.meriter || []} onChange={(v) => setA({ meriter: v })} placeholder="t.ex. SaaS-erfarenhet" />
          <AnnListEditor label="Vi erbjuder (förmåner)" items={A.benefits || []} onChange={(v) => setA({ benefits: v })} placeholder="t.ex. Friskvårdsbidrag" />
          <AnnListEditor label="Rekryteringsprocess (steg)" items={A.process || []} onChange={(v) => setA({ process: v })} placeholder="t.ex. Intervju" />
        </div>
        <div className="ats-anned-grid">
          <label className="ats-field"><span className="ats-field-l">Kontaktperson</span><input value={(A.contact && A.contact.name) || ""} onChange={(e) => setA({ contact: { ...(A.contact || {}), name: e.target.value } })} placeholder="Namn" /></label>
          <label className="ats-field"><span className="ats-field-l">Kontakt-e-post</span><input value={(A.contact && A.contact.email) || ""} onChange={(e) => setA({ contact: { ...(A.contact || {}), email: e.target.value } })} placeholder="namn@företag.se" /></label>
        </div>
        <FaqEditor items={A.faq || []} onChange={(v) => setA({ faq: v })} />
      </div>}

      {tab === "scoring" && <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Vikter</h2><Menu align="right" trigger={<button className="ats-profilebtn">{job.profiles.find((p) => p.id === job.activeProfileId)?.name} <ChevronDown size={13} /></button>}>{job.profiles.map((p) => <button key={p.id} className={"ats-menu-item" + (p.id === job.activeProfileId ? " is-active" : "")} onClick={() => D({ type: "SET_PROFILE", id: p.id })}>{p.name}</button>)}{canEdit && <><div className="ats-menu-sep" /><button className="ats-menu-item is-accent" onClick={() => D({ type: "SAVE_PROFILE", name: "Profil " + job.profiles.length })}><Plus size={13} /> Spara som profil</button></>}</Menu></div>
          {scored.map((c) => { const w = weightOf(job, c); const Ic = ICONS[c.icon] || Award; return <div key={c.id} className="ats-wrow"><span className="ats-wrow-ic"><Ic size={14} /></span><div className="ats-wrow-main"><div className="ats-wrow-top"><span>{c.label}</span><b>{w}</b></div><input type="range" min="0" max="40" value={w} disabled={!canEdit} onChange={(e) => D({ type: "SET_WEIGHT", critId: c.id, weight: Number(e.target.value) })} className="ats-range" /></div></div>; })}
          {skills && <div className="ats-mustedit"><div className="ats-mustedit-h">Obligatoriska kompetenser (knockout)</div><div className="ats-chipset">{skills.options.map((o, i) => <button key={o.value} className={"ats-selchip" + (o.must ? " is-must is-on" : "")} disabled={!canEdit} onClick={() => D({ type: "TOGGLE_SKILL_MUST", idx: i })}>{o.must && <ShieldAlert size={11} />} {o.value}</button>)}</div></div>}
        </div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Krav & tröskel</h2></div>
          <div className="ats-thresh"><div className="ats-thresh-top"><span>Foreslå avslag under</span><b>{job.autoRejectBelow ?? 0}%</b></div><input type="range" min="0" max="90" value={job.autoRejectBelow ?? 0} disabled={!canEdit} onChange={(e) => D({ type: "SET_THRESHOLD", value: Number(e.target.value) })} className="ats-range" /></div>
          <button className="ats-advtoggle" style={{ marginTop: 14 }} onClick={() => setAdvScore((v) => !v)}>{advScore ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Avancerat: auto-taggar</button>
          {advScore && <div className="ats-adv"><div className="ats-rulelist">{job.rules.length === 0 && <div className="ats-col-empty">Inga taggregler.</div>}{job.rules.map((r) => <div key={r.id} className="ats-rulechip"><Tag size={11} /> {r.field === "total" ? "Matchning" : job.criteria.find((c) => c.id === r.field)?.label || r.field} {r.op} {r.value} → <b>{r.tag}</b>{canEdit && <button onClick={() => D({ type: "REMOVE_RULE", id: r.id })}><X size={11} /></button>}</div>)}</div>{canEdit && <RuleAdder criteria={job.criteria} onAdd={(rule) => D({ type: "ADD_RULE", rule })} />}</div>}
        </div>
      </div>}

      {tab === "auto" && <div className="ats-panel ats-autopanel"><div className="ats-panel-h"><h2>Automation</h2><button className={"ats-switch" + (job.autopilotOn ? " is-on" : "")} onClick={() => D({ type: "TOGGLE_AUTOPILOT" })}><span className="ats-switch-dot" /></button></div>
        <p className="ats-builder-note"><Workflow size={12} /> När automation är på flyttas nya kandidater automatiskt enligt reglerna — och rätt mejl köas. Allt kan överstyras manuellt och loggas i timeline.</p>
        {job.autoRules.length === 0 ? <div className="ats-auto-empty"><p>Inga regler än.</p><button className="ats-ghost is-accent" onClick={addDefaults}><Sparkles size={14} /> Lägg till smarta standardregler</button></div>
          : <><div className="ats-arules">{job.autoRules.map((r) => <div key={r.id} className="ats-arule"><div className="ats-arule-txt"><b>{r.field === "total" ? "Matchning" : r.field} {r.op} {r.value}</b><ArrowRight size={13} /><span className={"ats-arule-then is-" + r.then}>{statusLabel(r.then)}</span></div>{canEdit && <button className="is-danger" onClick={() => D({ type: "REMOVE_AUTORULE", id: r.id })}><Trash2 size={13} /></button>}</div>)}</div>
            {canEdit && <div className="ats-arule-add"><AutoRuleAdder onAdd={(rule) => D({ type: "ADD_AUTORULE", rule })} /></div>}
            <button className="ats-ghost is-accent" style={{ marginTop: 12 }} onClick={() => { D({ type: "RUN_AUTORULES" }); showToast({ kind: "ok", msg: "Automation körd · mejl köade" }); }}><Zap size={14} /> Kör på befintlig ko nu</button></>}
      </div>}

      {tab === "dela" && <div className="ats-grid-2">
        <div className="ats-preview-wrap"><ApplyForm job={job} D={D} org={state.org} showToast={showToast} /></div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Dela formuläret</h2></div>
          <label className="ats-field"><span className="ats-field-l">Publik lank</span><div className="ats-copyrow"><input readOnly value={link} /><button onClick={() => { copyText(link); showToast({ kind: "ok", msg: "Lank kopierad" }); }}><Copy size={14} /></button></div></label>
          <label className="ats-field"><span className="ats-field-l">Inbäddning</span><div className="ats-copyrow"><input readOnly value={embed} /><button onClick={() => { copyText(embed); showToast({ kind: "ok", msg: "Kod kopierad" }); }}><Code2 size={14} /></button></div></label>
          <div className="ats-qrpanel"><QRCode text={link} size={150} /><p>Scanna för att öppna det publika formuläret.</p></div>
          <details className="ats-versions"><summary><History size={13} /> Versionshistorik (v{job.version})</summary><div className="ats-tline">{[...job.versions].reverse().map((v) => <div key={v.v} className="ats-tline-row"><span className="ats-tline-dot" /><div className="ats-tline-main"><b>v{v.v}</b> · {v.note} <span className="ats-muted">({v.by})</span></div><span className="ats-tline-time">{timeAgo(v.at)}</span></div>)}</div></details>
        </div>
      </div>}
    </div>
  );
}
function fileVal(v) { return v && typeof v === "object" ? v : (v ? { name: v, url: null } : null); }
function FileDrop({ value, onChange }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);
  const val = fileVal(value);
  const pick = async (file) => {
    if (!file) return; setErr(false);
    if (sbEnabled) {
      setBusy(true);
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = (SB_UPLOAD_ORG || "public") + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "_" + safe;
      const url = await sbUpload("cv", path, file);
      setBusy(false); if (!url) setErr(true);
      onChange({ name: file.name, url: url || null, size: file.size });
    } else { onChange({ name: file.name, url: null, size: file.size }); }
  };
  return <div className={"ats-filedrop" + (over ? " is-over" : "") + (val ? " is-set" : "") + (busy ? " is-busy" : "")} onClick={() => !busy && inputRef.current && inputRef.current.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files && e.dataTransfer.files[0]); }}>
    {busy ? <><div className="ats-spinner is-sm" /><div className="ats-filedrop-info"><b>Laddar upp…</b><span>{val ? val.name : ""}</span></div></>
      : val ? <><FileText size={18} /><div className="ats-filedrop-info"><b>{val.name}</b><span>{err ? "Uppladdning misslyckades — klicka och försök igen" : val.url ? "Uppladdad ✓ · klicka för att byta" : "Klicka för att byta fil"}</span></div><button className="ats-filedrop-x" onClick={(e) => { e.stopPropagation(); onChange(null); }}><X size={14} /></button></>
        : <><Upload size={18} /><div className="ats-filedrop-info"><b>Släpp fil eller klicka</b><span>PDF, Word, PNG, JPG</span></div></>}
    <input ref={inputRef} type="file" style={{ display: "none" }} onChange={(e) => pick(e.target.files && e.target.files[0])} />
  </div>;
}
function AnnListEditor({ label, items, onChange, placeholder }) {
  return <div className="ats-anned-list"><span className="ats-field-l">{label}</span>{items.map((it, i) => <div key={i} className="ats-anned-row"><input value={it} onChange={(e) => onChange(items.map((x, k) => k === i ? e.target.value : x))} placeholder={placeholder} /><button className="ats-optdel" onClick={() => onChange(items.filter((_, k) => k !== i))}><X size={13} /></button></div>)}<button className="ats-ghost is-sm" onClick={() => onChange([...items, ""])}><Plus size={12} /> Lägg till</button></div>;
}
function FaqEditor({ items, onChange }) {
  return <div className="ats-anned-list"><span className="ats-field-l">Vanliga frågor (FAQ)</span>{items.map((f, i) => <div key={i} className="ats-anned-faq"><input value={f.q} onChange={(e) => onChange(items.map((x, k) => k === i ? { ...x, q: e.target.value } : x))} placeholder="Fråga" /><textarea rows={2} value={f.a} onChange={(e) => onChange(items.map((x, k) => k === i ? { ...x, a: e.target.value } : x))} placeholder="Svar" /><button className="ats-optdel" onClick={() => onChange(items.filter((_, k) => k !== i))}><X size={13} /></button></div>)}<button className="ats-ghost is-sm" onClick={() => onChange([...items, { q: "", a: "" }])}><Plus size={12} /> Lägg till fråga</button></div>;
}
function ShareModal({ job, state, onClose, showToast }) {
  const origin = typeof window !== "undefined" ? window.location.origin : state.org.appUrl;
  const base = origin + "/j/" + job.slug;
  const link = (src) => base + (src ? "?source=" + src : "");
  const embed = '<iframe src="' + base + '" width="100%" height="900" style="border:0" title="' + job.title + '"></iframe>';
  const cp = (t, m) => { copyText(t); showToast({ kind: "ok", msg: m }); };
  const open = (u) => window.open(u, "_blank");
  const enc = encodeURIComponent;
  const CH = [
    { id: "linkedin", label: "LinkedIn", hint: "Klistra in som extern ansökningslänk", icon: Share2, share: "https://www.linkedin.com/sharing/share-offsite/?url=" + enc(link("linkedin")) },
    { id: "indeed", label: "Indeed", hint: "Klistra in som ansöknings-URL", icon: Globe, share: null },
    { id: "platsbanken", label: "Platsbanken", hint: "Klistra in som webbadress för ansökan", icon: Globe, share: null },
    { id: "facebook", label: "Facebook", hint: "Dela i flödet eller grupper", icon: Share2, share: "https://www.facebook.com/sharer/sharer.php?u=" + enc(link("facebook")) },
    { id: "hemsida", label: "Egen hemsida", hint: "Länka från er karriärsida", icon: Globe, share: null },
  ];
  return <Modal title="Kanaler & publicering" onClose={onClose} wide>
    <div className="ats-chan">
      <p className="ats-chan-intro">Plattformarna bäddar inte in formuläret – de länkar till din egen ansökningssida. Varje kanal får en <b>spårbar länk</b> så du ser exakt varifrån varje kandidat kom.</p>
      <div className="ats-chan-list">{CH.map((c) => <div key={c.id} className="ats-chan-row"><div className="ats-chan-ic"><c.icon size={16} /></div><div className="ats-chan-main"><b>{c.label}</b><span className="ats-chan-hint">{c.hint}</span><span className="ats-chan-url">{link(c.id)}</span></div><div className="ats-chan-acts"><button className="ats-btn-primary is-sm" onClick={() => cp(link(c.id), c.label + "-länk kopierad")}><Copy size={13} /> Kopiera</button>{c.share && <button className="ats-ghost is-sm" onClick={() => open(c.share)}><Share2 size={13} /> Dela</button>}</div></div>)}</div>
      <div className="ats-chan-two">
        <div className="ats-chan-box"><div className="ats-chan-sec-h"><QrCode size={14} /> QR-kod</div><div className="ats-chan-qrwrap"><QRCode text={link("qr")} size={150} /></div><button className="ats-ghost is-sm" onClick={() => cp(link("qr"), "QR-länk kopierad")}><Copy size={13} /> Kopiera QR-länk</button></div>
        <div className="ats-chan-box"><div className="ats-chan-sec-h"><Code2 size={14} /> Bädda in på er hemsida</div><div className="ats-envbox"><pre>{embed}</pre></div><button className="ats-ghost is-sm" onClick={() => cp(embed, "Inbäddningskod kopierad")}><Copy size={13} /> Kopiera kod</button></div>
      </div>
    </div>
  </Modal>;
}
function RuleAdder({ criteria, onAdd }) { const [field, setField] = useState("total"); const [op, setOp] = useState(">="); const [value, setValue] = useState(80); const [tag, setTag] = useState("Toppmatch"); const numeric = [["total", "Matchning"], ...criteria.filter((c) => c.type === "number").map((c) => [c.id, c.label])]; return <div className="ats-ruleadd"><select className="ats-select is-sm" value={field} onChange={(e) => setField(e.target.value)}>{numeric.map((f) => <option key={f[0]} value={f[0]}>{f[1]}</option>)}</select><select className="ats-select is-sm" value={op} onChange={(e) => setOp(e.target.value)}>{[">=", ">", "<=", "<"].map((o) => <option key={o}>{o}</option>)}</select><input className="ats-inp is-sm" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} /><input className="ats-inp is-sm" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tagg" /><button className="ats-ghost is-sm" onClick={() => tag.trim() && onAdd({ field, op, value, tag: tag.trim() })}><Plus size={13} /></button></div>; }
function AutoRuleAdder({ onAdd }) { const [field, setField] = useState("total"); const [op, setOp] = useState(">="); const [value, setValue] = useState(85); const [then, setThen] = useState("shortlist"); return <><select className="ats-select is-sm" value={field} onChange={(e) => setField(e.target.value)}><option value="total">Matchning</option><option value="knockout">Diskvalificerad</option></select><select className="ats-select is-sm" value={op} onChange={(e) => setOp(e.target.value)}>{[">=", ">", "<=", "<", "="].map((o) => <option key={o}>{o}</option>)}</select><input className="ats-inp is-sm" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} /><ArrowRight size={14} /><select className="ats-select is-sm" value={then} onChange={(e) => setThen(e.target.value)}>{["shortlist", "interview", "reserve", "reject", "flag"].map((t) => <option key={t} value={t}>{statusLabel(t) === t ? "Flagga" : statusLabel(t)}</option>)}</select><button className="ats-ghost is-sm" onClick={() => onAdd({ field, op, value, then })}><Plus size={13} /></button></>; }

/* ===================== STATISTIK ===================== */
function SourceQualityView({ allScored }) {
  const all = allScored.flatMap((a) => a.list);
  const groups = {};
  all.forEach((c) => { const s = c.source || "Okänd"; (groups[s] = groups[s] || []).push(c); });
  const rows = Object.entries(groups).map(([source, list]) => {
    const n = list.length;
    const avg = n ? Math.round(list.reduce((x, c) => x + (c.total || 0), 0) / n) : 0;
    const top = list.filter((c) => (c.total || 0) >= 75 && !c.knockout).length;
    const interviews = list.filter((c) => c.status === "interview").length;
    const hired = list.filter((c) => c.status === "hired").length;
    return { source, n, avg, top, interviews, hired };
  }).sort((a, b) => b.avg - a.avg || b.n - a.n);
  const best = rows[0];
  const maxN = Math.max(1, ...rows.map((r) => r.n));
  const SRCIC = { LinkedIn: Share2, Indeed: Globe, Platsbanken: Globe, Facebook: Share2, Hemsida: Globe, "Länk": Link2, QR: QrCode, Direkt: UserCheck };
  return (
    <div className="ats-view">
      <PageHeader title="Källkvalitet" meta={<><span>{all.length} kandidater</span><Dot /><span>{rows.length} kanaler</span></>} />
      {rows.length === 0 ? <div className="ats-col-empty" style={{ padding: 40 }}>Inga kandidater än. När ansökningar kommer in via dina spårbara länkar (LinkedIn, Indeed, Platsbanken m.fl.) syns kvaliteten per kanal här.</div> : <>
        {best && <div className="ats-sq-hero"><div className="ats-sq-hero-l"><span className="ats-sq-hero-lbl"><TrendingUp size={13} /> Bästa kanal</span><div className="ats-sq-hero-src">{best.source}</div><div className="ats-sq-hero-sub">{best.avg}% snittmatchning · {best.n} ansökningar · {best.hired} anställda</div></div><ScoreDial value={best.avg} knockout={false} size={72} /></div>}
        <div className="ats-panel"><div className="ats-panel-h"><h2>Kvalitet per kanal</h2><span className="ats-summono">sorterat på snittmatchning</span></div>
          <div className="ats-sq-scroll"><div className="ats-sq-table">
            <div className="ats-sq-head"><span>Kanal</span><span>Ansökningar</span><span>Snittmatchning</span><span>Toppmatch</span><span>Intervjuer</span><span>Anställda</span></div>
            {rows.map((r) => { const Ic = SRCIC[r.source] || Globe; const tone = r.avg >= 70 ? " is-strong" : r.avg <= 45 ? " is-weak" : ""; return <div key={r.source} className="ats-sq-row">
              <span className="ats-sq-src"><span className="ats-sq-ic"><Ic size={14} /></span>{r.source}</span>
              <span className="ats-sq-n"><div className="ats-sq-nbar"><div className="ats-sq-nbar-fill" style={{ width: Math.round((r.n / maxN) * 100) + "%" }} /></div><b>{r.n}</b></span>
              <span className="ats-sq-avg"><div className="ats-sq-avgbar"><div className={"ats-sq-avgbar-fill" + tone} style={{ width: r.avg + "%" }} /></div><b>{r.avg}%</b></span>
              <span className="ats-sq-metric">{r.top}</span>
              <span className="ats-sq-metric">{r.interviews}</span>
              <span className="ats-sq-metric is-hired">{r.hired}</span>
            </div>; })}
          </div></div>
          <p className="ats-builder-note"><Info size={12} /> Kvalitet mäts som kandidaternas snittmatchning per kanal — inte bara antal. En kanal med färre men bättre kandidater rankas högre. Datan kommer från source-taggarna i dina delningslänkar.</p>
        </div>
      </>}
    </div>
  );
}
function StatsView({ cands, job, state, D, setPrintDoc }) {
  const started = job.stats.started, submitted = job.stats.submitted;
  const completion = Math.round((submitted / Math.max(1, started)) * 100);
  const advanced = cands.filter((c) => ["shortlist", "interview", "hired"].includes(c.status)).length;
  const ko = cands.filter((c) => c.knockout).length;
  const buckets = [["0–40", 0, 40], ["40–55", 40, 55], ["55–70", 55, 70], ["70–85", 70, 85], ["85–100", 85, 101]];
  const hist = buckets.map(([label, lo, hi]) => ({ label, n: cands.filter((c) => c.total >= lo && c.total < hi).length }));
  const histMax = Math.max(1, ...hist.map((h) => h.n));
  const sources = Array.from(new Set(cands.map((c) => c.source))).map((s) => { const l = cands.filter((c) => c.source === s); return { s, n: l.length, avg: Math.round(l.reduce((a, c) => a + c.total, 0) / Math.max(1, l.length)) }; }).sort((a, b) => b.n - a.n);
  const srcMax = Math.max(1, ...sources.map((s) => s.n));
  const koFields = job.criteria.filter((c) => c.knockout && c.type === "boolean").map((c) => ({ label: c.label, n: cands.filter((cc) => isVisible(c, cc.answers) && !!cc.answers[c.id] === !!c.koValue).length }));
  const missCount = {}; cands.forEach((c) => c.missing.forEach((m) => { missCount[m] = (missCount[m] || 0) + 1; }));
  const missList = Object.entries(missCount).sort((a, b) => b[1] - a[1]);
  const funnel = [["Påbörjade", started, "neutral"], ["Skickade", submitted, "green"], ["Kvalificerade", cands.filter((c) => !c.knockout && c.total >= 55).length, "green"], ["Gick vidare", advanced, "amber"], ["Anställda", cands.filter((c) => c.status === "hired").length, "gold"]];
  const fMax = Math.max(1, ...funnel.map((f) => f[1]));
  return (
    <div className="ats-view">
      <PageHeader title="Statistik" meta={<><JobSwitch state={state} D={D} /><Dot /><span>kvalitet och källor</span></>} right={<button className="ats-ghost is-accent" onClick={() => setPrintDoc({ title: "Rekryteringsrapport", node: <RecruitmentReport job={job} cands={cands} state={state} /> })}><Download size={15} /> Exportera rapport</button>} />
      <div className="ats-stats"><div className="ats-stat"><span className="ats-stat-ic is-green"><TrendingUp size={16} /></span><div><div className="ats-stat-v">{completion}%</div><div className="ats-stat-l">Completion rate</div></div></div><div className="ats-stat"><span className="ats-stat-ic is-petrol"><Check size={16} /></span><div><div className="ats-stat-v">{submitted}</div><div className="ats-stat-l">Skickade ansökningar</div></div></div><div className="ats-stat"><span className="ats-stat-ic is-brick"><ShieldAlert size={16} /></span><div><div className="ats-stat-v">{Math.round((ko / Math.max(1, cands.length)) * 100)}%</div><div className="ats-stat-l">Diskvalificerade</div></div></div><div className="ats-stat"><span className="ats-stat-ic is-amber"><Star size={16} /></span><div><div className="ats-stat-v">{advanced}</div><div className="ats-stat-l">Gick vidare</div></div></div></div>
      <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Rekryteringsfunnel</h2></div><div className="ats-funnel">{funnel.map(([label, n, tone]) => <div key={label} className="ats-funnel-row"><span className="ats-funnel-l">{label}</span><div className="ats-funnel-bar"><div className={"ats-funnel-fill is-" + tone} style={{ width: Math.max(4, (n / fMax) * 100) + "%" }}>{n}</div></div></div>)}</div></div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Poängfördelning</h2></div><div className="ats-hist">{hist.map((h) => <div key={h.label} className="ats-hist-col"><div className="ats-hist-bar" style={{ height: Math.max(4, (h.n / histMax) * 130) + "px" }}><span>{h.n}</span></div><span className="ats-hist-x">{h.label}</span></div>)}</div></div>
      </div>
      <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Frågeprestanda</h2></div><p className="ats-builder-note" style={{ marginTop: 0 }}><ListChecks size={12} /> Hur ofta varje krav sållar bort kandidater, och vilka uppgifter som oftast saknas.</p>
          <div className="ats-qperf">{koFields.filter((k) => k.n > 0).map((k) => <div key={k.label} className="ats-qperf-row"><span className="ats-qperf-l"><ShieldAlert size={12} /> {k.label}</span><span className="ats-qperf-n">{k.n} diskvalificerade</span></div>)}
            {missList.map(([m, n]) => <div key={m} className="ats-qperf-row"><span className="ats-qperf-l"><CircleAlert size={12} /> Saknar {m}</span><span className="ats-qperf-n">{n} ansökningar</span></div>)}
            {koFields.every((k) => k.n === 0) && missList.length === 0 && <div className="ats-col-empty">Inga bortfall registrerade.</div>}</div></div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Källanalys</h2></div><div className="ats-srclist">{sources.map((s) => <div key={s.s} className="ats-src-row"><span className="ats-src-l">{s.s}</span><div className="ats-src-bar"><div style={{ width: (s.n / srcMax) * 100 + "%" }} /></div><span className="ats-src-n">{s.n} · snitt {s.avg}%</span></div>)}</div></div>
      </div>
    </div>
  );
}

/* ===================== TEAM & LOGG ===================== */
function TeamManagePanel({ state, me, D }) {
  const isAdmin = me.role === "admin";
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const invite = async () => { setErr(""); setBusy(true); try { const c = await sbRpc("make_invite", { p_role: inviteRole }); setCode(typeof c === "string" ? c : (c && c[0]) || ""); } catch (e) { setErr(e.message || "Fel"); } setBusy(false); };
  const changeRole = async (uid, role) => { try { await sbRpc("set_member_role", { p_user: uid, p_role: role }); D({ type: "SET_TEAM", team: state.team.map((m) => m.id === uid ? { ...m, role } : m) }); } catch (e) { alert(e.message || "Kunde inte ändra roll"); } };
  return <div className="ats-panel"><div className="ats-panel-h"><h2>Team</h2><span className="ats-summono">{state.team.length} medlemmar</span></div>
    <div className="ats-team-list">{state.team.map((m) => <div key={m.id} className="ats-team-row"><span className="ats-avatar is-sm">{m.initials}</span><div className="ats-team-info"><b>{m.name}{m.id === me.id && <span className="ats-team-you">du</span>}</b><small>{m.email}</small></div>{isAdmin && m.id !== me.id ? <select className="ats-select is-sm" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>{Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select> : <span className="ats-team-role">{ROLE_LABEL[m.role]}</span>}</div>)}</div>
    {isAdmin ? <div className="ats-invite"><div className="ats-invite-h"><UserPlus size={14} /> Bjud in en kollega</div><div className="ats-invite-row"><select className="ats-select is-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>{Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select><button className="ats-btn-primary is-sm" disabled={busy} onClick={invite}>{busy ? "…" : "Skapa inbjudningskod"}</button></div>{err && <div className="ats-login-err" style={{ marginTop: 8 }}><CircleAlert size={12} /> {err}</div>}{code && <div className="ats-invite-code"><div className="ats-invite-code-t">Skicka koden till din kollega. De skapar ett konto, väljer "Gå med i team" och klistrar in koden:</div><div className="ats-invite-code-box"><code>{code}</code><button className="ats-ghost is-sm" onClick={() => { copyText(code); }}><Copy size={12} /> Kopiera</button></div></div>}</div>
      : <p className="ats-builder-note"><ShieldCheck size={12} /> Din roll: <b>{ROLE_LABEL[me.role]}</b>. Kontakta en admin för att ändra behörigheter eller bjuda in fler.</p>}
  </div>;
}
function TeamView({ state, me, D, mail, sendMailNow, showToast }) {
  const perms = [["decide", "Beslut"], ["vote", "Team review"], ["message", "Mejl"], ["edit", "Redigera"], ["comment", "Kommentera"], ["export", "Export"]];
  const msgs = state.messages.slice(0, 24);
  const cName = (id) => state.candidates.find((c) => c.id === id)?.name || "—";
  const queued = state.messages.filter((m) => (m.status === "queued" || m.status === "failed") && validEmail(m.to));
  const [bulk, setBulk] = useState(false);
  const sendAllQueued = async () => { setBulk(true); let okN = 0; for (const m of queued) { const r = await sendMailNow(m); if (r && r.ok) okN++; } setBulk(false); showToast({ kind: okN === queued.length ? "ok" : "warn", msg: okN + " av " + queued.length + " mejl skickade" }); };
  return (
    <div className="ats-view">
      <PageHeader title="Team & logg" meta={<><span>{state.team.length} personer</span><Dot /><span>{state.log.length} händelser</span></>} />
      <TeamManagePanel state={state} me={me} D={D} />
      <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Team & behörigheter</h2></div>
          <div className="ats-permtable"><div className="ats-permrow ats-permhead"><span>Person</span>{perms.map((p) => <span key={p[0]}>{p[1]}</span>)}</div>
            {state.team.map((r) => <div key={r.id} className={"ats-permrow" + (r.id === me.id ? " is-me" : "")}><span className="ats-permname"><span className="ats-avatar is-xs">{r.initials}</span><span>{r.name}<small>{ROLE_LABEL[r.role]}</small></span></span>{perms.map((p) => <span key={p[0]}>{can(r.role, p[0]) ? <Check size={14} className="ats-permyes" /> : <X size={13} className="ats-permno" />}</span>)}</div>)}
          </div>
          <p className="ats-builder-note"><ShieldCheck size={12} /> Team review, beslut i kön och per-kandidat-timeline gor processen sparbar och rättssäker.</p>
        </div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Revisionslogg</h2><span className="ats-summono">senaste händelser</span></div>
          <div className="ats-log">{state.log.map((l) => <div key={l.id} className="ats-log-row"><span className="ats-log-dot" /><div className="ats-log-main"><b>{l.action}</b>{l.detail && <span> · {l.detail}</span>}<div className="ats-log-meta">{l.who} · {timeAgo(l.at)}</div></div></div>)}</div>
        </div>
      </div>
      <div className="ats-panel"><div className="ats-panel-h"><h2>Mejllogg</h2><span className="ats-summono">{state.messages.length} meddelanden</span></div>
        {mail.configured
          ? <div className="ats-mailbar is-on"><CheckCircle2 size={14} /> Utskick aktivt via <b>{mail.provider}</b> — nya beslut skickar mejlet direkt. Status nedan är den verkliga statusen från leverantören.{queued.length > 0 && can(me.role, "message") && <button className="ats-ghost is-sm" disabled={bulk} onClick={sendAllQueued}><Send size={13} /> Skicka {queued.length} köade</button>}</div>
          : <div className="ats-honestbar"><Info size={13} /> Utskick är inte aktiverat — mejlen köas här men skickas inte. Aktivera under <b>Inställningar → Mejlutskick</b>. Ingen status visar "skickad" förrän leverantören bekräftat.</div>}
        {msgs.length === 0 ? <div className="ats-col-empty" style={{ padding: 20 }}>Inga mejl loggade än. Swipa i kön så köas rätt mejl automatiskt.</div>
          : <div className="ats-msglog"><div className="ats-msglog-head"><span>Status</span><span>Mottagare</span><span>Ämne</span><span>Mall / trigger</span><span>Tid</span><span></span></div>{msgs.map((m) => <div key={m.id} className="ats-msglog-row"><span className={"ats-msgstatus is-" + m.status}>{MSG_LABEL[m.status] || m.status}</span><span className="ats-msglog-to">{cName(m.candidateId)}<small>{m.to}</small></span><span className="ats-msglog-subj">{m.subject}{m.error && <small className="ats-msgerr">{m.error}</small>}</span><span className="ats-msglog-tpl">{m.tplName}<small>{m.trigger}</small></span><span className="ats-msglog-time">{m.status === "sent" && m.sentAt ? timeAgo(m.sentAt) : timeAgo(m.at)}</span><span className="ats-msglog-act">{(m.status === "queued" || m.status === "failed") && validEmail(m.to) && mail.configured && can(me.role, "message") && <button className="ats-ghost is-sm" title="Skicka nu" onClick={() => sendMailNow(m)}><Send size={12} /></button>}</span></div>)}</div>}
      </div>
    </div>
  );
}

/* ===================== INSTALLNINGAR ===================== */
const MAIL_ENV = 'MAIL_PROVIDER=brevo\nBREVO_API_KEY=din-api-nyckel\nMAIL_FROM=noreply@dindoman.se';
const VAR_CHIPS = ["candidateName", "jobTitle", "companyName", "hrName", "hrEmail", "missingField", "interviewTime", "rejectionReason"];
function RetentionPanel({ state, D, showToast, isAdmin }) {
  const months = state.org.retentionMonths || 0;
  const [busy, setBusy] = useState(false);
  const cutoff = months > 0 ? Date.now() - months * 30 * 864e5 : 0;
  const old = months > 0 ? state.candidates.filter((c) => (c.appliedAt || 0) < cutoff) : [];
  const purge = async () => { if (!old.length) return; setBusy(true); for (const c of old) { await eraseCandidate(c, D); } setBusy(false); showToast({ kind: "ok", msg: old.length + " gamla ansökningar raderade" }); };
  return <div className="ats-panel"><div className="ats-panel-h"><h2>Dataskydd och lagring</h2><span className="ats-summono">GDPR</span></div>
    <label className="ats-field ats-ret-row"><span className="ats-field-l">Radera ansökningar äldre än</span><div className="ats-ret-input"><input type="number" min="0" value={months} disabled={!isAdmin} onChange={(e) => D({ type: "SET_ORG", patch: { retentionMonths: Math.max(0, Number(e.target.value) || 0) } })} /><span>månader (0 = av)</span></div></label>
    {months > 0 && <div className={"ats-ret-status" + (old.length ? " is-warn" : "")}>{old.length ? <><CircleAlert size={14} /> {old.length} ansökningar är äldre än {months} månader.{isAdmin && <button className="ats-btn-danger is-sm" disabled={busy} onClick={purge}>{busy ? "Raderar…" : "Rensa nu"}</button>}</> : <><Check size={14} /> Inga ansökningar överskrider lagringstiden.</>}</div>}
    <p className="ats-builder-note"><ShieldCheck size={12} /> Kandidaters uppgifter lagras inom EU och kan raderas på begäran (rätt att bli glömd) via varje kandidats panel. Sätt en lagringstid ovan för att regelbundet rensa gamla ansökningar. Samtycke registreras vid varje ansökan.</p>
  </div>;
}
function SettingsView({ state, D, me, job, cands, showToast, onLogout, session, mail }) {
  const canEdit = can(me.role, "edit");
  const [selId, setSelId] = useState(state.templates[0]?.id);
  const [prevId, setPrevId] = useState(cands[0]?.id);
  const tpl = state.templates.find((t) => t.id === selId) || state.templates[0];
  const org = state.org;
  const setOrg = (patch) => D({ type: "SET_ORG", patch });
  const patchTpl = (p) => D({ type: "UPDATE_TEMPLATE", id: tpl.id, patch: p });
  const previewCand = cands.find((c) => c.id === prevId) || cands[0];
  const vars = previewCand ? tplVars(state, previewCand, job) : {};
  const [testBusy, setTestBusy] = useState(false); const [testRes, setTestRes] = useState(null);
  const isAdmin = me.role === "admin";
  const [remBusy, setRemBusy] = useState(false); const [remRes, setRemRes] = useState(null);
  const runRem = async () => { setRemBusy(true); setRemRes(null); const r = await runRemindersNow(); setRemBusy(false); setRemRes(r.ok ? { ok: true, msg: r.sent + " påminnelse" + (r.sent === 1 ? "" : "r") + " skickade" + (r.skipped ? " · " + r.skipped + " redan skickade" : "") + (r.errors && r.errors.length ? " · " + r.errors.length + " fel" : "") } : { ok: false, msg: r.error || "Kunde inte köra" }); };
  const sendTest = async () => { setTestBusy(true); setTestRes(null); const to = session && session.email; const res = await sendMail({ to, subject: "Testmejl från Rekyl", body: "Detta är ett testmejl från " + org.companyName + ".\n\nOm du läser det här fungerar utskicket. Svar går till " + org.hrEmail + ".", fromName: org.companyName, replyTo: org.hrEmail }); setTestBusy(false); setTestRes(res.ok ? { ok: true, msg: "Testmejl skickat till " + to } : { ok: false, msg: res.error || "Kunde inte skicka" }); };
  return (
    <div className="ats-view">
      <PageHeader title="Inställningar" meta={<><span>e-post</span><Dot /><span>mallar</span><Dot /><span>företag</span></>} />
      <div className="ats-panel"><div className="ats-panel-h"><h2>Inloggad som</h2></div><div className="ats-rolepick"><div className="ats-rolepick-btn is-on"><span className="ats-avatar is-xs">{me.initials}</span><div className="ats-rolepick-t"><b>{me.name}</b><small>{me.email} · {ROLE_LABEL[me.role]}</small></div></div></div>{sbEnabled && session && <button className="ats-ghost is-danger" style={{ marginTop: 12 }} onClick={onLogout}><LogOut size={14} /> Logga ut{session.email ? " (" + session.email + ")" : ""}</button>}</div>
      <RetentionPanel state={state} D={D} showToast={showToast} isAdmin={me.role === "admin"} />
      <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Företag & avsändare</h2></div>
          <label className="ats-field"><span className="ats-field-l">Företagsnamn</span><input value={org.companyName} disabled={!canEdit} onChange={(e) => setOrg({ companyName: e.target.value })} /></label>
          <div className="ats-tpl-two"><label className="ats-field"><span className="ats-field-l">HR-ansvarig (namn)</span><input value={org.hrName} disabled={!canEdit} onChange={(e) => setOrg({ hrName: e.target.value })} /></label><label className="ats-field"><span className="ats-field-l">HR-mejl (Reply-To)</span><input value={org.hrEmail} disabled={!canEdit} onChange={(e) => setOrg({ hrEmail: e.target.value })} /></label></div>
          <label className="ats-field"><span className="ats-field-l">App-URL</span><input value={org.appUrl} disabled={!canEdit} onChange={(e) => setOrg({ appUrl: e.target.value })} /></label>
          <p className="ats-builder-note"><Mail size={12} /> Kandidaterna ser <b>{org.companyName}</b> som avsändarnamn, och svar går till <b>{org.hrEmail}</b> (Reply-To). Avsändaradressen styrs säkert på servern — se Mejlutskick.</p>
        </div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Mejlutskick</h2><span className={"ats-smtp-status" + (mail.configured ? " is-on" : "")}><Server size={13} /> {!mail.checked ? "Kontrollerar…" : mail.configured ? "Aktivt · " + mail.provider : "Ej aktiverat"}</span></div>
          {mail.configured
            ? <>
              <div className="ats-mailcfg"><div className="ats-mailcfg-row"><span>Avsändare</span><b>{org.companyName} &lt;{mail.from}&gt;</b></div><div className="ats-mailcfg-row"><span>Svar går till</span><b>{org.hrEmail}</b></div><div className="ats-mailcfg-row"><span>Leverantör</span><b>{mail.provider}</b></div></div>
              <p className="ats-builder-note"><ShieldCheck size={12} /> Mejlen skickas från serverns verifierade adress med ert företagsnamn som avsändarnamn — det gör att de faktiskt når fram (SPF/DKIM) och kan inte förfalskas. Tjänsten kan bara mejla kandidater i er egen organisation.</p>
              <button className="ats-ghost" disabled={testBusy} onClick={sendTest}><Send size={14} /> {testBusy ? "Skickar…" : "Skicka testmejl till mig"}</button>
              {testRes && <div className={"ats-testres" + (testRes.ok ? " is-ok" : " is-err")}>{testRes.ok ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />} {testRes.msg}</div>}
            </>
            : <>
              <div className="ats-honestbar"><Info size={13} /> Utskick är inte aktiverat — mejl köas men skickas inte.{mail.reason ? <> Orsak: <b>{mail.reason}</b></> : " Lägg in miljövariablerna nedan i Netlify (Project configuration → Environment variables) och deploya om."} Ingen status visar "skickad" förrän leverantören bekräftat.</div>
              <label className="ats-field"><span className="ats-field-l">Miljövariabler i Netlify</span><div className="ats-envbox"><pre>{MAIL_ENV}</pre></div></label>
              <button className="ats-ghost" onClick={() => { copyText(MAIL_ENV); showToast({ kind: "ok", msg: "Variabler kopierade" }); }}><Copy size={14} /> Kopiera</button>
            </>}
        </div>
        {mail.configured && <div className="ats-panel"><div className="ats-panel-h"><h2>Automatisering</h2><span className={"ats-smtp-status" + (mail.notify && mail.reminders ? " is-on" : "")}><Zap size={13} /> {mail.notify && mail.reminders ? "Båda aktiva" : mail.notify || mail.reminders ? "Delvis aktiv" : "Ej aktiverad"}</span></div>
          <div className="ats-auto">
            <div className={"ats-auto-row" + (mail.notify ? " is-on" : "")}>
              <div className="ats-auto-i">{mail.notify ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}</div>
              <div className="ats-auto-t"><b>Avisering vid ny ansökan</b><span>{mail.notify ? "Aktiv — du får ett mejl så fort någon söker, även när appen är stängd." : "Kräver NOTIFY_SECRET i Netlify + en databas-webhook i Supabase."}</span></div>
            </div>
            <div className={"ats-auto-row" + (mail.reminders ? " is-on" : "")}>
              <div className="ats-auto-i">{mail.reminders ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}</div>
              <div className="ats-auto-t"><b>Intervjupåminnelse (24 h innan)</b><span>{mail.reminders ? "Aktiv — körs varje timme och påminner kandidaten dagen innan. Skickas aldrig dubbelt." : "Kräver SUPABASE_SERVICE_ROLE_KEY i Netlify."}</span></div>
            </div>
          </div>
          {mail.reminders && isAdmin && <button className="ats-ghost" disabled={remBusy} onClick={runRem}><Bell size={14} /> {remBusy ? "Kör…" : "Kör påminnelser nu"}</button>}
          {remRes && <div className={"ats-testres" + (remRes.ok ? " is-ok" : " is-err")}>{remRes.ok ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />} {remRes.msg}</div>}
        </div>}
      </div>

      <div className="ats-panel"><div className="ats-panel-h"><h2>Meddelandemallar</h2><span className="ats-summono">skickas automatiskt via swipe</span></div>
        <div className="ats-tpl3">
          <div className="ats-tpllist">{canEdit && <button className="ats-ghost is-sm" style={{ marginBottom: 8, width: "100%" }} onClick={() => { D({ type: "ADD_TEMPLATE", tpl: { name: "Ny mall", trigger: "manual", active: true, subject: "", body: "Hej {{candidateName}},\n\n" } }); }}><Plus size={13} /> Ny mall</button>}{state.templates.map((t) => <button key={t.id} className={"ats-tplitem" + (t.id === selId ? " is-on" : "")} onClick={() => setSelId(t.id)}><Mail size={13} /><div><b>{t.name}</b><span>{t.trigger}</span></div>{!t.active && <span className="ats-muted">av</span>}</button>)}</div>
          {tpl && <div className="ats-tpledit">
            <div className="ats-tpl-two"><label className="ats-field"><span className="ats-field-l">Namn</span><input value={tpl.name} disabled={!canEdit} onChange={(e) => patchTpl({ name: e.target.value })} /></label><label className="ats-field"><span className="ats-field-l">Trigger</span><select value={tpl.trigger} disabled={!canEdit} onChange={(e) => patchTpl({ trigger: e.target.value })}>{["received", "shortlist", "interview", "reserve", "reject", "completion", "offer", "reminder", "manual"].map((t) => <option key={t} value={t}>{t}</option>)}</select></label></div>
            <label className="ats-field"><span className="ats-field-l">Ämne</span><input value={tpl.subject} disabled={!canEdit} onChange={(e) => patchTpl({ subject: e.target.value })} /></label>
            <label className="ats-field"><span className="ats-field-l">Meddelande</span><textarea rows={8} value={tpl.body} disabled={!canEdit} onChange={(e) => patchTpl({ body: e.target.value })} /></label>
            {canEdit && <div className="ats-varchips"><span>Variabler:</span>{VAR_CHIPS.map((v) => <button key={v} onClick={() => patchTpl({ body: (tpl.body || "") + `{{${v}}}` })}>{`{{${v}}}`}</button>)}</div>}
            {canEdit && state.templates.length > 1 && <button className="ats-ghost is-sm is-danger" style={{ marginTop: 10 }} onClick={() => { D({ type: "REMOVE_TEMPLATE", id: tpl.id }); setSelId(state.templates.find((t) => t.id !== tpl.id)?.id); }}><Trash2 size={13} /> Ta bort mall</button>}
          </div>}
          <div className="ats-tplprev"><div className="ats-panel-h" style={{ marginBottom: 8 }}><h2 style={{ fontSize: 14 }}>Förhandsvisning</h2>{cands.length > 0 && <select className="ats-select is-sm" value={prevId} onChange={(e) => setPrevId(e.target.value)}>{cands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</div>
            {previewCand && tpl ? <div className="ats-mailprev"><div className="ats-mailprev-h"><b>{renderTpl(tpl.subject, vars) || "(inget ämne)"}</b><span>Till: {previewCand.email} · Från: {org.companyName}{mail.from ? " <" + mail.from + ">" : " (avsändare ej aktiverad)"} · Svar: {org.hrEmail}</span></div><div className="ats-mailprev-body">{renderTpl(tpl.body, vars)}</div></div> : <div className="ats-muted">Ingen kandidat att förhandsvisa mot.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== DESIGN ===================== */
function Style() {
  return <style>{`
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.ats-root *{box-sizing:border-box;margin:0;padding:0}
.ats-root{--paper:#F4F0E8;--paper2:#EEE9DF;--surface:#FFFCF7;--ink:#10201C;--sub:#5E655F;--muted:#8A9089;--line:#DDD5C8;--line2:#E8E1D5;--petrol:#0B5C52;--petrol-deep:#063D37;--petrol-soft:#DDEDE7;--amber:#B8763A;--amber-soft:#F6EADC;--brick:#C2513A;--brick-soft:#F5E2D9;--blue:#2C5F86;--blue-soft:#E4EDF6;--accent:#D96F4B;--accent-soft:#F5E2D9;--r-sm:10px;--r-md:14px;--r-lg:20px;--ease:cubic-bezier(.22,.61,.36,1);--gold:#8A6516;--gold-soft:#F2E8CE;
  font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased;line-height:1.45;font-size:14.5px;min-height:100vh}
.ats-root h1,.ats-root h2,.ats-root h3{font-family:'Bricolage Grotesque',sans-serif;font-weight:600;letter-spacing:-.01em}
.ats-root button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.ats-root input,.ats-root textarea,.ats-root select{font-family:inherit;font-size:14px;color:var(--ink)}
.ats-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--petrol)}
.ats-muted{color:var(--muted)}
.ats-app{min-height:100vh}
/* Sidebar hover-expand + pin */
.ats-side{position:fixed;top:0;left:0;bottom:0;width:66px;background:var(--paper2);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:14px 10px;z-index:45;overflow:hidden;transition:width .2s cubic-bezier(.4,0,.2,1)}
.ats-side:hover,.ats-app.is-pinned .ats-side{width:230px}
.ats-side:hover{box-shadow:14px 0 40px -18px rgba(0,0,0,.28)}
.ats-app.is-pinned .ats-side:hover{box-shadow:none}
.ats-lbl{opacity:0;white-space:nowrap;transition:opacity .16s}
.ats-side:hover .ats-lbl,.ats-app.is-pinned .ats-lbl{opacity:1}
.ats-side-top{display:flex;align-items:center;justify-content:space-between;padding:2px 6px 16px;min-height:34px}
.ats-brand{display:flex;align-items:center;gap:11px;min-width:0}
.ats-logo{width:32px;height:32px;border-radius:9px;background:var(--petrol);color:#fff;display:grid;place-items:center;font-family:'Bricolage Grotesque';font-weight:700;font-size:18px;flex-shrink:0}
.ats-brandtxt{font-family:'Bricolage Grotesque';font-weight:700;font-size:19px}
.ats-pin{opacity:0;color:var(--muted);flex-shrink:0;transition:.16s;padding:4px;border-radius:7px}
.ats-side:hover .ats-pin,.ats-app.is-pinned .ats-pin{opacity:1}
.ats-pin:hover{color:var(--petrol);background:rgba(0,0,0,.05)}
.ats-app.is-pinned .ats-pin{color:var(--petrol)}
.ats-nav{display:flex;flex-direction:column;gap:2px;overflow:hidden}
.ats-side-item{display:flex;align-items:center;gap:12px;padding:10px;border-radius:9px;color:var(--sub);font-size:13.5px;font-weight:500;text-align:left;transition:background .12s,color .12s}
.ats-side-item svg{flex-shrink:0}
.ats-side-item:hover{background:rgba(0,0,0,.045);color:var(--ink)}
.ats-side-item.is-active{background:var(--petrol);color:#fff}
.ats-side-foot{margin-top:auto;padding-top:10px;border-top:1px solid var(--line)}
.ats-side-user{display:flex;align-items:center;gap:10px;width:100%;padding:6px;border-radius:9px}
.ats-side-user:hover{background:rgba(0,0,0,.045)}
.ats-side-userinfo{display:flex;flex-direction:column;line-height:1.25;text-align:left}
.ats-side-userinfo b{font-size:12.5px}.ats-side-userinfo small{font-size:11px;color:var(--muted)}
/* Main */
.ats-main{margin-left:66px;min-width:0;transition:margin-left .2s cubic-bezier(.4,0,.2,1)}
.ats-app.is-pinned .ats-main{margin-left:230px}
.ats-canvas{padding:24px 28px;max-width:1200px;margin:0 auto}
.ats-view{display:flex;flex-direction:column;gap:18px}
/* Inline page header */
.ats-ph{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ats-ph-l{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-height:34px}
.ats-ph-title{font-size:23px}
.ats-ph-meta{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--muted);font-family:'IBM Plex Mono';flex-wrap:wrap}
.ats-ph-dot{color:var(--line)}
.ats-jobswitch{display:inline-flex;align-items:center;gap:5px;font-family:'Hanken Grotesk';font-size:13px;font-weight:600;color:var(--petrol);background:var(--petrol-soft);padding:4px 10px;border-radius:8px}
.ats-ph-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
/* Bottom nav (mobil) + FAB + more sheet */
.ats-bottomnav{display:none}
.ats-fab{position:fixed;right:22px;bottom:22px;width:52px;height:52px;border-radius:16px;background:var(--petrol);color:#fff;display:grid;place-items:center;box-shadow:0 10px 26px -8px rgba(12,92,82,.5);z-index:44}
.ats-fab:hover{background:var(--petrol-deep)}
.ats-more-sheet{position:fixed;inset:0;background:rgba(20,18,14,.34);z-index:60;display:flex;align-items:flex-end}
.ats-more-inner{background:var(--paper);width:100%;border-radius:18px 18px 0 0;padding:14px;display:flex;flex-direction:column;gap:4px}
.ats-more-item{display:flex;align-items:center;gap:11px;padding:14px;border-radius:11px;font-size:15px;font-weight:600;color:var(--sub)}
.ats-more-item:hover{background:var(--paper2)}
/* Menu */
.ats-menu{position:relative}
.ats-menu-pop{position:absolute;top:calc(100% + 6px);left:0;background:var(--surface);border:1px solid var(--line);border-radius:13px;box-shadow:0 16px 40px -12px rgba(0,0,0,.22);padding:6px;min-width:230px;z-index:55}
.ats-menu-pop.is-right{left:auto;right:0}
.ats-menu-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border-radius:9px;font-size:13.5px;text-align:left;color:var(--sub)}
.ats-menu-item:hover{background:var(--paper2);color:var(--ink)}
.ats-menu-item.is-active{color:var(--petrol);font-weight:600}
.ats-menu-item.is-accent{color:var(--petrol);font-weight:600}
.ats-menu-sep{height:1px;background:var(--line);margin:6px 4px}
.ats-menu-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:6px 11px 3px}
/* Panels + grids */
.ats-panel{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px}
.ats-panel-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px}
.ats-panel-h h2{font-size:16px}
.ats-summono{font-family:'IBM Plex Mono';font-size:11px;color:var(--muted)}
.ats-linkbtn{display:inline-flex;align-items:center;gap:3px;color:var(--petrol);font-size:12.5px;font-weight:600}
.ats-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.ats-grid-builder{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;align-items:start}
.ats-col-empty{text-align:center;color:var(--muted);font-size:12.5px;padding:16px 0}
/* Stats cards */
.ats-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.ats-stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:15px 16px;display:flex;align-items:center;gap:13px}
.ats-stat-ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--petrol-soft);color:var(--petrol)}
.ats-stat-ic.is-green,.ats-stat-ic.is-petrol{background:var(--petrol-soft);color:var(--petrol)}
.ats-stat-ic.is-brick{background:var(--brick-soft);color:var(--brick)}
.ats-stat-ic.is-amber{background:var(--amber-soft);color:var(--amber)}
.ats-stat-v{font-family:'Bricolage Grotesque';font-size:23px;font-weight:700;line-height:1}
.ats-stat-l{font-size:12px;color:var(--muted);margin-top:3px}
/* Hero + portfolio */
.ats-hero{background:linear-gradient(135deg,var(--petrol),var(--petrol-deep));border-radius:18px;padding:24px;color:#fff;display:flex;justify-content:space-between;gap:20px}
.ats-hero .ats-eyebrow{color:#8fd0c4}
.ats-hero-big{font-family:'Bricolage Grotesque';font-size:50px;font-weight:700;line-height:1;margin:8px 0 4px}
.ats-hero-l p{color:#cfe6e1;font-size:13.5px;max-width:250px}
.ats-hero-cta{margin-top:16px;display:inline-flex;align-items:center;gap:7px;background:#fff;color:var(--petrol-deep);padding:9px 15px;border-radius:10px;font-weight:600;font-size:13.5px}
.ats-hero-cta:disabled{opacity:.5}
.ats-hero-r{display:flex;flex-direction:column;align-items:flex-end;gap:10px;text-align:right}
.ats-hero-tag{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);padding:5px 10px;border-radius:20px;font-size:11.5px;font-weight:600}
.ats-hero-best{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.1);padding:10px;border-radius:12px}
.ats-hero-best:hover{background:rgba(255,255,255,.16)}
.ats-hero-best .ats-avatar{background:rgba(255,255,255,.2);color:#fff}
.ats-hero-best b{font-size:14px;display:block;text-align:left}.ats-hero-best span{font-size:12px;color:#bfe0d9}
.ats-hero-score{font-family:'IBM Plex Mono';font-size:12px;color:#bfe0d9}
.ats-portrow{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px;border-radius:11px;border:1px solid transparent;text-align:left}
.ats-portrow:hover{background:var(--paper2)}
.ats-portrow.is-active{border-color:var(--line);background:var(--paper2)}
.ats-portrow b{font-size:14px;display:block}.ats-portrow>div:first-child span{font-size:12px;color:var(--muted)}
.ats-portrow-r{display:flex;align-items:center;gap:8px}
.ats-portrow-q{font-size:12px;color:var(--sub);font-family:'IBM Plex Mono'}
.ats-portrow-b{font-size:11.5px;background:var(--petrol-soft);color:var(--petrol-deep);padding:3px 8px;border-radius:14px;font-weight:600}
.ats-quickgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.ats-quick{background:var(--paper2);border-radius:12px;padding:14px;text-align:center}
.ats-quick-v{font-family:'Bricolage Grotesque';font-size:22px;font-weight:700;display:block}
.ats-quick-l{font-size:11.5px;color:var(--muted)}
/* Tabs + subtabs + switch */
.ats-tabs{display:flex;gap:6px;flex-wrap:wrap;background:var(--paper2);padding:5px;border-radius:12px;width:fit-content;max-width:100%}
.ats-tab{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:9px;font-size:13px;font-weight:600;color:var(--sub)}
.ats-tab.is-on{background:var(--surface);color:var(--ink);box-shadow:0 2px 8px -4px rgba(0,0,0,.15)}
.ats-tab-n{font-family:'IBM Plex Mono';font-size:11px;background:var(--line2);color:var(--sub);padding:1px 7px;border-radius:10px}
.ats-tab.is-on.tone-green .ats-tab-n{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-tab.is-on.tone-brick .ats-tab-n{background:var(--brick-soft);color:var(--brick)}
.ats-tab.is-on.tone-amber .ats-tab-n{background:var(--amber-soft);color:var(--gold)}
.ats-tab.is-on.tone-gold .ats-tab-n{background:var(--gold-soft);color:var(--gold)}
.ats-tab.is-on.tone-petrol .ats-tab-n{background:var(--blue-soft);color:var(--blue)}
.ats-subtabs{display:flex;gap:6px;background:var(--paper2);padding:5px;border-radius:12px;width:fit-content;flex-wrap:wrap}
.ats-subtab{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:9px;font-size:13px;font-weight:600;color:var(--sub)}
.ats-subtab.is-on{background:var(--surface);color:var(--petrol);box-shadow:0 2px 8px -4px rgba(0,0,0,.15)}
.ats-switch{width:44px;height:25px;border-radius:14px;background:var(--line);position:relative;transition:.18s;flex-shrink:0}
.ats-switch.is-on{background:var(--petrol)}
.ats-switch-dot{position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;transition:.18s}
.ats-switch.is-on .ats-switch-dot{left:22px}
/* Dial */
.ats-dial{position:relative;flex-shrink:0}
.ats-dial-track{fill:none;stroke:var(--line2);stroke-width:7}
.ats-dial-arc{fill:none;stroke-width:7;stroke-linecap:round;transition:stroke-dashoffset .1s}
.ats-dial.is-high .ats-dial-arc{stroke:var(--petrol)}
.ats-dial.is-mid .ats-dial-arc{stroke:var(--amber)}
.ats-dial.is-low .ats-dial-arc{stroke:#B4835B}
.ats-dial.is-ko .ats-dial-arc{stroke:var(--brick)}
.ats-dial-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque'}
.ats-dial-num b{font-size:20px;font-weight:700}.ats-dial-num small{font-size:10px;color:var(--muted);margin-left:1px}
/* Stars/tags/missing/votes */
.ats-stars{display:inline-flex;gap:2px}
.ats-stars button{color:var(--amber);padding:1px}.ats-stars button:not(.is-on){color:var(--line)}.ats-stars button:disabled{cursor:default}
.ats-tags{display:inline-flex;flex-wrap:wrap;gap:5px}
.ats-tagpill{display:inline-flex;align-items:center;gap:4px;background:var(--amber-soft);color:var(--gold);font-size:11px;font-weight:600;padding:3px 8px;border-radius:14px}
.ats-missing{display:inline-flex;flex-wrap:wrap;gap:5px}
.ats-misschip{display:inline-flex;align-items:center;gap:4px;background:var(--brick-soft);color:var(--brick);font-size:10.5px;font-weight:600;padding:3px 7px;border-radius:12px}
.ats-votesum{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--sub);font-family:'IBM Plex Mono'}
/* Status pill */
.ats-statuspill{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:13px;background:var(--paper2);color:var(--sub);white-space:nowrap}
.ats-statuspill.is-shortlist{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-statuspill.is-interview{background:var(--blue-soft);color:var(--blue)}
.ats-statuspill.is-reserve{background:var(--amber-soft);color:var(--gold)}
.ats-statuspill.is-reject{background:var(--brick-soft);color:var(--brick)}
.ats-statuspill.is-hired{background:var(--gold-soft);color:var(--gold)}
/* Avatar */
.ats-avatar{width:40px;height:40px;border-radius:11px;background:var(--petrol-soft);color:var(--petrol-deep);display:grid;place-items:center;font-weight:700;font-size:15px;font-family:'Bricolage Grotesque';flex-shrink:0}
.ats-avatar.is-sm{width:30px;height:30px;font-size:12px;border-radius:8px}
.ats-avatar.is-xs{width:22px;height:22px;font-size:10px;border-radius:6px}
/* Queue */
.ats-queue-filters{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.ats-search{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:6px 10px;color:var(--muted)}
.ats-search input{border:none;outline:none;background:none;font-size:13px;width:120px}
.ats-chip{padding:6px 11px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font-size:12.5px;font-weight:500;color:var(--sub)}
.ats-chip:hover{border-color:var(--petrol)}
.ats-chip.is-on{background:var(--petrol);color:#fff;border-color:var(--petrol)}
.ats-rolebar{display:flex;align-items:center;gap:8px;background:var(--amber-soft);color:var(--gold);padding:9px 13px;border-radius:11px;font-size:12.5px;font-weight:500}
.ats-progress{display:flex;align-items:center;gap:11px;max-width:560px;margin:0 auto;width:100%}
.ats-progress-track{flex:1;height:6px;background:var(--line2);border-radius:4px;overflow:hidden}
.ats-progress-fill{height:100%;background:var(--petrol);border-radius:4px;transition:width .4s}
.ats-progress-txt{font-family:'IBM Plex Mono';font-size:11.5px;color:var(--muted);white-space:nowrap}
.ats-deck{position:relative;height:540px;max-width:560px;margin:0 auto;width:100%;touch-action:none;overscroll-behavior:contain}
.ats-card{position:absolute;inset:0;background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 8px 30px -14px rgba(0,0,0,.2);overflow:hidden}
.ats-card.is-top{cursor:grab;box-shadow:0 20px 50px -18px rgba(0,0,0,.32);touch-action:none}
.ats-card.is-top:active{cursor:grabbing}
.ats-card.is-behind{pointer-events:none}
.ats-stamp{position:absolute;top:24px;z-index:8;font-family:'Bricolage Grotesque';font-weight:700;font-size:22px;padding:6px 15px;border-radius:11px;border:3px solid;text-transform:uppercase}
.ats-stamp.is-right{right:24px;color:var(--petrol);border-color:var(--petrol);transform:rotate(10deg)}
.ats-stamp.is-left{left:24px;color:var(--brick);border-color:var(--brick);transform:rotate(-10deg)}
.ats-stamp.is-up{left:50%;top:20px;transform:translateX(-50%);color:var(--blue);border-color:var(--blue)}
.ats-stamp.is-down{left:50%;bottom:24px;top:auto;transform:translateX(-50%);color:var(--gold);border-color:var(--gold)}
/* Card face (praktisk, ingen inre scroll) */
.ats-face{padding:18px;height:100%;display:flex;flex-direction:column;gap:11px}
.ats-face-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ats-face-id{display:flex;align-items:center;gap:12px;min-width:0}
.ats-face-idtxt{min-width:0}
.ats-name{font-family:'Bricolage Grotesque';font-weight:600;font-size:18px;display:flex;align-items:center;gap:6px}
.ats-starred{color:var(--amber)}
.ats-face-mail{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono';display:flex;align-items:center;gap:5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-face-statusrow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ats-face-src{font-size:11.5px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-ko{display:flex;align-items:center;gap:7px;background:var(--brick-soft);color:var(--brick);padding:9px 12px;border-radius:10px;font-size:12.5px;font-weight:600}
.ats-ko.is-mini{font-size:11.5px;padding:6px 9px}
.ats-below{display:flex;align-items:center;gap:6px;background:var(--amber-soft);color:var(--gold);padding:8px 12px;border-radius:10px;font-size:12px;font-weight:600}
.ats-below.is-ok{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-musts{display:flex;flex-wrap:wrap;gap:6px}
.ats-must{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:14px}
.ats-must.is-ok{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-must.is-no{background:var(--brick-soft);color:var(--brick)}
.ats-flagcols{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ats-flagcol{display:flex;flex-direction:column;gap:5px}
.ats-flagcol-h{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;display:flex;align-items:center;gap:5px;margin-bottom:1px}
.ats-flagcol-h.is-green{color:var(--petrol)}.ats-flagcol-h.is-red{color:var(--brick)}
.ats-flag{font-size:11.5px;padding:4px 9px;border-radius:8px;font-weight:500}
.ats-flag.is-green{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-flag.is-red{background:var(--brick-soft);color:var(--brick)}
.ats-flag-none{font-size:11.5px;color:var(--muted);padding:2px}
.ats-break{background:var(--paper2);border-radius:13px;padding:13px;margin-top:auto}
.ats-break-h{display:flex;justify-content:space-between;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px}
.ats-break-row{display:flex;align-items:center;gap:10px;padding:5px 0}
.ats-break-ic{width:26px;height:26px;border-radius:8px;background:var(--surface);display:grid;place-items:center;color:var(--petrol);flex-shrink:0}
.ats-break-main{flex:1;min-width:0}
.ats-break-label{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;gap:8px}
.ats-break-label>span:first-child{font-weight:500}
.ats-break-detail{color:var(--muted);font-family:'IBM Plex Mono';font-size:11px;white-space:nowrap}
.ats-break-bar{height:5px;background:var(--line2);border-radius:3px;overflow:hidden}
.ats-break-bar-fill{height:100%;background:var(--petrol);border-radius:3px;transition:width .5s}
.ats-break-pts{font-family:'Bricolage Grotesque';font-weight:700;font-size:13px;color:var(--petrol);width:34px;text-align:right}
.ats-face-missing{display:flex}
.ats-face-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:2px}
.ats-face-foot-l{display:flex;flex-direction:column;gap:3px;min-width:0}
.ats-face-last{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono';display:flex;align-items:center;gap:5px}
.ats-face-foot-r{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ats-iconbtn{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);display:grid;place-items:center;color:var(--muted)}
.ats-iconbtn.is-on{color:var(--amber);border-color:var(--amber)}
.ats-openbtn{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:var(--petrol);background:var(--petrol-soft);padding:8px 12px;border-radius:9px}
/* Swipe actions */
.ats-actions{display:flex;justify-content:center;gap:14px}
.ats-act{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);background:var(--surface);box-shadow:0 6px 18px -8px rgba(0,0,0,.2);transition:.14s}
.ats-act:hover:not(:disabled){transform:translateY(-3px)}
.ats-act:disabled{opacity:.4}
.ats-act.is-reject{color:var(--brick)}.ats-act.is-reject:hover:not(:disabled){background:var(--brick);color:#fff}
.ats-act.is-reserve{width:50px;height:50px;color:var(--gold);align-self:center}.ats-act.is-reserve:hover:not(:disabled){background:var(--gold);color:#fff}
.ats-act.is-interview{width:50px;height:50px;color:var(--blue);align-self:center}.ats-act.is-interview:hover:not(:disabled){background:var(--blue);color:#fff}
.ats-act.is-yes{color:var(--petrol)}.ats-act.is-yes:hover:not(:disabled){background:var(--petrol);color:#fff}
.ats-hint{text-align:center;font-size:12px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-hint-up,.ats-hint-dn{font-weight:600}
.ats-empty{max-width:420px;margin:50px auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
.ats-empty-badge{width:60px;height:60px;border-radius:17px;background:var(--petrol-soft);color:var(--petrol);display:grid;place-items:center;margin-bottom:6px}
.ats-empty h3{font-size:19px}.ats-empty p{color:var(--muted);font-size:13.5px}
/* Candidates table */
.ats-cand-tools{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.ats-select{padding:7px 10px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font-size:13px;color:var(--sub)}
.ats-select.is-sm{padding:5px 8px;font-size:12px}
.ats-cmp-hint{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--petrol);font-weight:600;margin-left:auto}
.ats-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font-size:12.5px;font-weight:600;color:var(--sub)}
.ats-ghost:hover:not(:disabled){border-color:var(--petrol);color:var(--petrol)}
.ats-ghost:disabled{opacity:.5}
.ats-ghost.is-sm{padding:5px 9px;font-size:11.5px}
.ats-ghost.is-accent{border-color:var(--petrol);color:var(--petrol);background:var(--petrol-soft)}
.ats-ghost.is-danger{color:var(--brick);border-color:var(--brick-soft)}
.ats-ghost.is-danger:hover{border-color:var(--brick)}
.ats-table{background:var(--surface);border:1px solid var(--line);border-radius:15px;overflow:hidden}
.ats-tr{display:grid;grid-template-columns:34px 2.6fr 1.2fr .9fr 1.1fr 38px;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--line2)}
.ats-tr:last-child{border-bottom:none}
.ats-tr.is-ko{background:rgba(166,65,43,.03)}
.ats-th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}
.ats-cmpcheck{width:16px;height:16px;accent-color:var(--petrol)}
.ats-td-name{display:flex;align-items:center;gap:10px;text-align:left;min-width:0}
.ats-td-name b{font-size:13.5px;display:flex;align-items:center;gap:5px}
.ats-td-flags{display:flex;gap:8px;margin-top:2px;align-items:center;flex-wrap:wrap}
.ats-td-mail{font-size:11.5px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-td-score{display:flex;align-items:center;gap:8px}
.ats-td-bar{flex:1;height:6px;background:var(--line2);border-radius:4px;overflow:hidden;max-width:70px}
.ats-td-bar>div{height:100%;border-radius:4px}.ats-td-bar .is-high{background:var(--petrol)}.ats-td-bar .is-mid{background:var(--amber)}.ats-td-bar .is-low,.ats-td-bar .is-ko{background:#B4835B}
.ats-td-score b{font-family:'Bricolage Grotesque';font-size:13.5px}
.ats-td-score b.is-high{color:var(--petrol)}.ats-td-score b.is-mid{color:var(--amber)}.ats-td-score b.is-low,.ats-td-score b.is-ko{color:var(--muted)}
.ats-td-votes{font-size:11px}
.ats-td-go{display:grid;place-items:center;color:var(--muted)}.ats-td-go:hover{color:var(--petrol)}
/* Drawer */
.ats-drawer-bg{position:fixed;inset:0;background:rgba(20,18,14,.36);display:flex;justify-content:flex-end;z-index:60}
.ats-drawer{width:460px;max-width:94vw;background:var(--paper);height:100%;display:flex;flex-direction:column;box-shadow:-16px 0 44px -20px rgba(0,0,0,.4);animation:slidein .22s cubic-bezier(.4,0,.2,1)}
@keyframes slidein{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
.ats-drawer-h{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line);background:var(--surface)}
.ats-drawer-h h3{font-size:18px}.ats-drawer-h span{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-drawer-body{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:16px}
.ats-drawer-score{display:flex;align-items:center;gap:16px}
.ats-drawer-score>div{display:flex;flex-direction:column;gap:7px;align-items:flex-start}
.ats-dupbox{display:flex;flex-wrap:wrap;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:10px 12px;font-size:12px;color:var(--sub)}
.ats-dup-item{background:var(--paper2);padding:3px 8px;border-radius:10px;font-size:11px}
.ats-drawer-sec-h{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:600;margin-bottom:9px;display:flex;align-items:center;gap:6px}
.ats-tline{display:flex;flex-direction:column;gap:2px}
.ats-tline-row{display:flex;align-items:baseline;gap:10px;padding:6px 0;position:relative}
.ats-tline-dot{width:7px;height:7px;border-radius:50%;background:var(--petrol);flex-shrink:0;position:relative;top:5px}
.ats-tline-row:not(:last-child) .ats-tline-dot:after{content:'';position:absolute;top:9px;left:3px;width:1px;height:20px;background:var(--line)}
.ats-tline-main{flex:1;font-size:12.5px;color:var(--sub)}.ats-tline-main b{color:var(--ink);font-size:12.5px}
.ats-tline-time{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono';white-space:nowrap}
.ats-verdicts{display:flex;gap:8px}
.ats-verdict{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font-size:13px;font-weight:600;color:var(--sub)}
.ats-verdict.is-on.is-yes{background:var(--petrol);color:#fff;border-color:var(--petrol)}
.ats-verdict.is-on.is-maybe{background:var(--amber);color:#fff;border-color:var(--amber)}
.ats-verdict.is-on.is-no{background:var(--brick);color:#fff;border-color:var(--brick)}
.ats-verdict:disabled{opacity:.5}
.ats-cons-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.ats-cons{font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:13px;background:var(--paper2)}
.ats-cons.is-yes{background:var(--petrol-soft);color:var(--petrol-deep)}.ats-cons.is-no{background:var(--brick-soft);color:var(--brick)}.ats-cons.is-maybe{background:var(--amber-soft);color:var(--gold)}
.ats-cmt{display:flex;gap:9px;font-size:13px;margin-bottom:8px}
.ats-cmt b{font-size:12.5px}.ats-cmt small{color:var(--muted);font-size:11px;margin-left:4px}.ats-cmt p{color:var(--sub);margin-top:2px}
.ats-cmtbox{display:flex;gap:8px;margin-top:8px}
.ats-cmtbox input{flex:1;border:1px solid var(--line);border-radius:9px;padding:8px 11px;background:var(--surface);outline:none}
.ats-cmtbox button{width:38px;border-radius:9px;background:var(--petrol);color:#fff;display:grid;place-items:center}.ats-cmtbox button:disabled{opacity:.4}
.ats-drawer-msgs{display:flex;flex-wrap:wrap;gap:8px}
.ats-drawer-foot{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--line);background:var(--surface);gap:10px;flex-wrap:wrap}
.ats-drawer-decide{display:flex;gap:7px;align-items:center}
.ats-drawer-decide>button{height:38px;border-radius:9px;display:grid;place-items:center;padding:0 10px}
.ats-dq-rej{background:var(--brick-soft);color:var(--brick);width:40px}.ats-dq-rej:hover{background:var(--brick);color:#fff}
.ats-dq-res{background:var(--amber-soft);color:var(--gold);width:40px}.ats-dq-res:hover{background:var(--gold);color:#fff}
.ats-dq-int{background:var(--blue-soft);color:var(--blue);width:40px}.ats-dq-int:hover{background:var(--blue);color:#fff}
.ats-dq-yes{background:var(--petrol-soft);color:var(--petrol-deep);width:40px}.ats-dq-yes:hover{background:var(--petrol);color:#fff}
.ats-dq-hire{display:inline-flex!important;align-items:center;gap:5px;background:var(--gold-soft);color:var(--gold);font-size:12.5px;font-weight:600}.ats-dq-hire:hover{background:var(--gold);color:#fff}
/* Compare modal */
.ats-cmp-modal{padding:18px 20px;overflow-x:auto}
.ats-cmp-grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden;min-width:400px}
.ats-cmp-corner{background:var(--paper2)}
.ats-cmp-head{background:var(--surface);padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;position:relative}
.ats-cmp-head b{font-size:13px}
.ats-cmp-head button{position:absolute;top:5px;right:5px;color:var(--muted)}.ats-cmp-head button:hover{color:var(--brick)}
.ats-cmp-rl{background:var(--paper2);padding:11px;font-size:12px;font-weight:600;color:var(--sub);display:flex;align-items:center}
.ats-cmp-cell{background:var(--surface);padding:11px;font-size:12.5px;color:var(--sub);display:flex;align-items:center;justify-content:center;text-align:center}
.ats-cmp-cell b.is-high{color:var(--petrol)}.ats-cmp-cell b.is-mid{color:var(--amber)}.ats-cmp-cell b.is-low,.ats-cmp-cell b.is-ko{color:var(--muted)}
.ats-ok{color:var(--petrol);font-weight:600}.ats-x{color:var(--brick);font-weight:600}
/* Builder */
.ats-builder-note{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--muted);background:var(--paper2);padding:10px 12px;border-radius:10px;line-height:1.5}
.ats-builder-note svg{flex-shrink:0;margin-top:2px;color:var(--petrol)}
.ats-blocklist{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.ats-blockrow{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-align:left;width:100%}
.ats-blockrow.is-sel{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-blockrow-ic{width:30px;height:30px;border-radius:9px;background:var(--paper2);display:grid;place-items:center;color:var(--petrol);flex-shrink:0}
.ats-blockrow-txt{flex:1;min-width:0}.ats-blockrow-txt b{font-size:13.5px;display:block}
.ats-blockrow-meta{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-blockrow-acts{display:flex;gap:3px}
.ats-blockrow-acts>span{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;color:var(--muted)}
.ats-blockrow-acts>span:hover{background:var(--paper2);color:var(--ink)}
.ats-blockrow-acts>span.is-off{opacity:.3;pointer-events:none}
.ats-blockrow-acts>span.is-danger:hover{background:var(--brick-soft);color:var(--brick)}
.ats-fset{display:flex;flex-direction:column;gap:12px}
.ats-fset-row{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--sub)}
.ats-fset-row span{font-weight:600}
.ats-fset-row input,.ats-fset-row select{border:1px solid var(--line);border-radius:8px;padding:7px 10px;background:var(--surface)}
.ats-fset-row input[type=range]{padding:0}
.ats-fset-toggles{display:flex;flex-wrap:wrap;gap:6px}
.ats-toggle{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);font-size:11.5px;font-weight:600;color:var(--sub)}
.ats-toggle.is-on{background:var(--petrol);color:#fff;border-color:var(--petrol)}
.ats-toggle.is-ko.is-on{background:var(--brick);border-color:var(--brick)}
.ats-advtoggle{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--petrol)}
.ats-adv{display:flex;flex-direction:column;gap:11px;padding:12px;background:var(--paper2);border-radius:10px}
.ats-fset-cond-h{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--sub);margin-bottom:8px}
.ats-fset-condrow{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--petrol-soft);padding:7px 11px;border-radius:9px;font-size:12px;color:var(--petrol-deep)}
.ats-fset-condadd{display:flex;gap:7px}.ats-fset-condadd select{flex:1}
.ats-buildsum{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ats-buildsum>div{background:var(--paper2);border-radius:11px;padding:12px;text-align:center}
.ats-buildsum span{font-size:11px;color:var(--muted);display:block}
.ats-buildsum b{font-family:'Bricolage Grotesque';font-size:22px;font-weight:700}
.ats-profilebtn{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--petrol);background:var(--petrol-soft);padding:6px 11px;border-radius:9px}
.ats-wrow{display:flex;align-items:center;gap:11px;padding:9px 0}
.ats-wrow-ic{width:28px;height:28px;border-radius:8px;background:var(--paper2);display:grid;place-items:center;color:var(--petrol);flex-shrink:0}
.ats-wrow-main{flex:1}
.ats-wrow-top{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}
.ats-wrow-top b{font-family:'Bricolage Grotesque';color:var(--petrol)}
.ats-range{width:100%;accent-color:var(--petrol);height:4px}
.ats-mustedit{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.ats-mustedit-h{font-size:11.5px;font-weight:600;color:var(--sub);margin-bottom:10px}
.ats-thresh-top{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
.ats-thresh-top b{font-family:'Bricolage Grotesque';color:var(--brick)}
.ats-rulelist{display:flex;flex-direction:column;gap:7px;margin:10px 0}
.ats-rulechip{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sub);background:var(--surface);border:1px solid var(--line);padding:8px 11px;border-radius:9px}
.ats-rulechip b{color:var(--amber)}
.ats-rulechip button{margin-left:auto;color:var(--muted)}.ats-rulechip button:hover{color:var(--brick)}
.ats-ruleadd,.ats-arule-add{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:6px}
.ats-chipset{display:flex;flex-wrap:wrap;gap:7px}
.ats-selchip{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:20px;border:1px solid var(--line);background:var(--surface);font-size:12.5px;font-weight:500;color:var(--sub)}
.ats-selchip.is-on{background:var(--petrol);color:#fff;border-color:var(--petrol)}
.ats-selchip.is-must{border-color:var(--amber)}.ats-selchip.is-must.is-on{background:var(--amber);border-color:var(--amber)}
.ats-mustdot{font-size:9px;background:rgba(0,0,0,.12);padding:1px 5px;border-radius:6px;margin-left:2px}
/* Automation panel */
.ats-autopanel .ats-panel-h h2{display:flex;align-items:center;gap:8px}
.ats-auto-empty{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px 0}
.ats-auto-empty p{color:var(--muted);font-size:13px}
.ats-arules{display:flex;flex-direction:column;gap:9px;margin:12px 0}
.ats-arule{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:11px;background:var(--surface)}
.ats-arule-txt{display:flex;align-items:center;gap:9px;flex:1;font-size:13px}
.ats-arule-txt svg{color:var(--muted)}
.ats-arule-then{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:8px}
.ats-arule-then.is-shortlist{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-arule-then.is-interview{background:var(--blue-soft);color:var(--blue)}
.ats-arule-then.is-reserve{background:var(--amber-soft);color:var(--gold)}
.ats-arule-then.is-reject{background:var(--brick-soft);color:var(--brick)}
.ats-arule-then.is-flag{background:var(--amber-soft);color:var(--gold)}
.ats-arule button.is-danger:hover{color:var(--brick)}
/* Apply form */
.ats-preview-wrap{width:100%}
.ats-apply{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.ats-apply-top{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;background:linear-gradient(135deg,var(--petrol),var(--petrol-deep));color:#fff}
.ats-apply-co{font-size:12px;color:#a9d6cd;font-family:'IBM Plex Mono'}
.ats-apply-title{font-family:'Bricolage Grotesque';font-weight:700;font-size:20px;margin-top:2px}
.ats-apply-steps{display:flex;gap:6px;padding:14px 22px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.ats-apply-step{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);background:var(--paper2);padding:5px 10px;border-radius:20px}
.ats-apply-step>span{font-weight:600}
.ats-apply-step.is-on{background:var(--petrol);color:#fff}
.ats-apply-step.is-done{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-apply-body{padding:22px}
.ats-apply-fields{display:flex;flex-direction:column;gap:16px}
.ats-apply-f{display:flex;flex-direction:column;gap:7px}
.ats-apply-f>span{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.ats-inp{border:1px solid var(--line);border-radius:9px;padding:9px 12px;background:var(--surface);outline:none;width:100%}
.ats-inp:focus{border-color:var(--petrol)}
.ats-inp.is-err{border-color:var(--brick);background:var(--brick-soft)}
.ats-inp.is-sm{padding:6px 9px;font-size:12px;width:auto}
.ats-err-txt{font-size:11.5px;color:var(--brick);font-weight:500}
.ats-fileinp{display:inline-flex;align-items:center;gap:8px;border:1px dashed var(--line);border-radius:9px;padding:11px 14px;color:var(--sub);font-size:13px;cursor:pointer;background:var(--paper2)}
.ats-yn{display:flex;gap:8px}
.ats-yn button{flex:1;padding:9px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font-weight:600;color:var(--sub)}
.ats-yn button.is-on{background:var(--petrol);color:#fff;border-color:var(--petrol)}
.ats-apply-gdpr{display:flex;flex-direction:column;gap:8px}
.ats-gdpr-check{display:flex;align-items:flex-start;gap:11px;background:var(--paper2);border:1px solid var(--line);border-radius:12px;padding:14px;font-size:13.5px;color:var(--sub);cursor:pointer}
.ats-gdpr-check.is-err{border-color:var(--brick)}
.ats-gdpr-check input{margin-top:3px;width:16px;height:16px;accent-color:var(--petrol)}
.ats-gdpr-text{font-size:12px;color:var(--muted);line-height:1.6;padding:0 4px}
.ats-apply-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-top:1px solid var(--line);background:var(--paper2)}
.ats-send{display:inline-flex;align-items:center;gap:8px;background:var(--petrol);color:#fff;padding:11px 20px;border-radius:10px;font-weight:600;font-size:14px}
.ats-send:hover{background:var(--petrol-deep)}
.ats-send.is-off{opacity:.45;cursor:not-allowed}
.ats-applied{max-width:420px;margin:20px auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px}
.ats-applied h3{font-size:22px}
/* Share/QR/versions */
.ats-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.ats-field-l{font-size:12px;font-weight:600;color:var(--sub)}
.ats-field input,.ats-field textarea,.ats-field select{border:1px solid var(--line);border-radius:9px;padding:9px 12px;background:var(--surface);outline:none;width:100%}
.ats-field input:focus,.ats-field textarea:focus{border-color:var(--petrol)}
.ats-tpl-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ats-copyrow{display:flex;gap:8px}
.ats-copyrow input{flex:1;border:1px solid var(--line);border-radius:9px;padding:9px 12px;background:var(--paper2);font-family:'IBM Plex Mono';font-size:12px;color:var(--sub)}
.ats-copyrow button{width:42px;border-radius:9px;background:var(--petrol);color:#fff;display:grid;place-items:center;flex-shrink:0}
.ats-qrpanel{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:12px 0}
.ats-qrpanel p{font-size:12px;color:var(--muted);max-width:220px}
.ats-qr{border:1px solid var(--line);border-radius:12px}
.ats-qr-fallback{padding:30px;color:var(--muted);font-size:12px}
.ats-versions{margin-top:8px}
.ats-versions summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--petrol);display:flex;align-items:center;gap:6px;list-style:none}
.ats-versions summary::-webkit-details-marker{display:none}
.ats-versions .ats-tline{margin-top:10px}
/* Settings */
.ats-smtp-status{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--gold);background:var(--gold-soft);padding:4px 10px;border-radius:14px}
.ats-honestbar{display:flex;align-items:flex-start;gap:8px;background:var(--amber-soft);color:#7a5410;padding:11px 13px;border-radius:10px;font-size:12px;line-height:1.55;margin-bottom:12px}
.ats-honestbar svg{flex-shrink:0;margin-top:1px}
.ats-envbox{background:var(--ink);border-radius:10px;padding:14px;overflow-x:auto}
.ats-envbox pre{font-family:'IBM Plex Mono';font-size:11.5px;color:#d9d6cf;line-height:1.7;white-space:pre}
.ats-tpl3{display:grid;grid-template-columns:.9fr 1.4fr 1.1fr;gap:16px;align-items:start}
.ats-tpllist{display:flex;flex-direction:column;gap:6px}
.ats-tplitem{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:10px;border:1px solid var(--line);background:var(--surface);text-align:left;color:var(--sub)}
.ats-tplitem.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-tplitem b{font-size:13px;display:block;color:var(--ink)}.ats-tplitem span{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-tplitem>div{flex:1;min-width:0}
.ats-tpledit{display:flex;flex-direction:column}
.ats-varchips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--muted)}
.ats-varchips button{font-family:'IBM Plex Mono';font-size:10.5px;background:var(--paper2);border:1px solid var(--line);padding:3px 7px;border-radius:7px;color:var(--petrol)}
.ats-varchips button:hover{background:var(--petrol-soft)}
.ats-tplprev{position:sticky;top:0}
.ats-mailprev{border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ats-mailprev-h{padding:12px 14px;background:var(--paper2);border-bottom:1px solid var(--line)}
.ats-mailprev-h b{font-size:13.5px;display:block}.ats-mailprev-h span{font-size:10.5px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-mailprev-body{padding:14px;font-size:13px;color:var(--sub);white-space:pre-wrap;line-height:1.6;max-height:280px;overflow-y:auto}
/* Mejllog */
.ats-msglog{display:flex;flex-direction:column;gap:2px}
.ats-msglog-head,.ats-msglog-row{display:grid;grid-template-columns:74px 1.3fr 1.9fr 1.1fr .7fr 44px;gap:10px;align-items:center;padding:9px 10px}
.ats-msglog-head{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600}
.ats-msglog-row{border-top:1px solid var(--line2);font-size:12.5px}
.ats-msgstatus{font-size:11px;font-weight:700;padding:3px 9px;border-radius:8px;text-align:center;white-space:nowrap}
.ats-msgstatus.is-queued{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-msgstatus.is-failed{background:var(--brick-soft);color:var(--brick)}
.ats-msglog-to,.ats-msglog-subj,.ats-msglog-tpl{display:flex;flex-direction:column;min-width:0}
.ats-msglog-to small,.ats-msglog-tpl small{font-size:10.5px;color:var(--muted);font-family:'IBM Plex Mono';overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-msglog-subj{overflow:hidden}.ats-msglog-subj>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-msgerr{color:var(--brick)!important}
.ats-msglog-time{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono'}
/* Analytics */
.ats-funnel{display:flex;flex-direction:column;gap:11px}
.ats-funnel-row{display:flex;align-items:center;gap:12px}
.ats-funnel-l{width:100px;font-size:12.5px;color:var(--sub);flex-shrink:0}
.ats-funnel-bar{flex:1;background:var(--line2);border-radius:7px;overflow:hidden;height:26px}
.ats-funnel-fill{height:100%;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;font-weight:700;font-family:'IBM Plex Mono';border-radius:7px;min-width:24px}
.ats-funnel-fill.is-neutral{background:var(--muted)}.ats-funnel-fill.is-green{background:var(--petrol)}.ats-funnel-fill.is-amber{background:var(--amber)}.ats-funnel-fill.is-gold{background:var(--gold)}
.ats-hist{display:flex;align-items:flex-end;justify-content:space-around;gap:10px;height:170px;padding-top:10px}
.ats-hist-col{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1}
.ats-hist-bar{width:100%;max-width:52px;background:var(--petrol);border-radius:8px 8px 0 0;display:flex;justify-content:center;align-items:flex-start;padding-top:5px;min-height:4px;transition:height .4s}
.ats-hist-bar span{color:#fff;font-size:11px;font-weight:700;font-family:'IBM Plex Mono'}
.ats-hist-x{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-qperf{display:flex;flex-direction:column;gap:8px}
.ats-qperf-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;background:var(--paper2);border-radius:9px}
.ats-qperf-l{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--sub)}
.ats-qperf-n{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-srclist{display:flex;flex-direction:column;gap:10px}
.ats-src-row{display:flex;align-items:center;gap:11px}
.ats-src-l{width:80px;font-size:12.5px;color:var(--sub);flex-shrink:0}
.ats-src-bar{flex:1;height:9px;background:var(--line2);border-radius:5px;overflow:hidden}
.ats-src-bar>div{height:100%;background:var(--petrol);border-radius:5px}
.ats-src-n{font-size:11.5px;color:var(--muted);font-family:'IBM Plex Mono';white-space:nowrap}
/* Team */
.ats-permtable{display:flex;flex-direction:column;gap:2px}
.ats-permrow{display:grid;grid-template-columns:1.6fr repeat(6,1fr);align-items:center;gap:6px;padding:9px 8px;border-radius:9px}
.ats-permrow.is-me{background:var(--petrol-soft)}
.ats-permhead{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.ats-permhead>span{text-align:center}
.ats-permrow>span{text-align:center;display:flex;justify-content:center}
.ats-permname{justify-content:flex-start!important;gap:8px;font-size:13px;font-weight:600}
.ats-permname small{color:var(--muted);font-weight:400;font-size:11px;display:block}
.ats-permyes{color:var(--petrol)}.ats-permno{color:var(--line)}
.ats-log{display:flex;flex-direction:column;gap:2px;max-height:360px;overflow-y:auto}
.ats-log-row{display:flex;gap:10px;padding:8px 0}
.ats-log-dot{width:7px;height:7px;border-radius:50%;background:var(--petrol);flex-shrink:0;margin-top:6px}
.ats-log-main{font-size:13px}.ats-log-main b{font-size:13px}
.ats-log-meta{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono';margin-top:2px}
/* Toast + modal + print */
.ats-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;background:var(--ink);color:#fff;padding:12px 20px;border-radius:12px;font-size:13.5px;font-weight:500;box-shadow:0 12px 34px -10px rgba(0,0,0,.4);z-index:80;animation:toastin .25s;max-width:90vw}
@keyframes toastin{from{transform:translate(-50%,14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.ats-toast.is-ok{background:var(--petrol)}.ats-toast.is-warn{background:var(--brick)}
.ats-modal-bg{position:fixed;inset:0;background:rgba(20,18,14,.4);display:grid;place-items:center;z-index:70;padding:20px}
.ats-modal{background:var(--paper);border-radius:18px;width:480px;max-width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 24px 60px -20px rgba(0,0,0,.4)}
.ats-modal.is-wide{width:680px}
.ats-modal-h{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--paper);z-index:2}
.ats-modal-h h3{font-size:17px}
.ats-modal-h button{color:var(--muted)}.ats-modal-h button:hover{color:var(--ink)}
.ats-nj{padding:20px 22px}
.ats-tmplgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:8px 0 16px}
.ats-tmpl{display:flex;flex-direction:column;gap:3px;padding:13px;border-radius:12px;border:1px solid var(--line);background:var(--surface);text-align:left}
.ats-tmpl.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-tmpl-ic{width:30px;height:30px;border-radius:9px;background:var(--paper2);display:grid;place-items:center;color:var(--petrol);margin-bottom:5px}
.ats-tmpl b{font-size:13px}.ats-tmpl span{font-size:11px;color:var(--muted)}
.ats-reasons{display:flex;flex-direction:column;gap:7px;padding:20px 22px 8px}
.ats-reason{padding:12px 15px;border-radius:10px;border:1px solid var(--line);background:var(--surface);text-align:left;font-size:13.5px;font-weight:500;color:var(--sub)}
.ats-reason:hover{border-color:var(--brick);background:var(--brick-soft);color:var(--brick)}
.ats-reason-note{font-size:11.5px;color:var(--muted);padding:6px 22px 20px;line-height:1.5}
.ats-printwrap{position:fixed;inset:0;background:var(--paper);z-index:90;overflow-y:auto}
.ats-print-toolbar{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;padding:14px 26px;background:var(--surface);border-bottom:1px solid var(--line);font-weight:600}
.ats-print-toolbar>div{display:flex;gap:9px}
.ats-printdoc{max-width:760px;margin:26px auto;padding:0 20px}
.ats-pr{background:#fff;border:1px solid var(--line);border-radius:12px;padding:34px}
.ats-pr-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--ink);padding-bottom:16px;margin-bottom:16px}
.ats-pr-co{font-family:'IBM Plex Mono';font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.ats-pr-title{font-family:'Bricolage Grotesque';font-weight:700;font-size:22px;margin-top:4px}
.ats-pr-score{text-align:right}.ats-pr-score b{font-family:'Bricolage Grotesque';font-size:38px;font-weight:700;color:var(--petrol)}.ats-pr-score small{display:block;font-size:11px;color:var(--muted)}
.ats-pr-name{font-family:'Bricolage Grotesque';font-size:19px;font-weight:600;display:flex;align-items:center;gap:10px}
.ats-pr-ko{font-size:12px;background:var(--brick-soft);color:var(--brick);padding:2px 9px;border-radius:8px;font-family:'Hanken Grotesk'}
.ats-pr-sub{font-family:'IBM Plex Mono';font-size:12px;color:var(--muted);margin:4px 0 18px}
.ats-pr-table{width:100%;border-collapse:collapse;font-size:13px}
.ats-pr-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line)}
.ats-pr-table td{padding:9px 10px;border-bottom:1px solid var(--line2)}
.ats-pr-mot{margin-top:16px;background:var(--paper2);padding:14px;border-radius:10px}
.ats-pr-mot b{font-size:12px}.ats-pr-mot p{font-size:13px;color:var(--sub);margin-top:5px;font-style:italic}
.ats-pr-foot{margin-top:20px;padding-top:14px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);font-family:'IBM Plex Mono'}
)
.ats-optedit{display:flex;flex-direction:column;gap:6px;background:var(--paper2);border-radius:10px;padding:10px}
.ats-optedit-h{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--sub)}
.ats-optrow{display:flex;align-items:center;gap:6px}
.ats-optrow input{flex:1;border:1px solid var(--line);border-radius:7px;padding:6px 9px;background:var(--surface);font-size:12.5px}
.ats-optmust{width:30px;height:30px;border-radius:7px;border:1px solid var(--line);display:grid;place-items:center;color:var(--muted);flex-shrink:0}
.ats-optmust.is-on{background:var(--amber);color:#fff;border-color:var(--amber)}
.ats-optdel{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;color:var(--muted);flex-shrink:0}
.ats-optdel:hover{color:var(--brick)}
.ats-fset-actions{display:flex;gap:8px;margin-top:2px}
.ats-fieldhelp{font-size:11.5px;color:var(--muted);margin-top:2px}
/* Intervju-modal + primär-knapp + view-animation */
.ats-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:10px;background:var(--petrol);color:#fff;font-weight:600;font-size:13.5px;transition:background .15s,transform .12s,box-shadow .15s;box-shadow:0 6px 18px -8px rgba(12,92,82,.7)}
.ats-btn-primary:hover:not(:disabled){background:var(--petrol-deep);transform:translateY(-1px);box-shadow:0 10px 22px -8px rgba(12,92,82,.75)}
.ats-btn-primary:active:not(:disabled){transform:translateY(0)}
.ats-btn-primary:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.ats-intv{display:flex;flex-direction:column;gap:13px;padding:18px 22px 20px}
.ats-intv-sub{font-size:13px;color:var(--sub);line-height:1.55}
.ats-intv-presets{display:flex;gap:8px;flex-wrap:wrap}
.ats-intv .ats-field input{border:1px solid var(--line);border-radius:10px;padding:11px 13px;background:var(--surface);width:100%}
.ats-intv-preview{display:flex;align-items:center;gap:8px;background:var(--petrol-soft);color:var(--petrol-deep);border-radius:10px;padding:11px 14px;font-weight:600;font-size:14px}
.ats-intv-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:2px}
@keyframes atsViewIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ats-view{animation:atsViewIn .34s cubic-bezier(.4,0,.2,1)}
@keyframes atsModalIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.ats-modal{animation:atsModalIn .22s cubic-bezier(.4,0,.2,1)}
/* ===== Formbuilder (WYSIWYG) ===== */
.ats-fb-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px;padding:10px 12px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.ats-fb-tgroup{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ats-fb-saved{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--petrol);display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:20px;background:var(--petrol-soft)}
.ats-fb-saved:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--petrol)}
.ats-fb-saved.is-dirty{color:var(--amber);background:var(--amber-soft)}.ats-fb-saved.is-dirty:before{background:var(--amber)}
.ats-fb{display:grid;grid-template-columns:212px 1fr 322px;gap:14px;align-items:start}
.ats-fb-palette{position:sticky;top:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:7px}
.ats-fb-palette-h{display:flex;align-items:center;gap:7px;font-family:'Bricolage Grotesque';font-weight:600;font-size:14px}
.ats-fb-palette-note{font-size:11px;color:var(--muted);margin:-2px 0 4px}
.ats-fb-pal{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper2);font-size:12.5px;font-weight:600;color:var(--sub);cursor:grab;transition:transform .13s,border-color .13s,color .13s,background .13s;user-select:none}
.ats-fb-pal:hover{border-color:var(--petrol);color:var(--petrol);background:var(--surface);transform:translateX(3px)}
.ats-fb-pal:active{cursor:grabbing;transform:scale(.98)}
.ats-fb-pal.is-off{opacity:.5;cursor:default}
.ats-fb-pal-ic{width:26px;height:26px;border-radius:7px;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center;color:var(--petrol);flex-shrink:0}
.ats-fb-pal-l{flex:1}
.ats-fb-pal-grip{color:var(--muted);opacity:0;transition:opacity .13s}
.ats-fb-pal:hover .ats-fb-pal-grip{opacity:1}
.ats-fb-canvas{display:flex;flex-direction:column;gap:12px;min-width:0}
.ats-fb-canvas.is-dragging .ats-fb-zone{outline:2px dashed var(--line2);outline-offset:4px;border-radius:12px}
.ats-fb-page{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px 16px}
.ats-fb-page.is-locked{background:var(--paper2);border-style:dashed}
.ats-fb-page-h{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.ats-fb-page-badge{width:24px;height:24px;border-radius:8px;background:var(--petrol);color:#fff;display:grid;place-items:center;font-family:'Bricolage Grotesque';font-weight:700;font-size:12px;flex-shrink:0}
.ats-fb-page.is-locked .ats-fb-page-badge{background:var(--muted)}
.ats-fb-page-title{flex:1;min-width:0;border:1px solid transparent;border-radius:8px;padding:5px 8px;font-family:'Bricolage Grotesque';font-weight:600;font-size:15px;background:transparent;transition:.13s}
.ats-fb-page-title:hover:not(:disabled){border-color:var(--line)}
.ats-fb-page-title:focus{border-color:var(--petrol);background:var(--paper2);outline:none}
.ats-fb-page-h b{font-family:'Bricolage Grotesque';font-weight:600;font-size:15px;flex:1}
.ats-fb-page-lock{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);font-weight:500;white-space:nowrap}
.ats-fb-page-del{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;color:var(--muted);flex-shrink:0}
.ats-fb-page-del:hover{color:var(--brick);background:var(--brick-soft)}
.ats-fb-basefields{display:flex;flex-wrap:wrap;gap:8px}
.ats-fb-basef{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:9px;background:var(--surface);border:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--sub)}
.ats-fb-basef i{color:var(--brick);font-style:normal}
.ats-fb-zone{display:flex;flex-direction:column;gap:9px;min-height:10px}
.ats-fb-empty{display:flex;align-items:center;justify-content:center;gap:8px;padding:22px;border:1.5px dashed var(--line);border-radius:11px;color:var(--muted);font-size:13px;font-weight:600}
.ats-fb-empty.is-over{border-color:var(--petrol);background:var(--petrol-soft);color:var(--petrol)}
.ats-fb-ind{height:3px;border-radius:3px;background:var(--petrol);margin:1px 0;box-shadow:0 0 0 3px var(--petrol-soft)}
.ats-fb-card{display:flex;align-items:stretch;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer;transition:border-color .13s,box-shadow .13s}
.ats-fb-card:hover{border-color:var(--petrol-soft);box-shadow:0 6px 18px -12px rgba(0,0,0,.3)}
.ats-fb-card.is-sel{border-color:var(--petrol);box-shadow:0 0 0 3px var(--petrol-soft)}
.ats-fb-card-grip{display:flex;align-items:center;color:var(--muted);cursor:grab;flex-shrink:0}
.ats-fb-card:active .ats-fb-card-grip{cursor:grabbing}
.ats-fb-card-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.ats-fb-card-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ats-fb-card-ic{width:24px;height:24px;border-radius:7px;background:var(--petrol-soft);color:var(--petrol);display:grid;place-items:center;flex-shrink:0}
.ats-fb-card-top b{font-size:13.5px;font-weight:600}
.ats-fb-tag{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.03em;text-transform:uppercase;padding:2px 6px;border-radius:5px;font-weight:500}
.ats-fb-tag.is-req{background:var(--brick-soft);color:var(--brick)}
.ats-fb-tag.is-ko{background:var(--ink);color:#fff}
.ats-fb-tag.is-score{background:var(--petrol-soft);color:var(--petrol)}
.ats-fb-tag.is-cond{background:var(--blue-soft);color:var(--blue)}
.ats-fb-card-prev{pointer-events:none;opacity:.92}
.ats-fb-card-acts{display:flex;flex-direction:column;gap:5px;flex-shrink:0}
.ats-fb-card-acts button{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;color:var(--muted);border:1px solid transparent}
.ats-fb-card-acts button:hover{background:var(--paper2);border-color:var(--line)}
.ats-fb-card-acts button.is-danger:hover{color:var(--brick);background:var(--brick-soft);border-color:transparent}
.ats-fb-addpage{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border:1.5px dashed var(--line);border-radius:11px;color:var(--sub);font-weight:600;font-size:13px;transition:.13s}
.ats-fb-addpage:hover{border-color:var(--petrol);color:var(--petrol);background:var(--petrol-soft)}
.ats-fb-insp{position:sticky;top:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ats-fb-insp-empty{padding:30px 22px;text-align:center;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:10px}
.ats-fb-insp-empty p{font-size:13px;line-height:1.55}
.ats-insp{display:flex;flex-direction:column;gap:11px;padding:14px}
.ats-insp-head{display:flex;align-items:center;gap:10px;padding-bottom:11px;border-bottom:1px solid var(--line2)}
.ats-insp-ic{width:32px;height:32px;border-radius:9px;background:var(--petrol-soft);color:var(--petrol);display:grid;place-items:center;flex-shrink:0}
.ats-insp-head-t{flex:1;min-width:0}.ats-insp-head-t b{display:block;font-size:14px;font-family:'Bricolage Grotesque';font-weight:600}.ats-insp-head-t span{font-size:11px;color:var(--muted)}
.ats-insp-head-acts{display:flex;gap:6px}
.ats-insp-head-acts button{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--muted);border:1px solid var(--line)}
.ats-insp-head-acts button:hover{background:var(--paper2)}
.ats-insp-head-acts button.is-danger:hover{color:var(--brick);background:var(--brick-soft);border-color:transparent}
.ats-fb-prevwrap{padding:8px;max-height:78vh;overflow:auto}
.ats-share{display:flex;flex-direction:column;gap:13px;padding:18px 22px 22px}
.ats-share-link{display:flex;align-items:center;gap:8px;background:var(--paper2);border:1px solid var(--line);border-radius:11px;padding:8px 8px 8px 12px;color:var(--petrol)}
.ats-share-link input{flex:1;border:none;background:transparent;font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--ink)}
.ats-share-plat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ats-share-plat button{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px;border:1px solid var(--line);border-radius:10px;font-weight:600;font-size:12.5px;color:var(--sub);transition:.13s}
.ats-share-plat button:hover{border-color:var(--petrol);color:var(--petrol);background:var(--petrol-soft)}
.ats-filedrop{display:flex;align-items:center;gap:11px;padding:13px 14px;border:1.5px dashed var(--line);border-radius:11px;background:var(--paper2);cursor:pointer;transition:.13s;color:var(--sub)}
.ats-filedrop:hover{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-filedrop.is-over{border-color:var(--petrol);background:var(--petrol-soft);color:var(--petrol)}
.ats-filedrop.is-set{border-style:solid;border-color:var(--petrol-soft);background:var(--surface)}
.ats-filedrop-info{flex:1;min-width:0;display:flex;flex-direction:column}
.ats-filedrop-info b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ats-filedrop-info span{font-size:11px;color:var(--muted)}
.ats-filedrop-x{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;color:var(--muted);flex-shrink:0}
.ats-filedrop-x:hover{color:var(--brick);background:var(--brick-soft)}
@media(max-width:1080px){.ats-fb{grid-template-columns:1fr}.ats-fb-palette{position:static;flex-direction:row;flex-wrap:wrap}.ats-fb-pal{flex:1 1 45%}.ats-fb-insp{position:static}}
.ats-pub{min-height:100vh;background:var(--paper);display:flex;align-items:flex-start;justify-content:center;padding:34px 16px 60px}
.ats-pub-inner{width:100%;max-width:660px}
.ats-pub-foot{text-align:center;margin-top:16px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.05em;color:var(--muted)}
.ats-pub-card{max-width:440px;margin:70px auto;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:34px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px}
.ats-pub-card h2{font-family:'Bricolage Grotesque';font-size:20px}
.ats-pub-card p{color:var(--sub);font-size:14px;line-height:1.6}
.ats-spinner{width:26px;height:26px;border:3px solid var(--line);border-top-color:var(--petrol);border-radius:50%;animation:atsSpin .7s linear infinite}
@keyframes atsSpin{to{transform:rotate(360deg)}}
.ats-side-foot .ats-menu-pop{position:fixed;left:12px;bottom:62px;top:auto;width:224px;max-height:62vh;overflow:auto}
.ats-spinner.is-sm{width:18px;height:18px;border-width:2px}
.ats-filedrop.is-busy{cursor:default;opacity:.92}
.ats-answer-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line2)}
.ats-answer-row:last-child{border-bottom:none}
.ats-answer-l{font-size:12.5px;color:var(--sub);font-weight:500;flex-shrink:0;max-width:45%}
.ats-answer-v{font-size:13px;text-align:right;word-break:break-word}
.ats-answer-empty{font-size:12.5px;color:var(--muted)}
.ats-answer-file{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--petrol);background:var(--petrol-soft);padding:5px 9px;border-radius:8px;text-decoration:none}
.ats-answer-file:hover{background:var(--petrol);color:#fff}
.ats-answer-file.is-nolink{color:var(--muted);background:var(--paper2);cursor:default}
.ats-rolepick{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.ats-rolepick-btn{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface);text-align:left;transition:.13s}
.ats-rolepick-btn:hover{border-color:var(--petrol)}
.ats-rolepick-btn.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-rolepick-t{flex:1;min-width:0}.ats-rolepick-t b{display:block;font-size:13.5px}.ats-rolepick-t small{font-size:11px;color:var(--muted)}
.ats-login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(120% 120% at 50% 0%, var(--petrol-soft) 0%, var(--paper) 55%)}
.ats-login-card{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:30px 28px;box-shadow:0 30px 70px -30px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:12px}
.ats-login-brand{display:flex;align-items:center;gap:10px;font-family:'Bricolage Grotesque';font-weight:700;font-size:20px;margin-bottom:4px}
.ats-login-brand .ats-logo{width:34px;height:34px}
.ats-login-card h2{font-family:'Bricolage Grotesque';font-size:22px}
.ats-login-sub{font-size:13px;color:var(--sub);line-height:1.55;margin-bottom:4px}
.ats-login .ats-field{display:flex;flex-direction:column;gap:5px}
.ats-login .ats-field-l{font-size:12px;font-weight:600;color:var(--sub)}
.ats-login .ats-field input{border:1px solid var(--line);border-radius:10px;padding:11px 13px;background:var(--paper2);width:100%;font-size:15px}
.ats-login .ats-field input:focus{border-color:var(--petrol);outline:none;background:var(--surface)}
.ats-login-err{display:flex;align-items:center;gap:7px;background:var(--brick-soft);color:var(--brick);padding:9px 12px;border-radius:9px;font-size:12.5px;font-weight:500}
.ats-login-btn{width:100%;justify-content:center;padding:12px;font-size:14px;margin-top:4px}
.ats-login-switch{font-size:12.5px;color:var(--petrol);font-weight:600;padding:6px;text-align:center}
/* ===== Publik jobbsida ===== */
.ats-jobpage{min-height:100vh;background:var(--paper)}
/* Kanaler */
.ats-chan{display:flex;flex-direction:column;gap:16px;padding:18px 22px 22px}
.ats-chan-intro{font-size:13.5px;line-height:1.6;color:var(--sub)}
.ats-chan-list{display:flex;flex-direction:column;gap:9px}
.ats-chan-row{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--surface)}
.ats-chan-ic{width:38px;height:38px;border-radius:10px;background:var(--petrol-soft);color:var(--petrol);display:grid;place-items:center;flex-shrink:0}
.ats-chan-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.ats-chan-main b{font-size:14px}
.ats-chan-hint{font-size:11.5px;color:var(--muted)}
.ats-chan-url{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.ats-chan-acts{display:flex;gap:7px;flex-shrink:0}
.ats-chan-two{display:grid;grid-template-columns:auto 1fr;gap:14px}
.ats-chan-box{border:1px solid var(--line);border-radius:13px;padding:15px;background:var(--paper2);display:flex;flex-direction:column;gap:11px;align-items:flex-start}
.ats-chan-sec-h{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px}
.ats-chan-qrwrap{align-self:center}
.ats-btn-primary.is-sm{padding:7px 12px;font-size:12.5px;box-shadow:none}
@media(max-width:820px){.ats-jp-grid{grid-template-columns:1fr}.ats-jp-side{position:static}.ats-jp-hero h1{font-size:30px}.ats-chan-two{grid-template-columns:1fr}.ats-chan-qrwrap{align-self:center}.ats-chan-url{max-width:150px}}
.ats-anned{display:flex;flex-direction:column;gap:14px;max-width:820px}
.ats-anned-intro{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);background:var(--petrol-soft);padding:11px 14px;border-radius:11px}
.ats-anned-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ats-anned .ats-field{display:flex;flex-direction:column;gap:5px}
.ats-anned .ats-field-l{font-size:12px;font-weight:600;color:var(--sub)}
.ats-anned input,.ats-anned textarea{border:1px solid var(--line);border-radius:9px;padding:10px 12px;background:var(--surface);font-size:13.5px;width:100%;font-family:inherit;resize:vertical}
.ats-anned input:focus,.ats-anned textarea:focus{border-color:var(--petrol);outline:none}
.ats-anned-lists{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ats-anned-list{display:flex;flex-direction:column;gap:7px;background:var(--paper2);border-radius:12px;padding:13px}
.ats-anned-row{display:flex;gap:7px;align-items:center}
.ats-anned-faq{display:flex;flex-direction:column;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px;position:relative}
.ats-anned-faq .ats-optdel{position:absolute;top:7px;right:7px}
@media(max-width:720px){.ats-anned-grid,.ats-anned-lists{grid-template-columns:1fr}}
.ats-first{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(120% 120% at 50% 0%, var(--petrol-soft) 0%, var(--paper) 55%)}
.ats-first-card{width:100%;max-width:640px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:30px;box-shadow:0 30px 70px -30px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:12px}
.ats-first-card h2{font-family:'Bricolage Grotesque';font-size:24px}
.ats-first-sub{font-size:13.5px;color:var(--sub);line-height:1.55}
.ats-setup-toggle{display:flex;gap:6px;background:var(--paper2);padding:5px;border-radius:11px}
.ats-setup-toggle button{flex:1;padding:9px;border-radius:8px;font-weight:600;font-size:13px;color:var(--sub);transition:.13s}
.ats-setup-toggle button.is-on{background:var(--surface);color:var(--petrol);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ats-team-list{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.ats-team-row{display:flex;align-items:center;gap:11px;padding:9px 11px;border:1px solid var(--line);border-radius:11px;background:var(--surface)}
.ats-team-info{flex:1;min-width:0}
.ats-team-info b{display:flex;align-items:center;gap:8px;font-size:13.5px}
.ats-team-info small{font-size:11.5px;color:var(--muted)}
.ats-team-you{font-size:9.5px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;background:var(--petrol-soft);color:var(--petrol);padding:1px 6px;border-radius:5px}
.ats-team-role{font-size:12px;font-weight:600;color:var(--sub);background:var(--paper2);padding:5px 10px;border-radius:8px}
.ats-invite{background:var(--paper2);border-radius:12px;padding:14px;margin-top:4px}
.ats-invite-h{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;margin-bottom:10px}
.ats-invite-row{display:flex;gap:8px}
.ats-invite-code{margin-top:12px}
.ats-invite-code-t{font-size:12px;color:var(--sub);margin-bottom:7px;line-height:1.5}
.ats-invite-code-box{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px dashed var(--petrol);border-radius:9px;padding:10px 12px}
.ats-invite-code-box code{flex:1;font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;letter-spacing:.12em;color:var(--petrol-deep)}
.ats-reco{display:flex;align-items:center;gap:11px;padding:10px 13px;border-radius:12px;border:1px solid;margin:2px 0}
.ats-reco-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
.ats-reco-txt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}
.ats-reco-lbl{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.ats-reco-txt b{font-size:15px;font-family:'Bricolage Grotesque';font-weight:600}
.ats-reco-why{font-size:11.5px;text-align:right;opacity:.85;max-width:44%}
.ats-reco.tone-petrol{background:var(--petrol-soft);border-color:transparent;color:var(--petrol-deep)}.ats-reco.tone-petrol .ats-reco-ic{background:var(--petrol);color:#fff}
.ats-reco.tone-green{background:#EAF3EC;border-color:transparent;color:#1f6b3a}.ats-reco.tone-green .ats-reco-ic{background:#2e8b57;color:#fff}
.ats-reco.tone-amber{background:var(--amber-soft);border-color:transparent;color:#7a4d0a}.ats-reco.tone-amber .ats-reco-ic{background:var(--amber);color:#fff}
.ats-reco.tone-brick{background:var(--brick-soft);border-color:transparent;color:var(--brick)}.ats-reco.tone-brick .ats-reco-ic{background:var(--brick);color:#fff}
.ats-reco.tone-blue{background:var(--blue-soft);border-color:transparent;color:var(--blue)}.ats-reco.tone-blue .ats-reco-ic{background:var(--blue);color:#fff}
.ats-break-bar-fill.is-strong{background:var(--petrol)}
.ats-break-bar-fill.is-weak{background:var(--amber)}
.ats-sq-hero{display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(135deg,var(--petrol) 0%,var(--petrol-deep) 100%);color:#fff;border-radius:16px;padding:20px 24px;margin-bottom:16px}
.ats-sq-hero-lbl{display:inline-flex;align-items:center;gap:7px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.85}
.ats-sq-hero-src{font-family:'Bricolage Grotesque';font-weight:700;font-size:28px;margin:6px 0 3px}
.ats-sq-hero-sub{font-size:13px;opacity:.9}
.ats-sq-hero .ats-dial-track{stroke:rgba(255,255,255,.22)}
.ats-sq-hero .ats-dial-arc{stroke:#fff}
.ats-sq-hero .ats-dial-num{color:#fff}
.ats-sq-scroll{overflow-x:auto}
.ats-sq-table{display:flex;flex-direction:column;min-width:600px}
.ats-sq-head,.ats-sq-row{display:grid;grid-template-columns:1.7fr 1.2fr 1.7fr .8fr .8fr .8fr;gap:12px;align-items:center;padding:11px 6px}
.ats-sq-head{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:600;border-bottom:1px solid var(--line2)}
.ats-sq-head span:nth-child(n+4),.ats-sq-row span.ats-sq-metric{text-align:center}
.ats-sq-row{border-bottom:1px solid var(--line2)}
.ats-sq-row:last-child{border-bottom:none}
.ats-sq-src{display:flex;align-items:center;gap:9px;font-weight:600;font-size:13.5px}
.ats-sq-ic{width:28px;height:28px;border-radius:8px;background:var(--petrol-soft);color:var(--petrol);display:grid;place-items:center;flex-shrink:0}
.ats-sq-n{display:flex;align-items:center;gap:9px;font-size:13px}
.ats-sq-nbar{flex:1;height:6px;background:var(--paper2);border-radius:4px;overflow:hidden}
.ats-sq-nbar-fill{height:100%;background:var(--blue);border-radius:4px}
.ats-sq-avg{display:flex;align-items:center;gap:10px}
.ats-sq-avgbar{flex:1;height:8px;background:var(--paper2);border-radius:5px;overflow:hidden}
.ats-sq-avgbar-fill{height:100%;background:var(--amber);border-radius:5px}
.ats-sq-avgbar-fill.is-strong{background:var(--petrol)}
.ats-sq-avgbar-fill.is-weak{background:var(--brick)}
.ats-sq-avg b{font-size:13.5px;min-width:40px;text-align:right}
.ats-sq-metric{font-weight:600;font-size:14px}
.ats-sq-metric.is-hired{color:#8A6516}
.ats-report-meta{font-size:12px;color:var(--muted);margin:-6px 0 18px}
.ats-report-sec{margin-bottom:22px}
.ats-report-sec h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--ink)}
.ats-report-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:10px}
.ats-report-stat{background:var(--paper2);border-radius:10px;padding:12px;text-align:center}
.ats-report-stat b{display:block;font-family:'Bricolage Grotesque';font-size:22px;font-weight:700}
.ats-report-stat span{font-size:11px;color:var(--sub)}
.ats-report-hired{display:flex;align-items:center;gap:8px;background:#EAF3EC;color:#1f6b3a;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:6px}
@media print{.ats-report-stat,.ats-report-hired{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.ats-login-back{display:inline-flex;align-items:center;gap:5px;justify-content:center;font-size:12px;color:var(--muted);padding:4px;margin-top:2px}
.ats-lp{background:var(--paper);color:var(--ink)}.ats-lp-prob-h.is-ok{color:var(--petrol)}
@media(max-width:820px){.ats-lp-hero h1{font-size:36px}.ats-lp-hero p{font-size:16px}.ats-lp-sec-head h2{font-size:27px}.ats-lp-prob-grid,.ats-lp-features,.ats-lp-plans{grid-template-columns:1fr}.ats-lp-metrics{gap:30px}}
.ats-btn-danger{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:10px;background:var(--brick);color:#fff;font-weight:600;font-size:13.5px;transition:.15s}
.ats-btn-danger:hover:not(:disabled){background:#8a3423}
.ats-btn-danger:disabled{opacity:.6;cursor:not-allowed}
.ats-btn-danger.is-sm{padding:6px 12px;font-size:12.5px}
.ats-ghost.is-danger{color:var(--brick)}
.ats-ghost.is-danger:hover{background:var(--brick-soft)}
.ats-consent{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--petrol);background:var(--petrol-soft);padding:7px 14px;margin:0 18px 8px;border-radius:8px}
.ats-erase{display:flex;flex-direction:column;gap:12px;padding:18px 22px 22px}
.ats-erase p{font-size:14px;line-height:1.6;color:var(--sub)}
.ats-erase-note{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--petrol-deep);background:var(--petrol-soft);padding:10px 12px;border-radius:9px}
.ats-erase-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
.ats-ret-row{margin-bottom:12px;display:flex;flex-direction:column;gap:5px}
.ats-ret-input{display:flex;align-items:center;gap:10px}
.ats-ret-input input{width:90px;border:1px solid var(--line);border-radius:9px;padding:9px 11px;background:var(--surface)}
.ats-ret-input span{font-size:13px;color:var(--muted)}
.ats-ret-status{display:flex;align-items:center;gap:9px;font-size:13px;padding:11px 13px;border-radius:10px;background:var(--petrol-soft);color:var(--petrol-deep);margin-bottom:12px;flex-wrap:wrap}
.ats-ret-status.is-warn{background:var(--amber-soft);color:#7a4d0a}
.ats-ret-status button{margin-left:auto}
.ats-cookie{position:fixed;left:0;right:0;bottom:0;z-index:80;background:var(--ink);color:#fff;padding:12px 16px}
.ats-cookie-in{max-width:1000px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ats-cookie-in span{display:flex;align-items:center;gap:9px;font-size:13px;line-height:1.5}
.ats-cookie-in .ats-btn-primary{flex-shrink:0}
.ats-side-top-btns{display:flex;gap:2px;align-items:center}
.ats-help{opacity:0;color:var(--muted);flex-shrink:0;transition:.16s;padding:4px;border-radius:7px}
.ats-side:hover .ats-help,.ats-app.is-pinned .ats-help{opacity:1}
.ats-help:hover{color:var(--petrol);background:rgba(0,0,0,.05)}
.ats-tour{position:fixed;inset:0;z-index:95}
.ats-tour-dim{position:absolute;inset:0;background:rgba(20,18,14,.62)}
.ats-tour-spot{position:absolute;border-radius:12px;box-shadow:0 0 0 9999px rgba(20,18,14,.62),0 0 0 2px var(--petrol),0 0 0 6px rgba(12,92,82,.25);pointer-events:none;transition:top .26s cubic-bezier(.4,0,.2,1),left .26s cubic-bezier(.4,0,.2,1),width .26s cubic-bezier(.4,0,.2,1),height .26s cubic-bezier(.4,0,.2,1)}
.ats-tour-card{position:absolute;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 24px 60px -20px rgba(0,0,0,.5);max-width:320px;animation:tourpop .22s ease}
.ats-tour-card.is-centered{top:50%;left:50%;transform:translate(-50%,-50%);width:min(360px,calc(100vw - 32px));animation:tourfade .22s ease}
@keyframes tourpop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes tourfade{from{opacity:0}to{opacity:1}}
.ats-tour-step{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--petrol);letter-spacing:.05em}
.ats-tour-card h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:18px;margin:6px 0 7px}
.ats-tour-card p{font-size:13.5px;line-height:1.6;color:var(--sub)}
.ats-tour-dots{display:flex;gap:5px;margin:15px 0}
.ats-tour-dots span{width:6px;height:6px;border-radius:50%;background:var(--line2);transition:.2s}
.ats-tour-dots span.is-on{background:var(--petrol);width:18px;border-radius:3px}
.ats-tour-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ats-tour-skip{font-size:12.5px;color:var(--muted);font-weight:600;padding:6px 2px}
.ats-tour-skip:hover{color:var(--ink)}
.ats-tour-nav{display:flex;gap:8px}
.ats-cloudbar{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;background:var(--brick);color:#fff;padding:10px 16px;border-radius:12px;font-size:12.5px;font-weight:600;box-shadow:0 12px 34px -10px rgba(0,0,0,.4);z-index:70;max-width:calc(100vw - 24px)}
.ats-cloudbar button{background:rgba(255,255,255,.22);color:#fff;padding:4px 11px;border-radius:8px;font-weight:600;font-size:12px}
.ats-cloudbar button:hover{background:rgba(255,255,255,.34)}
.ats-jobs-tools{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.ats-joblist{display:flex;flex-direction:column;gap:11px}
.ats-jobcard{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;transition:border-color .13s,box-shadow .13s}
.ats-jobcard:hover{border-color:var(--petrol-soft);box-shadow:0 6px 20px -14px rgba(0,0,0,.3)}
.ats-jobcard.is-archived{opacity:.6}
.ats-jobcard.is-closed{background:var(--paper2)}
.ats-jobcard-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:6px}
.ats-jobcard-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.ats-jobcard-title{font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;color:var(--ink);text-align:left}
.ats-jobcard-title:hover{color:var(--petrol)}
.ats-jobbadge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:13px;background:var(--paper2);color:var(--sub);white-space:nowrap}
.ats-jobbadge.is-open{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-jobbadge.is-paused{background:var(--amber-soft);color:var(--gold)}
.ats-jobbadge.is-closed{background:var(--gold-soft);color:var(--gold)}
.ats-jobbadge.is-archived{background:var(--line2);color:var(--muted)}
.ats-jobbadge.is-pub{background:var(--petrol-soft);color:var(--petrol)}
.ats-jobbadge.is-unpub{background:var(--paper2);color:var(--muted)}
.ats-jobcard-meta{font-size:12.5px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-jobcard-stats{display:flex;flex-wrap:wrap;gap:16px;font-size:12.5px;color:var(--sub);margin-top:2px}
.ats-jobcard-stats b{font-family:'Bricolage Grotesque';color:var(--ink)}
.ats-jobcard-stats .is-hired{display:inline-flex;align-items:center;gap:4px;color:var(--gold);font-weight:600}
.ats-jobcard-acts{display:flex;align-items:center;gap:7px;flex-shrink:0}
.ats-jobcard-qn{background:var(--petrol);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:9px;margin-left:4px}
.ats-jobcard-more{padding:7px 9px}
.ats-menu-item.is-danger{color:var(--brick)}
.ats-menu-item.is-danger:hover{background:var(--brick-soft);color:var(--brick)}
.ats-smtp-status.is-on{color:var(--petrol);background:var(--petrol-soft)}
.ats-mailbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;background:var(--petrol-soft);color:var(--petrol-deep);padding:11px 13px;border-radius:10px;font-size:12.5px;line-height:1.55;margin-bottom:12px}
.ats-mailbar svg{flex-shrink:0}
.ats-mailbar button{margin-left:auto}
.ats-mailcfg{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}
.ats-mailcfg-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;background:var(--paper2);border-radius:9px;font-size:12.5px;color:var(--sub)}
.ats-mailcfg-row b{font-family:'IBM Plex Mono';font-size:12px;color:var(--ink);text-align:right;word-break:break-all}
.ats-testres{display:flex;align-items:center;gap:8px;margin-top:10px;padding:10px 12px;border-radius:9px;font-size:12.5px;font-weight:600}
.ats-testres.is-ok{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-testres.is-err{background:var(--brick-soft);color:var(--brick)}
.ats-msgstatus.is-sent{background:var(--petrol);color:#fff}
.ats-msgstatus.is-sending{background:var(--blue-soft);color:var(--blue)}
.ats-msglog-act{display:flex;justify-content:flex-end}
.ats-intv-modes{display:flex;gap:7px;flex-wrap:wrap}
.ats-intv-mode{display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border:1px solid var(--line);border-radius:10px;font-size:12.5px;font-weight:600;color:var(--sub);background:var(--surface)}
.ats-intv-mode:hover{border-color:var(--petrol-soft)}
.ats-intv-mode.is-on{background:var(--petrol);color:#fff;border-color:var(--petrol)}
.ats-intv-warn{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:9px;font-size:12.5px;background:var(--paper2);color:var(--sub);margin-top:2px}
.ats-intv-warn.is-warn{background:var(--amber-soft);color:var(--gold)}
.ats-intv-warn.is-err{background:var(--brick-soft);color:var(--brick)}
.ats-cal-warn{color:var(--brick);font-weight:600}
.ats-cal-day{margin-bottom:20px}
.ats-cal-dayh{display:flex;align-items:center;gap:8px;font-family:'Bricolage Grotesque';font-weight:600;font-size:14px;color:var(--ink);padding:0 2px 9px}
.ats-cal-dayh.is-muted{color:var(--muted)}
.ats-cal-dayh span{margin-left:auto;font-family:'IBM Plex Mono';font-size:11px;font-weight:400;color:var(--muted)}
.ats-cal-rows{display:flex;flex-direction:column;gap:8px}
.ats-cal-row{display:flex;align-items:center;gap:15px;background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:13px 16px;transition:border-color .13s}
.ats-cal-row:hover{border-color:var(--petrol-soft)}
.ats-cal-row.is-past{opacity:.55}
.ats-cal-time{display:flex;flex-direction:column;align-items:center;min-width:56px;flex-shrink:0;padding-right:14px;border-right:1px solid var(--line)}
.ats-cal-time b{font-family:'Bricolage Grotesque';font-size:16px;color:var(--petrol)}
.ats-cal-time small{font-family:'IBM Plex Mono';font-size:10px;color:var(--muted)}
.ats-cal-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.ats-cal-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ats-cal-name{font-family:'Bricolage Grotesque';font-weight:600;font-size:14.5px;color:var(--ink);text-align:left}
.ats-cal-name:hover{color:var(--petrol)}
.ats-cal-conflict{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:11px;background:var(--brick-soft);color:var(--brick)}
.ats-cal-meta{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono';overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-cal-mode{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--sub)}
.ats-cal-acts{display:flex;gap:6px;flex-shrink:0}
.ats-cal-cancel:hover{color:var(--brick)}
.ats-dr-iv{display:flex;align-items:center;gap:11px;background:var(--petrol-soft);color:var(--petrol-deep);padding:11px 13px;border-radius:11px;margin:4px 0 6px}
.ats-dr-iv div{display:flex;flex-direction:column;min-width:0}
.ats-dr-iv b{font-family:'Bricolage Grotesque';font-size:13.5px}
.ats-dr-iv span{font-size:11.5px;opacity:.85;overflow:hidden;text-overflow:ellipsis}
.ats-cal-dayh.is-todo{color:var(--brick)}
.ats-cal-row.is-todo{border-style:dashed}
.ats-cal-row.is-todo .ats-cal-time b{color:var(--muted)}
.ats-cal-remind{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:11px;background:var(--petrol-soft);color:var(--petrol)}
.ats-auto{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.ats-auto-row{display:flex;align-items:flex-start;gap:11px;padding:12px 13px;border-radius:11px;background:var(--paper2);border:1px solid var(--line)}
.ats-auto-row.is-on{background:var(--petrol-soft);border-color:transparent}
.ats-auto-i{flex-shrink:0;color:var(--muted);display:flex;padding-top:1px}
.ats-auto-row.is-on .ats-auto-i{color:var(--petrol)}
.ats-auto-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.ats-auto-t b{font-family:'Bricolage Grotesque';font-size:13.5px;color:var(--ink)}
.ats-auto-t span{font-size:12px;color:var(--sub);line-height:1.5}
.ats-sa-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:22px}
.ats-sa-kpi{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:15px 16px;display:flex;flex-direction:column;gap:3px}
.ats-sa-kpi.is-warn{border-color:var(--brick);background:var(--brick-soft)}
.ats-sa-kpi-v{font-family:'Bricolage Grotesque';font-weight:600;font-size:24px;color:var(--ink);line-height:1.1}
.ats-sa-kpi.is-warn .ats-sa-kpi-v{color:var(--brick)}
.ats-sa-kpi-l{font-size:11.5px;color:var(--muted);font-family:'IBM Plex Mono'}
.ats-sa-h{font-family:'Bricolage Grotesque';font-weight:600;font-size:15px;margin-bottom:10px}
.ats-sa-rows{display:flex;flex-direction:column;gap:8px}
.ats-sa-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 14px;border-radius:11px;background:var(--paper2)}
.ats-sa-row.is-card{background:var(--surface);border:1px solid var(--line)}
.ats-sa-row.is-susp{opacity:.62;border-style:dashed}
.ats-sa-row.is-err{border-color:var(--brick-soft)}
.ats-sa-main{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.ats-sa-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ats-sa-main b{font-family:'Bricolage Grotesque';font-size:14px;color:var(--ink)}
.ats-sa-main span{font-size:12px;color:var(--sub);overflow:hidden;text-overflow:ellipsis}
.ats-sa-when{font-family:'IBM Plex Mono';font-size:11px;color:var(--muted);flex-shrink:0;white-space:nowrap}
.ats-sa-acts{display:flex;align-items:center;gap:7px;flex-shrink:0}
.ats-sa-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin-top:6px}
.ats-sa-plan{background:var(--paper2);border-radius:10px;padding:11px 13px;display:flex;flex-direction:column;gap:2px}
.ats-sa-plan b{font-family:'Bricolage Grotesque';font-size:13px}
.ats-sa-plan span{font-size:11.5px;color:var(--muted)}
.ats-susp-meta{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);margin:8px 0 14px;font-family:'IBM Plex Mono'}


/* ---- Bas ---- */
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
  .ats-rv{opacity:1 !important;transform:none !important}
}
.ats-lp *:focus-visible,.ats-jp *:focus-visible{outline:2px solid var(--petrol);outline-offset:3px;border-radius:6px}
/* Sektionsentre */
.ats-rv{opacity:0;transform:translateY(18px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
.ats-rv.is-in{opacity:1;transform:none}
/* ============ PUBLIKA SIDOR ============ */
.ats-lp,.ats-jp{background:var(--paper);color:var(--ink);min-height:100vh;overflow-x:clip}
.ats-lp-wrap{max-width:1240px;margin:0 auto;padding:0 32px}
.ats-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.ats-lp-eyebrow{display:inline-block;font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--petrol);margin-bottom:18px}
.ats-lp-h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(30px,4vw,54px);line-height:1.08;letter-spacing:-.028em;margin-bottom:22px;max-width:16ch}
.ats-lp-lead{font-size:19px;line-height:1.68;color:var(--sub);max-width:660px;margin-bottom:44px}

/* --- Navigation --- */
.ats-lp-nav{position:sticky;top:0;z-index:50;height:72px;display:flex;align-items:center;transition:background .25s var(--ease),border-color .25s var(--ease),backdrop-filter .25s}
.ats-lp-nav.is-stuck{background:rgba(244,240,232,.82);backdrop-filter:blur(14px) saturate(1.4);border-bottom:1px solid var(--line)}
.ats-lp-nav-in{max-width:1240px;width:100%;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:32px}
.ats-lp-brand{display:flex;align-items:center;gap:10px;font-family:'Bricolage Grotesque';font-weight:600;font-size:19px;letter-spacing:-.01em;color:var(--ink)}
.ats-lp-links{display:flex;gap:30px;margin-left:16px}
.ats-lp-links button{position:relative;font-size:14.5px;font-weight:500;color:var(--sub);padding:6px 0;transition:color .16s}
.ats-lp-links button::after{content:"";position:absolute;left:0;right:100%;bottom:0;height:1.5px;background:var(--petrol);transition:right .26s var(--ease)}
.ats-lp-links button:hover{color:var(--ink)}
.ats-lp-links button:hover::after{right:0}
.ats-lp-nav-r{margin-left:auto;display:flex;align-items:center;gap:8px}
.ats-lp-login{font-size:14.5px;font-weight:600;color:var(--ink);padding:11px 16px;border-radius:var(--r-sm);transition:background .15s}
.ats-lp-login:hover{background:rgba(16,32,28,.06)}
.ats-lp-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:var(--petrol);color:#fff;font-weight:600;font-size:15px;padding:13px 22px;border-radius:var(--r-md);min-height:46px;box-shadow:0 1px 2px rgba(6,61,55,.2);transition:background .18s var(--ease),transform .18s var(--ease),box-shadow .18s var(--ease)}
.ats-lp-cta:hover{background:var(--petrol-deep);transform:translateY(-2px);box-shadow:0 10px 22px -10px rgba(6,61,55,.5)}
.ats-lp-cta:active{transform:translateY(0)}
.ats-lp-cta.is-lg{font-size:16.5px;padding:17px 30px;min-height:58px}
.ats-lp-cta.is-block{width:100%}
.ats-lp-ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1.5px solid var(--line);background:transparent;color:var(--ink);font-weight:600;font-size:16px;padding:16px 26px;border-radius:var(--r-md);min-height:58px;transition:border-color .18s,background .18s}
.ats-lp-ghost:hover{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-lp-ghost.is-block{width:100%;min-height:50px;font-size:15px}
.ats-lp-burger{display:none;margin-left:auto;padding:10px;border-radius:var(--r-sm);color:var(--ink)}
.ats-lp-mob{display:none;flex-direction:column;position:absolute;top:72px;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--line);padding:12px 24px 22px;box-shadow:0 18px 40px -22px rgba(16,32,28,.28);animation:mobin .22s var(--ease)}
@keyframes mobin{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.ats-lp-mob>button{text-align:left;padding:15px 4px;font-size:16.5px;font-weight:600;color:var(--ink);border-bottom:1px solid var(--line)}
.ats-lp-mob-acts{display:flex;flex-direction:column;gap:9px;margin-top:16px}

/* --- Hero --- */
.ats-lp-hero{padding:76px 0 104px}
.ats-lp-hero-in{max-width:1240px;margin:0 auto;padding:0 32px;display:grid;grid-template-columns:1.02fr .98fr;gap:64px;align-items:center}
.ats-lp-hero h1{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(44px,5.4vw,80px);line-height:1.02;letter-spacing:-.038em;margin-bottom:26px}
.ats-lp-hero h1 em{font-style:normal;color:var(--petrol)}
.ats-lp-sub{font-size:19px;line-height:1.65;color:var(--sub);max-width:540px;margin-bottom:36px}
.ats-lp-hero-acts{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:34px}
.ats-lp-trust{display:flex;gap:24px;flex-wrap:wrap}
.ats-lp-trust li{display:inline-flex;align-items:center;gap:7px;font-size:14px;color:var(--sub)}
.ats-lp-trust svg{color:var(--petrol)}

/* Produktvisual */
.ats-lp-shot{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:0 40px 80px -40px rgba(16,32,28,.4),0 2px 8px rgba(16,32,28,.05);overflow:hidden;transform:perspective(1400px) rotateY(-3deg) rotateX(1deg)}
.ats-lp-shot-bar{display:flex;align-items:center;gap:7px;padding:13px 17px;background:var(--paper2);border-bottom:1px solid var(--line)}
.ats-lp-shot-bar span{width:10px;height:10px;border-radius:50%;background:var(--line)}
.ats-lp-shot-bar b{margin-left:14px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--muted);font-weight:400}
.ats-lp-shot-body{padding:22px}
.ats-lp-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:19px}
.ats-lp-card-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.ats-lp-card-top b{display:block;font-family:'Bricolage Grotesque';font-size:17px}
.ats-lp-card-top span{font-size:13px;color:var(--muted)}
.ats-lp-bars{display:flex;flex-direction:column;gap:11px}
.ats-lp-bar{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center}
.ats-lp-bar span{font-size:13.5px;color:var(--sub)}
.ats-lp-bar b{font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--petrol);grid-row:span 2}
.ats-lp-bar i{grid-column:1;height:6px;border-radius:3px;background:var(--petrol);display:block}
.ats-lp-bar.is-weak i{background:var(--accent)}
.ats-lp-bar.is-weak b{color:var(--accent)}
.ats-lp-rec{display:flex;align-items:center;gap:8px;margin-top:18px;padding:12px 14px;background:var(--petrol-soft);color:var(--petrol-deep);border-radius:var(--r-sm);font-size:13.5px}
.ats-lp-swipe{display:flex;gap:9px;margin-top:16px}
.ats-lp-swipe span{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px;border-radius:var(--r-sm);font-size:12.5px;font-weight:600;background:var(--paper2);color:var(--muted)}
.ats-lp-swipe .is-mid{background:var(--accent-soft);color:var(--accent)}
.ats-lp-swipe .is-ok{background:var(--petrol-soft);color:var(--petrol)}

/* --- Problem (mörk redaktionell) --- */
.ats-lp-problem{background:var(--ink);color:#EDEAE2;padding:110px 0}
.ats-lp-problem-in{display:grid;grid-template-columns:1.15fr .85fr;gap:72px;align-items:start}
.ats-lp-problem h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(30px,3.8vw,50px);line-height:1.1;letter-spacing:-.028em}
.ats-lp-problem-r p{font-size:18px;line-height:1.75;color:rgba(237,234,226,.68);margin-bottom:20px}
.ats-lp-problem-r p:last-child{margin-bottom:0}

/* --- Sektioner --- */
.ats-lp-sec{padding:120px 0}
.ats-lp-sec.is-tight{padding:96px 0}
.ats-lp-split{padding:120px 0}
.ats-lp-split.is-flip{background:var(--paper2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ats-lp-split-in{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.ats-lp-split-t h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(28px,3.4vw,46px);line-height:1.1;letter-spacing:-.026em;margin-bottom:20px}
.ats-lp-split-t p{font-size:18px;line-height:1.7;color:var(--sub);margin-bottom:26px;max-width:520px}
.ats-lp-checks{display:flex;flex-direction:column;gap:13px}
.ats-lp-checks li{display:flex;align-items:center;gap:11px;font-size:16px;color:var(--ink)}
.ats-lp-checks svg{color:var(--petrol);flex-shrink:0}
.ats-lp-mini{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:22px;box-shadow:0 30px 60px -40px rgba(16,32,28,.35)}
.ats-lp-mini-h{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--muted);padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--line)}
.ats-lp-fields{display:flex;flex-direction:column;gap:9px}
.ats-lp-field{display:flex;align-items:center;gap:10px;padding:15px 16px;border:1px solid var(--line);border-radius:var(--r-sm);font-size:14.5px;background:var(--surface)}
.ats-lp-field.is-sel{border-color:var(--petrol);background:var(--petrol-soft);box-shadow:0 0 0 3px rgba(11,92,82,.08)}
.ats-lp-field>svg{color:var(--muted);flex-shrink:0}
.ats-lp-field span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-lp-field em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--petrol);background:rgba(11,92,82,.09);padding:4px 8px;border-radius:6px;flex-shrink:0}
.ats-lp-field em.is-ko{color:var(--brick);background:var(--brick-soft)}
.ats-lp-jm-kicker{font-size:12.5px;font-weight:600;color:var(--petrol);margin-bottom:8px}
.ats-lp-jm-title{font-family:'Bricolage Grotesque';font-weight:600;font-size:24px;letter-spacing:-.02em;margin-bottom:16px}
.ats-lp-jm-line{height:9px;border-radius:5px;background:var(--line2);margin-bottom:9px}
.ats-lp-jm-line.is-s{width:64%;margin-bottom:20px}
.ats-lp-jm-btn{background:var(--petrol);color:#fff;text-align:center;padding:14px;border-radius:var(--r-sm);font-size:14.5px;font-weight:600}
.ats-lp-jm-prog{margin-top:18px}
.ats-lp-jm-prog span{display:block;font-size:12px;color:var(--muted);margin-bottom:7px}
.ats-lp-jm-prog i{display:block;height:5px;background:var(--line2);border-radius:3px;overflow:hidden}
.ats-lp-jm-prog b{display:block;width:50%;height:100%;background:var(--petrol);border-radius:3px}

/* --- Fullbredd: bedömning --- */
.ats-lp-full{background:var(--petrol-soft);padding:120px 0;border-top:1px solid var(--line)}
.ats-lp-explain{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden}
.ats-lp-ex{background:var(--surface);padding:26px 22px;border-top:3px solid transparent}
.ats-lp-ex.is-ok{border-top-color:var(--petrol)}
.ats-lp-ex.is-warn{border-top-color:var(--accent)}
.ats-lp-ex.is-ko{border-top-color:var(--brick)}
.ats-lp-ex.is-rec{border-top-color:var(--gold)}
.ats-lp-ex b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:17px;margin-bottom:9px}
.ats-lp-ex span{font-size:14.5px;line-height:1.62;color:var(--sub)}

/* --- Tidslinje --- */
.ats-lp-timeline{display:flex;flex-direction:column}
.ats-lp-timeline li{display:grid;grid-template-columns:78px 1fr;gap:28px;padding:30px 0;border-top:1px solid var(--line);align-items:start}
.ats-lp-timeline li:last-child{border-bottom:1px solid var(--line)}
.ats-lp-timeline span{font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--petrol);padding-top:4px}
.ats-lp-timeline b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:21px;letter-spacing:-.015em;margin-bottom:7px}
.ats-lp-timeline p{font-size:16.5px;line-height:1.65;color:var(--sub);max-width:620px}

/* --- Trygghet --- */
.ats-lp-safe{background:var(--petrol-deep);color:#E4EFEC;padding:120px 0}
.ats-lp-safe-in{display:grid;grid-template-columns:.85fr 1.15fr;gap:76px;align-items:start}
.ats-lp-safe h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(28px,3.4vw,46px);line-height:1.1;letter-spacing:-.026em;margin-bottom:18px}
.ats-lp-safe p{font-size:17px;line-height:1.7;color:rgba(228,239,236,.72)}
.ats-lp-safe .ats-lp-eyebrow{color:#7FC0B4}
.ats-lp-safe-list{display:flex;flex-direction:column}
.ats-lp-safe-i{display:flex;gap:15px;padding:19px 0;border-bottom:1px solid rgba(255,255,255,.1)}
.ats-lp-safe-i:first-child{padding-top:0}
.ats-lp-safe-i:last-child{border-bottom:0}
.ats-lp-safe-i svg{color:#7FC0B4;flex-shrink:0;margin-top:2px}
.ats-lp-safe-i b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:16.5px;margin-bottom:4px}
.ats-lp-safe-i span{font-size:14.5px;line-height:1.6;color:rgba(228,239,236,.64)}

/* --- Priser --- */
.ats-lp-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch}
.ats-lp-plan{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px 28px;display:flex;flex-direction:column;transition:transform .2s var(--ease),box-shadow .2s var(--ease)}
.ats-lp-plan:hover{transform:translateY(-3px);box-shadow:0 22px 44px -30px rgba(16,32,28,.3)}
.ats-lp-plan.is-hot{border-color:var(--petrol);box-shadow:0 24px 56px -34px rgba(11,92,82,.5)}
.ats-lp-plan-tag{position:absolute;top:-12px;left:28px;background:var(--petrol);color:#fff;font-size:11.5px;font-weight:700;padding:5px 12px;border-radius:20px}
.ats-lp-plan h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:20px;margin-bottom:14px}
.ats-lp-price{display:flex;align-items:baseline;gap:8px;margin-bottom:12px}
.ats-lp-price b{font-family:'Bricolage Grotesque';font-weight:600;font-size:38px;letter-spacing:-.03em}
.ats-lp-price span{font-size:13px;color:var(--muted)}
.ats-lp-plan-d{font-size:14.5px;color:var(--sub);line-height:1.6;margin-bottom:24px}
.ats-lp-plan ul{display:flex;flex-direction:column;gap:12px;margin-bottom:28px;flex:1}
.ats-lp-plan li{display:flex;align-items:flex-start;gap:10px;font-size:14.5px;color:var(--ink);line-height:1.5}
.ats-lp-plan li svg{color:var(--petrol);flex-shrink:0;margin-top:2px}
.ats-lp-plans-note{text-align:center;font-size:13.5px;color:var(--muted);margin-top:26px}

/* --- FAQ --- */
.ats-lp-faqwrap{max-width:860px}
.ats-lp-faq-i{border-bottom:1px solid var(--line)}
.ats-lp-faq-i>button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:20px;text-align:left;padding:26px 0;font-family:'Bricolage Grotesque';font-weight:600;font-size:19px;letter-spacing:-.01em;color:var(--ink);min-height:64px}
.ats-lp-faq-i svg{color:var(--muted);flex-shrink:0;transition:transform .28s var(--ease)}
.ats-lp-faq-i.is-on svg{transform:rotate(180deg);color:var(--petrol)}
.ats-lp-faq-a{overflow:hidden;transition:max-height .34s var(--ease)}
.ats-lp-faq-a p{font-size:17px;line-height:1.72;color:var(--sub);padding-bottom:26px;max-width:700px}

/* --- Slut-CTA --- */
.ats-lp-final{padding:130px 0;border-top:1px solid var(--line)}
.ats-lp-final-in{text-align:center;max-width:720px;margin:0 auto}
.ats-lp-final h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(30px,4vw,54px);line-height:1.08;letter-spacing:-.03em;margin-bottom:18px}
.ats-lp-final p{font-size:18px;color:var(--sub);margin-bottom:34px}
.ats-lp-final-note{display:block;margin-top:18px;font-size:13.5px;color:var(--muted)}

/* --- Footer --- */
.ats-lp-foot{background:var(--ink);color:#E5E1D8;padding:80px 0 0}
.ats-lp-foot-in{display:grid;grid-template-columns:1.1fr 2fr;gap:64px;padding-bottom:60px}
.ats-lp-foot-brand p{font-size:14.5px;line-height:1.66;color:rgba(229,225,216,.56);margin-top:16px;max-width:300px}
.ats-lp-foot .ats-lp-brand{color:#fff}
.ats-lp-foot-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:36px}
.ats-lp-foot-cols h4{font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(229,225,216,.42);margin-bottom:16px}
.ats-lp-foot-cols button,.ats-lp-foot-cols span{display:block;text-align:left;font-size:14.5px;color:rgba(229,225,216,.72);padding:7px 0;transition:color .15s}
.ats-lp-foot-cols button:hover{color:#fff}
.ats-lp-foot-bot{max-width:1240px;margin:0 auto;padding:24px 32px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;font-size:13px;color:rgba(229,225,216,.42)}

/* ============ JOBBANNONS ============ */
.ats-jp-nav{position:sticky;top:0;z-index:40;height:72px;display:flex;align-items:center;transition:background .25s var(--ease),border-color .25s}
.ats-jp-nav.is-stuck{background:rgba(244,240,232,.85);backdrop-filter:blur(14px) saturate(1.4);border-bottom:1px solid var(--line)}
.ats-jp-nav-in{max-width:1280px;width:100%;margin:0 auto;padding:0 32px;display:flex;align-items:center;gap:16px}
.ats-jp-brand{display:flex;align-items:center;gap:12px;min-width:0}
.ats-jp-mark{width:38px;height:38px;border-radius:11px;background:var(--petrol);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:600;font-size:17px;flex-shrink:0}
.ats-jp-co{font-family:'Bricolage Grotesque';font-weight:600;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-jp-nav-r{margin-left:auto;display:flex;align-items:center;gap:8px}
.ats-jp-share{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;font-weight:600;color:var(--sub);padding:12px 16px;border-radius:var(--r-sm);min-height:46px;transition:background .15s,color .15s}
.ats-jp-share:hover{background:rgba(16,32,28,.06);color:var(--ink)}
.ats-jp-cta{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--petrol);color:#fff;font-weight:600;font-size:16px;padding:16px 28px;border-radius:var(--r-md);min-height:54px;box-shadow:0 1px 2px rgba(6,61,55,.2);transition:background .18s var(--ease),transform .18s var(--ease),box-shadow .18s var(--ease)}
.ats-jp-cta:hover{background:var(--petrol-deep);transform:translateY(-2px);box-shadow:0 10px 22px -10px rgba(6,61,55,.5)}
.ats-jp-cta.is-lg{font-size:17px;padding:18px 32px;min-height:60px}
.ats-jp-cta.is-sm{font-size:14.5px;padding:11px 20px;min-height:46px;border-radius:var(--r-sm)}
.ats-jp-cta.is-block{width:100%;margin-top:20px}

/* Jobbhero */
.ats-jp-hero{border-bottom:1px solid var(--line)}
.ats-jp-hero-in{max-width:1280px;margin:0 auto;padding:72px 32px 80px;display:grid;grid-template-columns:1.45fr .55fr;gap:64px;align-items:center}
.ats-jp-kicker{font-size:14.5px;font-weight:600;color:var(--petrol);margin-bottom:20px}
.ats-jp-hero h1{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(38px,5vw,66px);line-height:1.03;letter-spacing:-.035em;margin-bottom:24px;overflow-wrap:break-word;hyphens:auto}
.ats-jp-pitch{font-size:19px;line-height:1.66;color:var(--sub);max-width:620px;margin-bottom:36px}
.ats-jp-hero-acts{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.ats-jp-deadline{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;color:var(--sub)}
.ats-jp-deadline svg{color:var(--accent)}
/* Varumärkesyta (ingen fejkad bild) */
.ats-jp-brandwall{position:relative;aspect-ratio:1/1.08;border-radius:var(--r-lg);background:linear-gradient(155deg,var(--petrol) 0%,var(--petrol-deep) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;overflow:hidden;box-shadow:0 40px 80px -44px rgba(6,61,55,.6)}
.ats-jp-bw-mark{width:88px;height:88px;border-radius:24px;background:rgba(255,255,255,.14);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:600;font-size:40px;backdrop-filter:blur(2px)}
.ats-jp-bw-co{font-family:'Bricolage Grotesque';font-weight:600;font-size:22px;color:#fff;text-align:center;padding:0 22px;letter-spacing:-.01em}
.ats-jp-bw-grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;pointer-events:none;opacity:.16}
.ats-jp-bw-grid span{border-right:1px solid #fff;border-bottom:1px solid #fff}
.ats-jp-bw-grid span:nth-child(2n){border-right:0}
.ats-jp-bw-grid span:nth-child(n+3){border-bottom:0}

/* Artikel + sidokolumn */
.ats-jp-main{max-width:1280px;margin:0 auto;padding:80px 32px 48px;display:grid;grid-template-columns:minmax(0,760px) 300px;gap:72px;justify-content:center;align-items:start}
.ats-jp-article{min-width:0}
.ats-jp-sec{margin-bottom:56px}
.ats-jp-sec h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:30px;letter-spacing:-.022em;margin-bottom:22px}
.ats-jp-lead{font-size:18px;line-height:1.78;color:var(--sub);white-space:pre-wrap;overflow-wrap:break-word}
.ats-jp-list{display:flex;flex-direction:column;gap:15px}
.ats-jp-list li{display:flex;align-items:flex-start;gap:13px;font-size:17px;line-height:1.62;color:var(--ink)}
.ats-jp-list svg{color:var(--petrol);flex-shrink:0;margin-top:4px}
.ats-jp-list.is-soft svg{color:var(--accent)}
.ats-jp-benefits{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ats-jp-benefit{display:flex;align-items:center;gap:10px;padding:16px 18px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);font-size:15.5px}
.ats-jp-benefit svg{color:var(--accent);flex-shrink:0}
.ats-jp-steps{display:flex;flex-direction:column}
.ats-jp-steps li{display:flex;gap:18px;padding:18px 0;border-bottom:1px solid var(--line);align-items:center}
.ats-jp-steps li:first-child{padding-top:0}
.ats-jp-steps li:last-child{border-bottom:0}
.ats-jp-steps span{width:34px;height:34px;border-radius:50%;background:var(--petrol-soft);color:var(--petrol-deep);display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;flex-shrink:0}
.ats-jp-steps div{font-size:16.5px;color:var(--ink)}
.ats-jp-faq details{border-bottom:1px solid var(--line)}
.ats-jp-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 0;cursor:pointer;font-family:'Bricolage Grotesque';font-weight:600;font-size:17.5px;list-style:none;min-height:60px}
.ats-jp-faq summary::-webkit-details-marker{display:none}
.ats-jp-faq summary svg{color:var(--muted);transition:transform .26s var(--ease);flex-shrink:0}
.ats-jp-faq details[open] summary svg{transform:rotate(180deg);color:var(--petrol)}
.ats-jp-faq p{font-size:16.5px;line-height:1.72;color:var(--sub);padding-bottom:20px}
/* Upprepad CTA */
.ats-jp-midcta{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:34px 36px;background:var(--petrol-soft);border-radius:var(--r-lg);margin-top:64px;flex-wrap:wrap}
.ats-jp-midcta h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:24px;letter-spacing:-.018em;margin-bottom:6px}
.ats-jp-midcta p{font-size:15.5px;color:var(--sub)}

.ats-jp-side{position:sticky;top:96px;display:flex;flex-direction:column;gap:16px}
.ats-jp-sidecard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:24px}
.ats-jp-sidecard h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:18px}
.ats-jp-facts{display:flex;flex-direction:column;gap:16px}
.ats-jp-facts div{display:flex;flex-direction:column;gap:4px}
.ats-jp-facts dt{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--muted)}
.ats-jp-facts dd{font-size:15px;color:var(--ink);font-weight:500;padding-left:22px}
.ats-jp-sideshare{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:9px;padding:12px;border-radius:var(--r-sm);font-size:14px;font-weight:600;color:var(--sub);min-height:46px;transition:background .15s}
.ats-jp-sideshare:hover{background:var(--paper2);color:var(--ink)}
.ats-jp-contact{display:flex;align-items:flex-start;gap:14px}
.ats-jp-avatar{width:48px;height:48px;border-radius:50%;background:var(--petrol-soft);color:var(--petrol-deep);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:600;font-size:19px;flex-shrink:0}
.ats-jp-contact>div{min-width:0}
.ats-jp-contact b{display:block;font-size:15.5px;font-family:'Bricolage Grotesque'}
.ats-jp-contact>div>span{display:block;font-size:12.5px;color:var(--muted);margin-bottom:5px}
.ats-jp-contact a{font-size:14px;color:var(--petrol);word-break:break-word;line-height:1.4}
.ats-jp-contact a:hover{text-decoration:underline}

.ats-jp-apply{border-top:1px solid var(--line);background:var(--paper2);padding:96px 0 112px}
.ats-jp-apply-in{max-width:884px;margin:0 auto;padding:0 32px}
.ats-jp-foot{border-top:1px solid var(--line);background:var(--surface)}
.ats-jp-foot-in{max-width:1280px;margin:0 auto;padding:32px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.ats-jp-foot-note{font-size:13.5px;color:var(--muted)}
.ats-jp-mobar{display:none;position:fixed;left:0;right:0;bottom:0;z-index:44;background:var(--surface);border-top:1px solid var(--line);padding:12px 18px;align-items:center;gap:16px;box-shadow:0 -10px 30px -16px rgba(16,32,28,.24);animation:mobarin .3s var(--ease)}
@keyframes mobarin{from{transform:translateY(100%)}to{transform:none}}
.ats-jp-mobar>div{min-width:0;flex:1}
.ats-jp-mobar b{display:block;font-family:'Bricolage Grotesque';font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-jp-mobar span{font-size:12.5px;color:var(--muted)}

/* ============ ANSOKNINGSFORMULAR ============ */
.ats-af{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:48px}
.ats-af-head{margin-bottom:36px}
.ats-af-head h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(27px,3vw,36px);line-height:1.12;letter-spacing:-.026em;margin-bottom:12px}
.ats-af-head p{font-size:17px;line-height:1.6;color:var(--sub)}
.ats-af-prog{margin-bottom:38px}
.ats-af-prog-t{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:12px}
.ats-af-stepno{font-size:13.5px;font-weight:600;color:var(--petrol)}
.ats-af-nextlbl{font-size:13px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%}
.ats-af-bar{height:6px;border-radius:4px;background:var(--line2);overflow:hidden}
.ats-af-bar-fill{height:100%;background:var(--petrol);border-radius:4px;transition:width .45s var(--ease)}
.ats-af-curstep{font-family:'Bricolage Grotesque';font-weight:600;font-size:21px;letter-spacing:-.015em;margin-top:18px}
.ats-af-body{margin-bottom:40px;animation:affade .32s var(--ease)}
@keyframes affade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ats-af-fields{display:flex;flex-direction:column;gap:26px}
.ats-af-f{display:flex;flex-direction:column;gap:9px}
.ats-af-l{font-size:15px;font-weight:600;color:var(--ink);line-height:1.4}
.ats-af-l i{font-style:normal;color:var(--brick);margin-left:2px}
.ats-af-help{font-size:13.5px;color:var(--muted);line-height:1.5}
.ats-af-help.is-top{margin-top:-3px}
.ats-af-err{display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--brick);font-weight:600}
.ats-af .ats-inp{width:100%;min-height:54px;padding:15px 18px;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);font-size:16px;font-family:inherit;color:var(--ink);transition:border-color .16s,box-shadow .16s}
.ats-af .ats-inp:hover{border-color:var(--muted)}
.ats-af .ats-inp:focus{outline:none;border-color:var(--petrol);box-shadow:0 0 0 4px rgba(11,92,82,.12)}
.ats-af .ats-inp.is-err{border-color:var(--brick);box-shadow:0 0 0 4px rgba(194,81,58,.1)}
.ats-af textarea.ats-inp{min-height:140px;resize:vertical;line-height:1.62}
.ats-af .ats-chipset{display:flex;flex-wrap:wrap;gap:10px}
.ats-af .ats-selchip{min-height:54px;padding:15px 20px;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);font-size:15.5px;font-weight:500;color:var(--ink);transition:.16s var(--ease);text-align:left}
.ats-af .ats-selchip:hover{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-af .ats-selchip.is-on{background:var(--petrol);border-color:var(--petrol);color:#fff}
.ats-af .ats-mustdot{display:none}
.ats-af .ats-yn{display:flex;gap:0;border:1.5px solid var(--line);border-radius:12px;overflow:hidden}
.ats-af .ats-yn button{flex:1;min-height:56px;border:0;border-right:1.5px solid var(--line);background:var(--surface);font-size:16px;font-weight:600;color:var(--sub);transition:.16s}
.ats-af .ats-yn button:last-child{border-right:0}
.ats-af .ats-yn button:hover{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-af .ats-yn button.is-on{background:var(--petrol);color:#fff}
.ats-af .ats-filedrop{min-height:128px;border:2px dashed var(--line);border-radius:14px;background:var(--paper2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:26px;font-size:15px;color:var(--sub);transition:.18s var(--ease);cursor:pointer;text-align:center}
.ats-af .ats-filedrop:hover{border-color:var(--petrol);background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-af-review{background:var(--paper2);border-radius:14px;padding:24px 26px;position:relative}
.ats-af-review h3,.ats-af-gdpr h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:18px;margin-bottom:16px}
.ats-af-rrow{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-bottom:1px solid var(--line);font-size:15px}
.ats-af-rrow:last-of-type{border-bottom:0}
.ats-af-rrow span{color:var(--muted)}
.ats-af-rrow b{color:var(--ink);text-align:right;overflow-wrap:anywhere}
.ats-af-edit{position:absolute;top:22px;right:24px;font-size:13.5px;font-weight:600;color:var(--petrol);padding:6px 10px;border-radius:8px;min-height:36px}
.ats-af-edit:hover{background:var(--petrol-soft)}
.ats-af-gdpr ul{display:flex;flex-direction:column;gap:11px;margin-bottom:24px}
.ats-af-gdpr li{position:relative;padding-left:22px;font-size:15.5px;line-height:1.62;color:var(--sub)}
.ats-af-gdpr li::before{content:"";position:absolute;left:0;top:10px;width:7px;height:7px;border-radius:50%;background:var(--petrol)}
.ats-af-consent{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer;transition:.16s;min-height:62px}
.ats-af-consent:hover{border-color:var(--petrol)}
.ats-af-consent:focus-within{border-color:var(--petrol);box-shadow:0 0 0 4px rgba(11,92,82,.12)}
.ats-af-consent.is-err{border-color:var(--brick);background:var(--brick-soft)}
.ats-af-consent input{width:22px;height:22px;margin-top:1px;accent-color:var(--petrol);flex-shrink:0;cursor:pointer}
.ats-af-consent span{font-size:15.5px;line-height:1.55;color:var(--ink)}
.ats-af-gdpr-foot{margin-top:16px;font-size:13.5px;color:var(--muted)}
.ats-af-gdpr-foot a{color:var(--petrol)}
.ats-af-gdpr-foot a:hover{text-decoration:underline}
.ats-af-nav{display:flex;align-items:center;gap:14px;padding-top:30px;border-top:1px solid var(--line)}
.ats-af-back{display:inline-flex;align-items:center;gap:8px;min-height:54px;padding:15px 22px;border-radius:12px;font-size:15.5px;font-weight:600;color:var(--sub);transition:background .15s,color .15s}
.ats-af-back:hover{background:var(--paper2);color:var(--ink)}
.ats-af-next,.ats-af-submit{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:16px 32px;border-radius:12px;background:var(--petrol);color:#fff;font-size:16px;font-weight:600;margin-left:auto;box-shadow:0 1px 2px rgba(6,61,55,.2);transition:background .18s var(--ease),transform .18s var(--ease),box-shadow .18s var(--ease)}
.ats-af-next:hover,.ats-af-submit:hover{background:var(--petrol-deep);transform:translateY(-2px);box-shadow:0 10px 22px -10px rgba(6,61,55,.5)}
.ats-af-submit{background:var(--ink);padding:17px 36px}
.ats-af-submit:hover{background:#05100E}
.ats-af-done{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:60px 48px;text-align:center;animation:afdone .5s var(--ease)}
@keyframes afdone{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
.ats-af-done-mark{width:76px;height:76px;border-radius:50%;background:var(--petrol);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 26px;box-shadow:0 16px 34px -16px rgba(11,92,82,.6)}
.ats-af-done h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(26px,3vw,36px);line-height:1.15;letter-spacing:-.026em;margin-bottom:14px}
.ats-af-done>p{font-size:17px;line-height:1.7;color:var(--sub);max-width:520px;margin:0 auto 40px}
.ats-af-nextup{text-align:left;max-width:460px;margin:0 auto}
.ats-af-nextup h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:18px}
.ats-af-nextup ol{display:flex;flex-direction:column;gap:16px}
.ats-af-nextup li{display:flex;gap:14px;align-items:flex-start}
.ats-af-nextup li span{width:28px;height:28px;border-radius:50%;background:var(--petrol-soft);color:var(--petrol-deep);display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;flex-shrink:0}
.ats-af-nextup li b{display:block;font-size:15.5px;margin-bottom:3px}
.ats-af-nextup li small{font-size:14px;color:var(--muted);line-height:1.5}
.ats-af-done-acts{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:40px;padding-top:28px;border-top:1px solid var(--line)}
.ats-af-mail{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;font-weight:600;color:var(--petrol);padding:14px 20px;border-radius:12px;min-height:50px;transition:background .15s}
.ats-af-mail:hover{background:var(--petrol-soft)}

/* ---- Responsivt ---- */
@media (max-width:1180px){
  .ats-jp-main{grid-template-columns:minmax(0,1fr) 290px;gap:52px}
}
@media (max-width:1024px){
  .ats-lp-wrap,.ats-lp-nav-in,.ats-lp-hero-in,.ats-lp-foot-bot{padding-left:26px;padding-right:26px}
  .ats-lp-hero{padding:56px 0 76px}
  .ats-lp-hero-in{grid-template-columns:1fr;gap:52px}
  .ats-lp-shot{transform:none}
  .ats-lp-problem-in,.ats-lp-split-in,.ats-lp-safe-in{grid-template-columns:1fr;gap:40px}
  .ats-lp-split.is-flip .ats-lp-split-v{order:2}
  .ats-lp-explain{grid-template-columns:1fr 1fr}
  .ats-lp-plans{grid-template-columns:1fr;max-width:480px;margin:0 auto}
  .ats-lp-sec,.ats-lp-split,.ats-lp-full,.ats-lp-problem,.ats-lp-safe{padding:88px 0}
  .ats-lp-final{padding:96px 0}
  .ats-jp-hero-in{grid-template-columns:1fr;gap:44px;padding:52px 26px 56px}
  .ats-jp-brandwall{aspect-ratio:16/7;max-height:220px}
  .ats-jp-bw-mark{width:64px;height:64px;border-radius:18px;font-size:30px}
  .ats-jp-main{grid-template-columns:1fr;gap:52px;padding:56px 26px 40px;max-width:820px}
  .ats-jp-side{position:static;flex-direction:row;flex-wrap:wrap}
  .ats-jp-sidecard{flex:1;min-width:260px}
}
@media (max-width:860px){
  .ats-lp-links,.ats-lp-nav-r{display:none}
  .ats-lp-burger{display:flex}
  .ats-lp-mob{display:flex}
  .ats-lp-foot-in{grid-template-columns:1fr;gap:40px}
  .ats-jp-mobar{display:flex}
  .ats-jp-apply{padding-bottom:150px}
  .ats-jp-nav .ats-jp-cta.is-sm{display:none}
  .ats-jp-benefits{grid-template-columns:1fr}
}
@media (max-width:640px){
  .ats-lp-wrap,.ats-lp-nav-in,.ats-lp-hero-in,.ats-lp-foot-bot,.ats-jp-nav-in,.ats-jp-hero-in,.ats-jp-main,.ats-jp-apply-in,.ats-jp-foot-in{padding-left:20px;padding-right:20px}
  .ats-lp-hero{padding:40px 0 60px}
  .ats-lp-hero h1{font-size:clamp(38px,10vw,48px);letter-spacing:-.03em}
  .ats-lp-sub,.ats-lp-lead{font-size:17px}
  .ats-lp-sec,.ats-lp-split,.ats-lp-full,.ats-lp-problem,.ats-lp-safe{padding:68px 0}
  .ats-lp-final{padding:76px 0}
  .ats-lp-hero-acts{flex-direction:column;align-items:stretch;width:100%}
  .ats-lp-hero-acts button{width:100%}
  .ats-lp-explain{grid-template-columns:1fr}
  .ats-lp-timeline li{grid-template-columns:1fr;gap:8px;padding:22px 0}
  .ats-lp-timeline b{font-size:19px}
  .ats-lp-foot-cols{grid-template-columns:1fr 1fr;gap:26px}
  .ats-lp-foot-bot{flex-direction:column;gap:8px;text-align:center}
  .ats-lp-faq-i>button{font-size:17px;padding:22px 0}
  .ats-jp-hero-in{padding-top:36px;padding-bottom:44px}
  .ats-jp-hero h1{font-size:clamp(32px,9vw,42px)}
  .ats-jp-pitch{font-size:17px}
  .ats-jp-hero-acts{flex-direction:column;align-items:stretch}
  .ats-jp-hero-acts .ats-jp-cta{width:100%}
  .ats-jp-side{flex-direction:column}
  .ats-jp-sidecard{min-width:0}
  .ats-jp-sec h2{font-size:25px}
  .ats-jp-midcta{flex-direction:column;align-items:stretch;text-align:left;padding:26px 24px;gap:20px}
  .ats-jp-midcta .ats-jp-cta{width:100%}
  .ats-jp-apply{padding-top:56px}
  .ats-af{padding:28px 22px;border-radius:16px}
  .ats-af-done{padding:40px 24px}
  .ats-af-curstep{font-size:19px}
  .ats-af .ats-selchip{width:100%}
  .ats-af .ats-yn{flex-direction:column}
  .ats-af .ats-yn button{border-right:0;border-bottom:1.5px solid var(--line)}
  .ats-af .ats-yn button:last-child{border-bottom:0}
  .ats-af-nav{gap:10px}
  .ats-af-next,.ats-af-submit{flex:1;padding:16px 20px;margin-left:0}
  .ats-af-back{padding:15px 16px}
  .ats-af-done-acts{flex-direction:column;align-items:stretch}
}
@media (max-width:400px){
  .ats-lp-wrap,.ats-lp-nav-in,.ats-lp-hero-in,.ats-jp-nav-in,.ats-jp-hero-in,.ats-jp-main,.ats-jp-apply-in{padding-left:16px;padding-right:16px}
  .ats-lp-foot-cols{grid-template-columns:1fr}
  .ats-jp-share span{display:none}
  .ats-jp-share{padding:12px}
  .ats-af{padding:24px 18px}
  .ats-af-nextlbl{display:none}
  .ats-lp-trust{gap:14px}
}

/* ---- Marknadswebbplats ---- */
.ats-skip{position:absolute;left:-9999px;top:12px;z-index:99;background:var(--petrol);color:#fff;padding:12px 18px;border-radius:var(--r-sm);font-weight:600}
.ats-skip:focus{left:24px}
.ats-lp-links button.is-active{color:var(--ink)}
.ats-lp-links button.is-active::after{right:0}
.ats-lp-drop{position:relative}
.ats-lp-drop>button{display:inline-flex;align-items:center;gap:6px}
.ats-lp-dropmenu{position:absolute;top:calc(100% + 14px);left:-16px;width:340px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:8px;box-shadow:0 24px 54px -26px rgba(16,32,28,.34);display:flex;flex-direction:column;gap:2px;animation:mobin .18s var(--ease)}
.ats-lp-dropmenu::before{content:"";position:absolute;top:-14px;left:0;right:0;height:14px}
.ats-lp-dropmenu button{display:flex;flex-direction:column;gap:3px;text-align:left;padding:12px 14px;border-radius:var(--r-sm);transition:background .14s}
.ats-lp-dropmenu button:hover,.ats-lp-dropmenu button.is-active{background:var(--petrol-soft)}
.ats-lp-dropmenu b{font-size:14.5px;font-weight:600;color:var(--ink)}
.ats-lp-dropmenu span{font-size:13px;color:var(--muted);line-height:1.5}
.ats-lp-mobh{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:16px 4px 6px}
.ats-lp-mob>button.is-active{color:var(--petrol)}

/* Sidhero */
.ats-mh{padding:76px 0 56px;border-bottom:1px solid var(--line)}
.ats-mh-in{max-width:920px}
.ats-mh h1{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(36px,4.8vw,64px);line-height:1.06;letter-spacing:-.032em;margin-bottom:22px}
.ats-mh-sub{font-size:19px;line-height:1.68;color:var(--sub);max-width:680px}
.ats-mh-acts{display:flex;gap:14px;flex-wrap:wrap;margin-top:34px}
.ats-msec{padding:88px 0}
.ats-msec.is-top{padding-top:64px}
.ats-msec.is-mint{background:var(--petrol-soft);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ats-lp-checks-2{display:grid;grid-template-columns:1fr 1fr;gap:14px 32px}

/* Funktionssidan */
.ats-feat-tools{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:16px}
.ats-feat-cats{display:flex;gap:8px;flex-wrap:wrap}
.ats-feat-cat{padding:10px 16px;border-radius:22px;border:1px solid var(--line);background:var(--surface);font-size:13.5px;font-weight:600;color:var(--sub);min-height:44px;transition:.15s}
.ats-feat-cat:hover{border-color:var(--petrol);color:var(--petrol)}
.ats-feat-cat.is-on{background:var(--petrol);border-color:var(--petrol);color:#fff}
.ats-feat-search{display:flex;align-items:center;gap:10px;padding:0 16px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface);min-height:46px;min-width:240px}
.ats-feat-search svg{color:var(--muted);flex-shrink:0}
.ats-feat-search input{flex:1;border:0;background:transparent;font-size:15px;font-family:inherit;color:var(--ink);min-width:0}
.ats-feat-search input:focus{outline:none}
.ats-feat-count{font-size:13.5px;color:var(--muted);margin-bottom:34px}
.ats-feat-block{margin-bottom:52px}
.ats-feat-block h2{display:flex;align-items:center;gap:11px;font-family:'Bricolage Grotesque';font-weight:600;font-size:24px;letter-spacing:-.02em;margin-bottom:22px}
.ats-feat-block h2 svg{color:var(--petrol)}
.ats-feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden}
.ats-feat-i{background:var(--surface);padding:22px 24px}
.ats-feat-i b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:7px}
.ats-feat-i span{font-size:14.5px;line-height:1.62;color:var(--sub)}
.ats-feat-empty{text-align:center;padding:64px 20px;color:var(--muted)}
.ats-feat-empty svg{color:var(--line2);margin-bottom:16px}
.ats-feat-empty h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:19px;color:var(--ink);margin-bottom:8px}
.ats-feat-empty p{font-size:15px;margin-bottom:22px}
.ats-feat-note{font-size:13.5px;color:var(--muted);margin-top:18px}

/* Säkerhetssidan */
.ats-sec-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ats-sec-i{display:flex;gap:14px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:22px}
.ats-sec-i svg{color:var(--petrol);flex-shrink:0;margin-top:2px}
.ats-sec-i b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:6px}
.ats-sec-i span{font-size:14.5px;line-height:1.62;color:var(--sub)}

/* Om Rekyl */
.ats-about{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:64px;align-items:start}
.ats-about-txt h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:28px;letter-spacing:-.022em;margin:0 0 16px}
.ats-about-txt h2:not(:first-child){margin-top:44px}
.ats-about-txt p{font-size:17.5px;line-height:1.78;color:var(--sub);margin-bottom:18px;max-width:660px}
.ats-about-side{display:flex;flex-direction:column;gap:16px}
.ats-about-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:24px}
.ats-about-card.is-quiet{background:transparent;border-style:dashed}
.ats-about-card h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:16px}
.ats-about-card p{font-size:14px;line-height:1.65;color:var(--sub)}
.ats-about-card dl{display:flex;flex-direction:column;gap:14px}
.ats-about-card dl div{display:flex;justify-content:space-between;gap:14px;font-size:14px}
.ats-about-card dt{color:var(--muted)}
.ats-about-card dd{color:var(--ink);font-weight:600;text-align:right}

/* Kontakt */
.ats-contact{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:64px;align-items:start}
.ats-contact-form h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:26px;letter-spacing:-.02em;margin-bottom:10px}
.ats-contact-sub{font-size:15.5px;line-height:1.65;color:var(--sub);margin-bottom:30px;max-width:520px}
.ats-contact-btn{margin-left:0;margin-top:30px}
.ats-contact-side{display:flex;flex-direction:column;gap:16px}
.ats-contact-mail{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:600;color:var(--petrol);margin-bottom:8px;word-break:break-all}
.ats-contact-mail:hover{text-decoration:underline}

/* Juridiska sidor */
.ats-legal{padding:64px 0 96px}
.ats-legal-in{max-width:760px}
.ats-legal-intro{font-size:18px;line-height:1.75;color:var(--sub);padding-bottom:32px;border-bottom:1px solid var(--line);margin-bottom:8px}
.ats-legal-sec{padding:32px 0;border-bottom:1px solid var(--line)}
.ats-legal-sec:last-child{border-bottom:0}
.ats-legal-sec h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:22px;letter-spacing:-.018em;margin-bottom:14px}
.ats-legal-sec p{font-size:16.5px;line-height:1.75;color:var(--sub);margin-bottom:14px}
.ats-legal-sec p:last-child{margin-bottom:0}
.ats-legal-sec ul{display:flex;flex-direction:column;gap:9px;margin-top:6px}
.ats-legal-sec li{position:relative;padding-left:22px;font-size:16px;line-height:1.65;color:var(--sub)}
.ats-legal-sec li::before{content:"";position:absolute;left:0;top:10px;width:6px;height:6px;border-radius:50%;background:var(--petrol)}

@media (max-width:1024px){
  .ats-about,.ats-contact{grid-template-columns:1fr;gap:44px}
  .ats-sec-grid{grid-template-columns:1fr}
  .ats-lp-checks-2{grid-template-columns:1fr}
  .ats-mh{padding:56px 0 44px}
  .ats-msec{padding:68px 0}
}
@media (max-width:860px){
  .ats-lp-dropmenu{display:none}
}
@media (max-width:640px){
  .ats-feat-tools{flex-direction:column;align-items:stretch}
  .ats-feat-search{min-width:0}
  .ats-feat-grid{grid-template-columns:1fr}
  .ats-mh-acts{flex-direction:column}
  .ats-mh-acts button{width:100%}
  .ats-legal{padding:44px 0 72px}
}

/* ============ KARRIARSIDA (publik) ============ */
.ats-cs{background:var(--paper);color:var(--ink);min-height:100vh;overflow-x:clip}
.ats-cs-wrap{max-width:1180px;margin:0 auto;padding:0 32px}
.ats-cs-narrow{max-width:760px}
.ats-cs-nav{position:sticky;top:0;z-index:40;background:rgba(244,240,232,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.ats-cs-nav-in{max-width:1180px;margin:0 auto;padding:0 32px;height:76px;display:flex;align-items:center;gap:28px}
.ats-cs-brand{display:flex;align-items:center;gap:12px;font-family:'Bricolage Grotesque';font-weight:600;font-size:17px;min-width:0}
.ats-cs-brand img{height:36px;width:auto;max-width:150px;object-fit:contain}
.ats-cs-mark{width:38px;height:38px;border-radius:11px;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:600;font-size:17px;flex-shrink:0}
.ats-cs-links{display:flex;gap:26px;margin-left:8px}
.ats-cs-links button{font-size:14.5px;font-weight:500;color:var(--sub);padding:6px 0;transition:color .15s}
.ats-cs-links button:hover,.ats-cs-links button.is-active{color:var(--ink)}
.ats-cs-links button.is-active{font-weight:600}
.ats-cs-cta{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;gap:9px;background:var(--brand,var(--petrol));color:#fff;font-weight:600;font-size:16px;padding:16px 28px;border-radius:var(--r-md);min-height:54px;transition:transform .16s var(--ease),filter .16s}
.ats-cs-cta:hover{transform:translateY(-2px);filter:brightness(1.08)}
.ats-cs-cta.is-sm{font-size:14.5px;padding:11px 20px;min-height:46px;border-radius:var(--r-sm)}
.ats-cs-mob{display:none;flex-direction:column;padding:8px 24px 18px;border-top:1px solid var(--line);background:var(--surface)}
.ats-cs-mob button{text-align:left;padding:15px 4px;font-size:16px;font-weight:600;border-bottom:1px solid var(--line)}
.ats-cs-hero{padding:120px 0;color:#fff;background-size:cover;background-position:center;text-align:center}
.ats-cs-hero h1{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(38px,5.2vw,68px);line-height:1.04;letter-spacing:-.032em;margin-bottom:20px}
.ats-cs-hero p{font-size:19px;line-height:1.62;opacity:.9;max-width:640px;margin:0 auto 34px}
.ats-cs-hero .ats-cs-cta{margin:0 auto;background:#fff;color:var(--ink)}
.ats-cs-jhero{padding:76px 0;color:#fff}
.ats-cs-jhero h1{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(32px,4.4vw,54px);letter-spacing:-.03em;margin-bottom:12px}
.ats-cs-jhero p{font-size:17px;opacity:.88}
.ats-cs-sec{padding:80px 0}
.ats-cs-sec h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(25px,3vw,38px);letter-spacing:-.025em;margin-bottom:26px}
.ats-cs-body{font-size:18px;line-height:1.78;color:var(--sub);white-space:pre-wrap}
.ats-cs-ti{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.ats-cs-ti.is-flip>div:first-child{order:2}
.ats-cs-ti-img img{width:100%;border-radius:var(--r-lg);display:block}
.ats-cs-ph{width:100%;aspect-ratio:4/3;border-radius:var(--r-lg);opacity:.14}
.ats-cs-ph.is-wide{aspect-ratio:16/6}
.ats-cs-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.ats-cs-gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r-md);display:block}
.ats-cs-video{position:relative;padding-top:56.25%;border-radius:var(--r-lg);overflow:hidden;background:var(--ink)}
.ats-cs-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.ats-cs-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden}
.ats-cs-stats div{background:var(--surface);padding:32px 24px;text-align:center}
.ats-cs-stats b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:42px;letter-spacing:-.03em;line-height:1}
.ats-cs-stats span{font-size:14px;color:var(--muted);margin-top:8px;display:block}
.ats-cs-quote{border-left:3px solid var(--brand,var(--petrol));padding-left:28px}
.ats-cs-quote p{font-family:'Bricolage Grotesque';font-weight:500;font-size:clamp(21px,2.4vw,30px);line-height:1.4;letter-spacing:-.018em;margin-bottom:16px}
.ats-cs-quote footer{font-size:14.5px;color:var(--muted)}
.ats-cs-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.ats-cs-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:24px}
.ats-cs-card b{display:block;font-family:'Bricolage Grotesque';font-weight:600;font-size:17px;margin:12px 0 7px}
.ats-cs-card span{font-size:14.5px;line-height:1.65;color:var(--sub)}
.ats-cs-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
.ats-cs-person{text-align:center}
.ats-cs-person img{width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 auto 14px;display:block}
.ats-cs-pavatar{width:96px;height:96px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:600;font-size:34px;margin:0 auto 14px}
.ats-cs-person b{display:block;font-family:'Bricolage Grotesque';font-size:16.5px}
.ats-cs-person em{display:block;font-style:normal;font-size:13.5px;color:var(--muted);margin-top:2px}
.ats-cs-person p{font-size:14px;line-height:1.6;color:var(--sub);margin-top:10px}
.ats-cs-contact{display:flex;align-items:center;gap:20px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:26px}
.ats-cs-contact .ats-cs-pavatar{width:64px;height:64px;font-size:24px;margin:0}
.ats-cs-contact b{font-family:'Bricolage Grotesque';font-size:18px}
.ats-cs-contact em{display:block;font-style:normal;font-size:14px;color:var(--muted);margin:2px 0 8px}
.ats-cs-contact a{display:flex;align-items:center;gap:7px;font-size:14.5px;color:var(--brand,var(--petrol));margin-top:4px;word-break:break-all}
.ats-cs-contact a:hover{text-decoration:underline}
.ats-cs-cta{}
section.ats-cs-cta{padding:80px 0;color:#fff;text-align:center;display:block;margin:0;border-radius:0;min-height:0}
section.ats-cs-cta h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:clamp(26px,3.2vw,42px);letter-spacing:-.028em;margin-bottom:12px}
section.ats-cs-cta p{font-size:17px;opacity:.9;margin-bottom:28px}
.ats-cs-cta-btn{display:inline-flex;align-items:center;gap:10px;background:#fff;color:var(--ink);font-weight:600;font-size:16px;padding:16px 30px;border-radius:var(--r-md);min-height:54px;transition:transform .16s var(--ease)}
.ats-cs-cta-btn:hover{transform:translateY(-2px)}
.ats-cs-hr{border:0;border-top:1px solid var(--line);margin:0}
.ats-cs-link{display:inline-flex;align-items:center;gap:6px;font-size:14.5px;font-weight:600;color:var(--brand,var(--petrol))}
.ats-cs-link:hover{text-decoration:underline}
.ats-cs-jobs-h,.ats-jp-rel-h{display:flex;align-items:baseline;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:26px}
.ats-cs-jobs-h h2,.ats-jp-rel-h h2{margin-bottom:0}
/* Jobblista */
.ats-cs-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.ats-cs-sel{min-height:46px;padding:0 14px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface);font-size:14px;font-family:inherit;color:var(--ink)}
.ats-cs-meta{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px;font-size:14px;color:var(--muted)}
.ats-cs-active{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ats-cs-tag{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:20px;background:var(--petrol-soft);color:var(--petrol-deep);font-size:12.5px;font-weight:600;min-height:34px}
.ats-cs-tag:hover{background:var(--brick-soft);color:var(--brick)}
.ats-cs-clear{font-size:13px;font-weight:600;color:var(--sub);text-decoration:underline}
.ats-cs-jobs{display:flex;flex-direction:column;gap:12px}
.ats-cs-job{display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:26px 28px;transition:border-color .16s,transform .16s var(--ease),box-shadow .16s}
.ats-cs-job:hover{border-color:var(--brand,var(--petrol));transform:translateY(-2px);box-shadow:0 16px 34px -24px rgba(16,32,28,.3)}
.ats-cs-job-m{min-width:0;flex:1}
.ats-cs-job-dep{display:inline-block;font-size:12.5px;font-weight:600;color:var(--brand,var(--petrol));margin-bottom:8px}
.ats-cs-job h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:22px;letter-spacing:-.018em;margin-bottom:8px}
.ats-cs-job p{font-size:15px;line-height:1.6;color:var(--sub);margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ats-cs-job-chips{display:flex;gap:7px;flex-wrap:wrap}
.ats-cs-job-chips span{font-size:12.5px;padding:5px 11px;border-radius:20px;background:var(--paper2);color:var(--sub)}
.ats-cs-job-go{flex-shrink:0;width:44px;height:44px;border-radius:50%;background:var(--paper2);color:var(--sub);display:flex;align-items:center;justify-content:center;transition:.16s}
.ats-cs-job:hover .ats-cs-job-go{background:var(--brand,var(--petrol));color:#fff}
.ats-cs-more{margin:26px auto 0;display:block}
.ats-cs-foot{background:var(--ink);color:#E5E1D8;padding:56px 0 0;margin-top:40px}
.ats-cs-foot .ats-cs-brand{color:#fff}
.ats-cs-foot-in{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;padding-bottom:36px}
.ats-cs-flinks{display:flex;gap:22px;flex-wrap:wrap}
.ats-cs-flinks button{font-size:14px;color:rgba(229,225,216,.72)}
.ats-cs-flinks button:hover{color:#fff}
.ats-cs-social{display:flex;gap:16px}
.ats-cs-social a{font-size:14px;color:rgba(229,225,216,.72)}
.ats-cs-social a:hover{color:#fff}
.ats-cs-foot-bot{max-width:1180px;margin:0 auto;padding:20px 32px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:12.5px;color:rgba(229,225,216,.45)}

/* Jobbannons: nya sektioner */
.ats-jp-back{display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:600;color:var(--sub);padding:10px 14px;border-radius:var(--r-sm);min-height:44px}
.ats-jp-back:hover{background:rgba(16,32,28,.06);color:var(--ink)}
.ats-jp-more{border-top:1px solid var(--line);padding:72px 0}
.ats-jp-more-in{max-width:1280px;margin:0 auto;padding:0 32px}
.ats-jp-about{max-width:760px;margin-bottom:64px}
.ats-jp-about h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:28px;letter-spacing:-.022em;margin-bottom:16px}
.ats-jp-about p{font-size:17.5px;line-height:1.75;color:var(--sub);margin-bottom:24px;white-space:pre-wrap}
.ats-jp-foot-r{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.ats-af-summary{background:var(--paper2);border-radius:14px;padding:22px 26px;max-width:460px;margin:0 auto 26px;text-align:left}
.ats-af-summary h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;margin-bottom:14px}
.ats-af-privacy{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:26px;font-size:13px;color:var(--muted);line-height:1.55;text-align:left}
.ats-af-privacy svg{color:var(--petrol);flex-shrink:0}

/* ============ KARRIARBYGGARE (i appen) ============ */
.ats-cb{display:grid;grid-template-columns:340px minmax(0,1fr);gap:18px;align-items:start}
.ats-cb-side{display:flex;flex-direction:column;gap:14px}
.ats-cb-pages{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.ats-cb-page{display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--surface);transition:.14s}
.ats-cb-page:hover{border-color:var(--petrol-soft)}
.ats-cb-page.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-cb-page span{font-weight:600;font-size:14px;color:var(--ink)}
.ats-cb-page em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted)}
.ats-cb-newpage{display:flex;gap:7px}
.ats-cb-check{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--sub);padding:9px 0;cursor:pointer;min-height:42px}
.ats-cb-check input{width:18px;height:18px;accent-color:var(--petrol)}
.ats-cb-color{display:flex;align-items:center;gap:11px}
.ats-cb-color input{width:52px;height:42px;border:1px solid var(--line);border-radius:9px;padding:2px;background:var(--surface);cursor:pointer}
.ats-cb-brandacts{display:flex;gap:8px;margin-top:6px}
.ats-cb-blocks{display:flex;flex-direction:column;gap:8px}
.ats-cb-block{border:1px solid var(--line);border-radius:11px;background:var(--surface);overflow:hidden}
.ats-cb-block.is-open{border-color:var(--petrol)}
.ats-cb-block.is-hidden{opacity:.55}
.ats-cb-bh{display:flex;align-items:center;gap:8px;padding:5px 8px 5px 12px}
.ats-cb-btitle{flex:1;display:flex;align-items:center;gap:9px;min-width:0;padding:9px 0;text-align:left}
.ats-cb-btitle b{font-size:13.5px;flex-shrink:0}
.ats-cb-btitle span{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.ats-cb-btitle em{font-style:normal;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:var(--paper2);color:var(--muted);flex-shrink:0}
.ats-cb-chev{color:var(--muted);flex-shrink:0;transition:transform .2s}
.ats-cb-block.is-open .ats-cb-chev{transform:rotate(180deg)}
.ats-cb-acts{display:flex;gap:2px;flex-shrink:0}
.ats-cb-body{padding:16px;border-top:1px solid var(--line);background:var(--paper2);display:flex;flex-direction:column;gap:12px}
.ats-cb-list{display:flex;flex-direction:column;gap:8px}
.ats-cb-item{display:flex;gap:7px;align-items:center}
.ats-cb-item .ats-inp{flex:1;min-width:0}
.ats-cb-picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:9px}
.ats-cb-pick{display:flex;align-items:center;gap:10px;padding:15px 16px;border:1px solid var(--line);border-radius:11px;background:var(--surface);transition:.14s;min-height:56px}
.ats-cb-pick:hover{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-cb-pick b{font-size:13.5px}
.ats-cb-pick svg{color:var(--petrol);flex-shrink:0}

@media (max-width:1024px){
  .ats-cb{grid-template-columns:1fr}
  .ats-cs-ti{grid-template-columns:1fr;gap:36px}
  .ats-cs-ti.is-flip>div:first-child{order:0}
  .ats-cs-hero{padding:88px 0}
  .ats-cs-sec{padding:64px 0}
  .ats-jp-more{padding:56px 0}
}
@media (max-width:860px){
  .ats-cs-links,.ats-cs-nav .ats-cs-cta.is-sm{display:none}
  .ats-cs-nav .ats-lp-burger{display:flex;margin-left:auto}
  .ats-cs-mob{display:flex}
  .ats-jp-back span{display:none}
}
@media (max-width:640px){
  .ats-cs-wrap,.ats-cs-nav-in,.ats-cs-foot-bot,.ats-jp-more-in{padding-left:20px;padding-right:20px}
  .ats-cs-hero{padding:64px 0}
  .ats-cs-job{flex-direction:column;align-items:flex-start;gap:16px;padding:22px}
  .ats-cs-job-go{align-self:flex-end}
  .ats-cs-filters{flex-direction:column}
  .ats-cs-sel,.ats-cs-filters .ats-feat-search{width:100%}
  .ats-cs-foot-in{flex-direction:column;align-items:flex-start;gap:20px}
  .ats-cs-contact{flex-direction:column;text-align:center}
  .ats-cb-picker{grid-template-columns:1fr 1fr}
}

/* ---- Tjänster 2.0 ---- */
.ats-jfilters{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.ats-jmode{display:flex;gap:2px;margin-left:auto;background:var(--paper2);border-radius:9px;padding:3px}
.ats-jmode button{padding:8px 11px;border-radius:7px;color:var(--muted);min-height:36px}
.ats-jmode button.is-on{background:var(--surface);color:var(--petrol);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ats-jsave{display:flex;gap:6px;align-items:center}
.ats-jsave .ats-inp{min-height:34px;padding:6px 10px;font-size:12.5px;width:130px}
.ats-jviews{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.ats-jview{display:inline-flex;align-items:center;background:var(--petrol-soft);border-radius:18px;overflow:hidden}
.ats-jview>button:first-child{padding:7px 12px;font-size:12.5px;font-weight:600;color:var(--petrol-deep);min-height:34px}
.ats-jview-x{padding:7px 9px 7px 2px;color:var(--petrol);min-height:34px}
.ats-jview-x:hover{color:var(--brick)}
.ats-jtag{display:inline-block;font-size:11px;font-weight:600;padding:3px 9px;border-radius:12px;white-space:nowrap}
.ats-jobbadge.is-petrol{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-jobbadge.is-amber{background:var(--amber-soft);color:var(--amber)}
.ats-jobbadge.is-blue{background:var(--blue-soft);color:var(--blue)}
.ats-jobbadge.is-gold{background:var(--gold-soft);color:var(--gold)}
.ats-jobbadge.is-brick{background:var(--brick-soft);color:var(--brick)}
.ats-jobbadge.is-muted{background:var(--paper2);color:var(--muted)}
.ats-jcheck{margin-right:14px;width:18px;height:18px;accent-color:var(--petrol);flex-shrink:0}
.ats-jobcard.is-sel{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-jobcard.is-archived,.ats-jobcard.is-cancelled{opacity:.6}
.ats-jobcard.is-draft{border-style:dashed}
.ats-bulkbar{position:sticky;top:8px;z-index:20;display:flex;align-items:center;gap:9px;flex-wrap:wrap;background:var(--ink);color:#fff;padding:11px 16px;border-radius:12px;margin-bottom:14px;box-shadow:0 12px 30px -14px rgba(0,0,0,.4)}
.ats-bulkbar b{font-size:13.5px;margin-right:6px}
.ats-bulkbar .ats-ghost{background:rgba(255,255,255,.12);color:#fff;border-color:transparent}
.ats-bulkbar .ats-ghost:hover{background:rgba(255,255,255,.22)}
.ats-bulkopts{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.ats-blocked{display:flex;flex-direction:column;gap:8px;margin:12px 0}
.ats-blocked li{display:flex;flex-direction:column;gap:2px;padding:10px 12px;background:var(--brick-soft);border-radius:9px}
.ats-blocked b{font-size:13.5px;color:var(--ink)}
.ats-blocked span{font-size:12.5px;color:var(--brick)}
.ats-dupgrid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin:14px 0}
.ats-jtablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.ats-jtable{width:100%;border-collapse:collapse;min-width:900px}
.ats-jtable th{text-align:left;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding:13px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
.ats-jtable td{padding:13px 14px;border-bottom:1px solid var(--line);font-size:13.5px;vertical-align:middle}
.ats-jtable tr:last-child td{border-bottom:0}
.ats-jtable tr.is-sel td{background:var(--petrol-soft)}
.ats-jtable input[type=checkbox]{width:17px;height:17px;accent-color:var(--petrol)}
.ats-jset{display:flex;flex-direction:column;gap:12px;max-height:70vh;overflow-y:auto;padding-right:4px}
.ats-jset h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:15px;margin-top:8px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.ats-jset h3:first-of-type{margin-top:0}
.ats-jact{display:flex;flex-direction:column;gap:12px}
.ats-jact-list{display:flex;flex-direction:column;gap:2px;max-height:60vh;overflow-y:auto}
.ats-jact-i{display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)}
.ats-jact-k{font-size:11px;font-weight:700;padding:3px 9px;border-radius:11px;background:var(--petrol-soft);color:var(--petrol-deep);white-space:nowrap;flex-shrink:0}
.ats-jact-i b{display:block;font-size:13.5px;color:var(--ink)}
.ats-jact-i span{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
.ats-tagadd{display:flex;gap:8px;margin:12px 0}
.ats-taglist{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.ats-tagrow{display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--paper2);border-radius:9px}
.ats-tagrow>span:last-of-type{margin-left:auto;font-size:12px}
.ats-tagcolors{display:flex;gap:4px}
.ats-tagcolor{width:18px;height:18px;border-radius:50%;border:2px solid transparent}
.ats-tagcolor.is-on{border-color:var(--ink)}
.ats-jp-closed{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--muted);padding:16px 0}
@media (max-width:640px){
  .ats-jmode{margin-left:0}
  .ats-dupgrid{grid-template-columns:1fr}
  .ats-bulkbar{position:static}
}

/* ---- Pipeline / kanban ---- */
.ats-pipe-views{display:flex;gap:2px;background:var(--paper2);border-radius:10px;padding:3px}
.ats-pipe-views button{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:7px;font-size:12.5px;font-weight:600;color:var(--muted);min-height:38px}
.ats-pipe-views button.is-on{background:var(--surface);color:var(--petrol);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ats-pipe-views em{font-style:normal;background:var(--brick);color:#fff;font-size:10px;padding:1px 6px;border-radius:9px}
.ats-pipe-dirty{color:var(--amber);font-weight:600}
.ats-kb{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x proximity}
.ats-kb-col{flex:0 0 292px;background:var(--paper2);border-radius:14px;display:flex;flex-direction:column;max-height:calc(100vh - 260px);scroll-snap-align:start;transition:background .15s,box-shadow .15s}
.ats-kb-col.is-over{background:var(--petrol-soft);box-shadow:inset 0 0 0 2px var(--petrol)}
.ats-kb-col.is-col{flex:0 0 56px}
.ats-kb-col.is-col .ats-kb-t,.ats-kb-col.is-col .ats-kb-late,.ats-kb-col.is-col .ats-kb-warn{display:none}
.ats-kb-h{display:flex;align-items:center;gap:8px;padding:12px 12px 10px;border-top:3px solid var(--line);border-radius:14px 14px 0 0}
.ats-kb-collapse{color:var(--muted);padding:4px;border-radius:6px;flex-shrink:0}
.ats-kb-t{flex:1;min-width:0}
.ats-kb-t b{display:block;font-family:'Bricolage Grotesque';font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-kb-t span{font-size:11px;color:var(--muted)}
.ats-kb-n{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--sub);background:var(--surface);padding:3px 8px;border-radius:9px;flex-shrink:0}
.ats-kb-late{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#fff;background:var(--brick);padding:3px 7px;border-radius:9px}
.ats-kb-warn{font-size:11px;font-weight:700;color:var(--amber);background:var(--amber-soft);padding:3px 7px;border-radius:9px}
.ats-kb-body{flex:1;overflow-y:auto;padding:0 10px 12px;display:flex;flex-direction:column;gap:8px}
.ats-kb-empty{padding:20px;text-align:center;font-size:12.5px;color:var(--muted);border:1.5px dashed var(--line);border-radius:10px}
.ats-kb-more{padding:10px;text-align:center;font-size:12px;color:var(--muted)}
.ats-pc{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:11px 12px;cursor:grab;transition:box-shadow .14s,border-color .14s,transform .14s}
.ats-pc:hover{border-color:var(--petrol-soft);box-shadow:0 6px 16px -10px rgba(0,0,0,.24)}
.ats-pc:focus-visible{outline:2px solid var(--petrol);outline-offset:2px}
.ats-pc:active{cursor:grabbing}
.ats-pc.is-sel{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-pc.is-dense{padding:8px 10px}
.ats-pc.is-dense .ats-pc-tags{display:none}
.ats-pc-h{display:flex;align-items:center;gap:8px}
.ats-pc-h input{width:15px;height:15px;accent-color:var(--petrol);flex-shrink:0}
.ats-pc-name{flex:1;min-width:0;text-align:left;font-family:'Bricolage Grotesque';font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ats-pc-name:hover{color:var(--petrol)}
.ats-pc-score{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--petrol);flex-shrink:0}
.ats-pc-ko{background:var(--brick);color:#fff;padding:1px 5px;border-radius:5px;font-size:10px;font-weight:700}
.ats-pc-meta{font-size:11px;color:var(--muted);margin-top:4px;font-family:'IBM Plex Mono',monospace}
.ats-pc-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ats-pc-sla,.ats-pc-warn,.ats-pc-iv,.ats-pc-rate{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;padding:3px 7px;border-radius:9px;white-space:nowrap}
.ats-pc-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.ats-pc-sla.is-petrol{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-pc-sla.is-amber{background:var(--amber-soft);color:var(--amber)}
.ats-pc-sla.is-brick{background:var(--brick-soft);color:var(--brick)}
.ats-pc-sla.is-blue{background:var(--blue-soft);color:var(--blue)}
.ats-pc-sla.is-muted{background:var(--paper2);color:var(--muted)}
.ats-pc-warn{background:var(--brick-soft);color:var(--brick)}
.ats-pc-iv{background:var(--petrol-soft);color:var(--petrol)}
.ats-pc-rate{background:var(--gold-soft);color:var(--gold)}
.ats-pc-move{position:absolute;top:9px;right:9px;opacity:0;padding:5px;border-radius:7px;color:var(--muted);transition:.14s}
.ats-pc:hover .ats-pc-move,.ats-pc:focus-within .ats-pc-move{opacity:1}
.ats-pc-move:hover{background:var(--petrol);color:#fff}
/* Flyttpanel */
.ats-mv{display:flex;flex-direction:column;gap:12px}
.ats-mv-cand{display:flex;align-items:center;gap:11px;padding:12px;background:var(--paper2);border-radius:10px}
.ats-mv-cand b{display:block;font-size:14px}
.ats-mv-cand span{font-size:12px;color:var(--muted)}
.ats-mv-stages{display:flex;flex-direction:column;gap:6px;max-height:250px;overflow-y:auto}
.ats-mv-stage{display:flex;align-items:center;gap:10px;padding:12px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface);text-align:left;transition:.14s;min-height:54px}
.ats-mv-stage:hover:not(:disabled){border-color:var(--petrol);background:var(--petrol-soft)}
.ats-mv-stage.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-mv-stage.is-blocked{opacity:.55;cursor:not-allowed}
.ats-mv-stage>div{flex:1;min-width:0}
.ats-mv-stage b{display:block;font-size:13.5px}
.ats-mv-stage span{font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.ats-mv-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.ats-mv-block{display:flex;flex-direction:column;gap:8px}
.ats-mv-block>div{display:flex;gap:10px;padding:11px 13px;background:var(--brick-soft);border-radius:10px}
.ats-mv-block svg{color:var(--brick);flex-shrink:0;margin-top:2px}
.ats-mv-block b{display:block;font-size:13px;color:var(--brick)}
.ats-mv-block span{font-size:12px;color:var(--sub)}
.ats-mv-warn{display:flex;gap:10px;padding:12px 13px;background:var(--amber-soft);border-radius:10px}
.ats-mv-warn svg{color:var(--amber);flex-shrink:0;margin-top:2px}
.ats-mv-warn b{display:block;font-size:13px;color:var(--gold);margin-bottom:3px}
.ats-mv-warn span{font-size:12.5px;color:var(--sub);line-height:1.5}
/* Stegvy + åtgärder + byggare */
.ats-stagev-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:16px}
.ats-stagev-tabs button{padding:12px 16px;font-size:13.5px;font-weight:600;color:var(--muted);border-bottom:2px solid transparent;white-space:nowrap;min-height:46px}
.ats-stagev-tabs button.is-on{color:var(--ink)}
.ats-stagev-tabs em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted)}
.ats-stagev-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.ats-moves{margin-top:28px}
.ats-moves h3{font-family:'Bricolage Grotesque';font-weight:600;font-size:15px;margin-bottom:12px}
.ats-moves-list{display:flex;flex-direction:column;gap:6px}
.ats-move{display:flex;align-items:center;gap:14px;padding:11px 14px;background:var(--paper2);border-radius:10px}
.ats-move>div{flex:1;min-width:0}
.ats-move b{font-size:13.5px}
.ats-move span{display:block;font-size:12px;color:var(--sub)}
.ats-pb{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}
.ats-pb-main{display:flex;flex-direction:column;gap:14px}
.ats-pb-list{display:flex;flex-direction:column;gap:6px}
.ats-pb-row{display:flex;align-items:center;gap:11px;padding:12px 14px;border:1px solid var(--line);border-radius:11px;background:var(--surface);transition:.14s}
.ats-pb-row.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-pb-row.is-arch{opacity:.5;border-style:dashed}
.ats-pb-dot{width:12px;height:12px;border-radius:4px;flex-shrink:0}
.ats-pb-name{flex:1;min-width:0;text-align:left}
.ats-pb-name b{display:block;font-size:14px}
.ats-pb-name span{font-size:11.5px;color:var(--muted)}
.ats-pb-n{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--sub);background:var(--paper2);padding:3px 9px;border-radius:9px}
.ats-pb-acts{display:flex;gap:2px;flex-shrink:0}
.ats-pb-lock{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--muted);padding:0 8px}
.ats-pb-publish{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 18px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.ats-pb-publish b{display:block;font-size:14px}
.ats-pb-publish span{font-size:12.5px;color:var(--muted)}
.ats-pb-pacts{display:flex;gap:8px}
.ats-pb-side .ats-panel{max-height:calc(100vh - 200px);overflow-y:auto}
.ats-pb-h{font-family:'Bricolage Grotesque';font-weight:600;font-size:14px;margin-top:14px;padding-bottom:8px;border-bottom:1px solid var(--line)}
@media (max-width:1024px){ .ats-pb{grid-template-columns:1fr} .ats-pb-side .ats-panel{max-height:none} }
@media (max-width:640px){
  .ats-kb-col{flex:0 0 84vw;max-height:none}
  .ats-pipe-views span{display:none}
  .ats-pipe-views button{padding:9px 11px}
  .ats-stagev-list{grid-template-columns:1fr}
  .ats-pc-move{opacity:1}
  .ats-move{flex-wrap:wrap}
}

/* ---- Felgräns ---- */
.ats-eb{display:flex;align-items:center;justify-content:center;min-height:100dvh;padding:24px;background:var(--paper)}
.ats-eb.is-view{min-height:340px;padding:32px 0}
.ats-eb-card{max-width:520px;width:100%;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px;text-align:center}
.ats-eb-i{width:56px;height:56px;border-radius:50%;background:var(--brick-soft);color:var(--brick);display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
.ats-eb-card h2{font-family:'Bricolage Grotesque';font-weight:600;font-size:22px;margin-bottom:10px}
.ats-eb-card p{font-size:15px;line-height:1.6;color:var(--sub);margin-bottom:20px}
.ats-eb-d{text-align:left;margin-bottom:20px}
.ats-eb-d summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--muted);padding:8px 0;min-height:36px}
.ats-eb-d pre{background:var(--paper2);border-radius:9px;padding:12px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;color:var(--brick);font-family:'IBM Plex Mono',monospace}
.ats-eb-acts{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}
/* ---- Mobil viewport och safe areas ---- */
.ats-app{min-height:100dvh}
.ats-bottomnav{padding-bottom:calc(8px + env(safe-area-inset-bottom))}
.ats-fab{bottom:calc(84px + env(safe-area-inset-bottom))}
.ats-jp-mobar{padding-bottom:calc(12px + env(safe-area-inset-bottom))}
@media (max-width:640px){ .ats-eb-card{padding:24px 20px} .ats-eb-acts button{width:100%} }

/* ---- Scoring ---- */
.ats-sv-profiles{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.ats-sv-p{display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 16px;border:1px solid var(--line);border-radius:11px;background:var(--surface);min-height:58px;transition:.14s}
.ats-sv-p:hover{border-color:var(--petrol-soft)}
.ats-sv-p.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-sv-p.is-add{flex-direction:row;align-items:center;gap:7px;color:var(--petrol);border-style:dashed;font-weight:600;font-size:13.5px}
.ats-sv-p b{font-size:14px}
.ats-sv-p span{font-size:11.5px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
.ats-sv-warns{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.ats-sv-warn{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:9px;font-size:12.5px;line-height:1.5}
.ats-sv-warn.is-err{background:var(--brick-soft);color:var(--brick)}
.ats-sv-warn.is-warn{background:var(--amber-soft);color:var(--gold)}
.ats-sv-warn svg{flex-shrink:0}
.ats-sv{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px;align-items:start}
.ats-sv-main{display:flex;flex-direction:column;gap:14px}
.ats-sv-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ats-sv-sum div{background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:3px}
.ats-sv-sum span{font-size:11.5px;color:var(--muted)}
.ats-sv-sum b{font-family:'Bricolage Grotesque';font-size:18px}
.ats-sv-gname{flex:1;min-width:0;font-family:'Bricolage Grotesque';font-weight:600;font-size:16px;border:0;background:transparent;color:var(--ink);padding:4px 0}
.ats-sv-gname:focus{outline:none;border-bottom:1px solid var(--petrol)}
.ats-sv-gm{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ats-sv-w{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.ats-sv-w input{width:52px;min-height:34px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;font-size:13px;font-family:inherit;text-align:center}
.ats-sv-gmax{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--petrol);background:var(--petrol-soft);padding:4px 9px;border-radius:8px}
.ats-sv-crits{display:flex;flex-direction:column;gap:6px}
.ats-sv-crit{display:flex;align-items:center;gap:10px;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface);transition:.14s}
.ats-sv-crit.is-on{border-color:var(--petrol);background:var(--petrol-soft)}
.ats-sv-crit.is-off{opacity:.5}
.ats-sv-crit.is-broken{border-color:var(--brick);background:var(--brick-soft)}
.ats-sv-cn{flex:1;min-width:0;text-align:left}
.ats-sv-cn b{display:block;font-size:13.5px}
.ats-sv-cn span{font-size:11.5px;color:var(--muted)}
.ats-sv-cw{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--sub);background:var(--paper2);padding:3px 9px;border-radius:8px;flex-shrink:0}
.ats-sv-ca{display:flex;gap:2px;flex-shrink:0}
.ats-sv-side .ats-panel{max-height:calc(100vh - 200px);overflow-y:auto}
.ats-sv-cond{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:center}
.ats-sv-cond .ats-inp{min-height:40px;padding:8px 10px;font-size:13px}
.ats-sv-condadd{display:flex;gap:8px;align-items:center}
.ats-sv-set{display:flex;flex-direction:column;gap:12px;max-width:640px}
.ats-sv-prev{display:flex;flex-direction:column;gap:14px}
.ats-sv-diff{margin-top:16px;padding:14px;background:var(--paper2);border-radius:10px;font-size:13px}
.ats-sv-diff h4{font-family:'Bricolage Grotesque';font-weight:600;font-size:14px;margin-bottom:10px}
.ats-sv-diff div{padding:4px 0;font-family:'IBM Plex Mono',monospace;font-size:12.5px}
.ats-sv-diff .is-add{color:var(--petrol)}
.ats-sv-diff .is-del{color:var(--brick)}
.ats-sv-diff .is-chg{color:var(--gold)}
/* Poängförklaring */
.ats-se{display:flex;flex-direction:column;gap:14px}
.ats-se-top{display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:16px 18px;background:var(--surface);border:1px solid var(--line);border-radius:13px}
.ats-se-score{display:flex;flex-direction:column;align-items:center;padding:10px 18px;border-radius:11px;flex-shrink:0}
.ats-se-score.is-petrol{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-se-score.is-amber{background:var(--amber-soft);color:var(--gold)}
.ats-se-score.is-brick{background:var(--brick-soft);color:var(--brick)}
.ats-se-score b{font-family:'Bricolage Grotesque';font-size:30px;line-height:1}
.ats-se-score span{font-size:11px;font-family:'IBM Plex Mono',monospace;margin-top:3px}
.ats-se-meta{display:flex;gap:24px;flex-wrap:wrap;flex:1}
.ats-se-meta div{display:flex;flex-direction:column;gap:2px}
.ats-se-meta span{font-size:11px;color:var(--muted)}
.ats-se-meta b{font-size:13px}
.ats-se-warn{display:flex;gap:10px;padding:11px 13px;background:var(--amber-soft);border-radius:10px}
.ats-se-warn svg{color:var(--gold);flex-shrink:0;margin-top:2px}
.ats-se-warn div{display:flex;flex-direction:column;gap:3px}
.ats-se-warn span{font-size:12.5px;color:var(--sub);line-height:1.5}
.ats-se-groups{display:flex;flex-direction:column;gap:8px}
.ats-se-group{border:1px solid var(--line);border-radius:11px;background:var(--surface);overflow:hidden}
.ats-se-gh{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;text-align:left;min-height:52px}
.ats-se-gh>b{font-size:13.5px;flex-shrink:0;min-width:120px}
.ats-se-gbar{flex:1;height:6px;background:var(--line2);border-radius:3px;overflow:hidden;min-width:60px}
.ats-se-gbar i{display:block;height:100%;background:var(--petrol);border-radius:3px}
.ats-se-gh em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--muted);flex-shrink:0}
.ats-se-gh svg{color:var(--muted);transition:transform .2s;flex-shrink:0}
.ats-se-gh svg.is-open{transform:rotate(180deg)}
.ats-se-rows{border-top:1px solid var(--line);background:var(--paper2)}
.ats-se-row{display:grid;grid-template-columns:minmax(0,1fr) 120px 74px;gap:12px;padding:11px 14px;border-bottom:1px solid var(--line);align-items:center}
.ats-se-row:last-child{border-bottom:0}
.ats-se-row.is-miss{background:var(--amber-soft)}
.ats-se-row.is-neg{background:var(--brick-soft)}
.ats-se-c b{display:block;font-size:13px}
.ats-se-c span{font-size:11.5px;color:var(--sub);line-height:1.45}
.ats-se-a em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink);word-break:break-word}
.ats-se-p{text-align:right}
.ats-se-p b{font-family:'Bricolage Grotesque';font-size:15px;color:var(--petrol)}
.ats-se-row.is-neg .ats-se-p b{color:var(--brick)}
.ats-se-p span{display:block;font-size:10.5px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
.ats-se-na{padding:13px 15px;background:var(--paper2);border-radius:10px}
.ats-se-na>b{display:block;font-size:12.5px;color:var(--muted);margin-bottom:8px}
.ats-se-na div{display:flex;justify-content:space-between;gap:14px;padding:4px 0;font-size:12.5px}
.ats-se-na em{font-style:normal;color:var(--muted);text-align:right}
@media (max-width:1024px){ .ats-sv{grid-template-columns:1fr} .ats-sv-side .ats-panel{max-height:none} }
@media (max-width:640px){
  .ats-se-row{grid-template-columns:1fr;gap:6px}
  .ats-se-p{text-align:left}
  .ats-se-gh>b{min-width:0}
  .ats-sv-cond{grid-template-columns:1fr 1fr;gap:6px}
  .ats-se-top{gap:14px}
}
/* Responsiv */
@media(max-width:1080px){.ats-grid-2,.ats-grid-builder,.ats-tpl3{grid-template-columns:1fr}.ats-stats,.ats-quickgrid{grid-template-columns:repeat(2,1fr)}.ats-tplprev{position:static}}
@media(max-width:720px){
  .ats-side{display:none}.ats-main{margin-left:0}.ats-app.is-pinned .ats-main{margin-left:0}
  .ats-canvas{padding:16px 14px 90px}
  .ats-bottomnav{display:flex;position:fixed;left:0;right:0;bottom:0;background:var(--surface);border-top:1px solid var(--line);z-index:44;padding:6px 4px calc(6px + env(safe-area-inset-bottom))}
  .ats-bn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:9px;color:var(--muted);font-size:10px;font-weight:600}
  .ats-bn.is-active{color:var(--petrol)}
  .ats-fab{bottom:76px;right:16px}
  .ats-tr{grid-template-columns:26px 1fr 34px}
  .ats-tr>span:nth-child(3),.ats-tr>span:nth-child(4),.ats-tr>span:nth-child(5){display:none}
  .ats-th{display:none}
  .ats-drawer{width:100%;max-width:100%}
  .ats-ph-title{font-size:20px}
  .ats-msglog-head{display:none}.ats-msglog-row{grid-template-columns:60px 1fr;gap:6px}.ats-msglog-row>span:nth-child(3),.ats-msglog-row>span:nth-child(4),.ats-msglog-row>span:nth-child(5){display:none}
  .ats-msglog-row{grid-template-columns:64px 1fr 40px}
  .ats-flagcols{grid-template-columns:1fr}
  .ats-jobcard{flex-direction:column;align-items:stretch}.ats-jobcard-acts{flex-wrap:wrap}
  .ats-cal-row{flex-wrap:wrap}.ats-cal-acts{width:100%;justify-content:flex-end}
  .ats-sa-row{flex-direction:column;align-items:stretch}.ats-sa-acts{justify-content:flex-end}.ats-sa-kpis{grid-template-columns:repeat(2,1fr)}
  /* Inställningssidan – luftigare på mobil */
  .ats-grid-2{gap:14px}
  .ats-tpl-two{grid-template-columns:1fr;gap:11px}
  .ats-tpl3{gap:16px}
  .ats-tpllist{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
  .ats-tpllist>button{flex:0 0 auto}
  .ats-tplitem{min-width:150px}
  .ats-varchips{flex-wrap:wrap;gap:6px}
  .ats-envbox pre{font-size:11px;white-space:pre-wrap;word-break:break-word;line-height:1.6}
  .ats-panel{padding:16px}
  .ats-field input,.ats-field textarea,.ats-field select,.ats-inp,.ats-select{font-size:16px;padding:11px 12px}
  .ats-mailprev-body{font-size:13px}
  .ats-intv-actions{flex-direction:column-reverse}
  .ats-intv-actions>button{width:100%;justify-content:center}
}
@media print{.ats-app,.ats-bottomnav,.ats-fab,.ats-print-toolbar{display:none!important}.ats-printwrap{position:static}.ats-pr{border:none}}
@media(prefers-reduced-motion:reduce){.ats-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`}</style>;
}