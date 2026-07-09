import { useState, useEffect, useMemo, useRef, useReducer, useCallback, Fragment } from "react";
import {
  Briefcase, GraduationCap, Clock, Wallet, MapPin, ShieldCheck, FileText, Award, Users,
  SlidersHorizontal, BarChart3, ClipboardList, Layers, Check, X, Star, RotateCcw, Search,
  TrendingUp, AlertTriangle, Zap, ChevronRight, ChevronDown, ChevronLeft, LayoutDashboard, Inbox,
  ArrowRight, Flame, Link2, Code2, QrCode, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Download,
  Copy, Tag, UserCheck, Activity, Sparkles, Building2, Gauge, Filter, Mail, GitCompare, Workflow,
  Phone, Upload, CalendarClock, ListChecks, Send, Bell, CircleAlert, Blocks, Settings2, History,
  ShieldAlert, Pin, PinOff, Server, AtSign, Info, CheckCircle2, Settings, ThumbsUp, ThumbsDown,
  HelpCircle, BadgeCheck, PauseCircle, CalendarCheck, Menu as MenuIcon, PanelLeftClose
} from "lucide-react";

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
  { id: "sköterska", name: "Sjuksköterska", icon: "ShieldCheck", desc: "Legitimation kravs",
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
const REVIEWERS = [
  { id: "u1", name: "Du", role: "recruiter", initials: "DU" },
  { id: "u2", name: "Mona Berg", role: "manager", initials: "MB" },
  { id: "u3", name: "Ali Reza", role: "recruiter", initials: "AR" },
  { id: "u4", name: "Karin Ek", role: "viewer", initials: "KE" },
];
const ROLE_LABEL = { admin: "Admin", recruiter: "Rekryterare", manager: "Rekryterande chef", viewer: "Insyn" };

/* ---------- Tjänster ---------- */
function makeJob(id, title, team, slug, tmplId, extra = {}) {
  return {
    id, title, team, slug, company: extra.company || "Nordpuls AB",
    criteria: TEMPLATES.find((t) => t.id === tmplId).build(),
    profiles: [{ id: "std", name: "Standard", weights: {} }, ...(extra.profiles || [])], activeProfileId: "std",
    rules: extra.rules || [], autoRules: extra.autoRules || [], autoRejectBelow: extra.autoRejectBelow ?? 40,
    brand: { company: extra.company || "Nordpuls AB" },
    version: 3, versions: [{ v: 1, at: Date.now() - 40 * 864e5, by: "Du", note: "Skapade formuläret från mall" }, { v: 2, at: Date.now() - 12 * 864e5, by: "Mona Berg", note: "Justerade vikter" }, { v: 3, at: Date.now() - 3 * 864e5, by: "Du", note: "Lade till knockout-regel" }],
    stats: extra.stats || { started: 0, submitted: 0 },
  };
}
const JOBS0 = [
  makeJob("j1", "Account Manager · B2B", "Kommersiella teamet", "account-manager-b2b", "säljare", {
    profiles: [{ id: "junior", name: "Junior", weights: { experience: 12, skills: 30, availability: 16 } }, { id: "senior", name: "Senior", weights: { experience: 32, skills: 26, salary: 16 } }],
    rules: [{ id: "r1", field: "experience", op: ">", value: 8, tag: "Senior" }, { id: "r2", field: "total", op: ">=", value: 84, tag: "Toppmatch" }],
    autoRules: [{ id: "a1", field: "total", op: ">=", value: 85, then: "shortlist" }, { id: "a2", field: "total", op: "<", value: 45, then: "reject" }],
    autoRejectBelow: 50, stats: { started: 61, submitted: 42 },
  }),
  makeJob("j2", "Lagerarbetare · truck", "Logistik Torsvik", "lagerarbetare-truck", "lager", {
    autoRules: [{ id: "a1", field: "total", op: ">=", value: 80, then: "shortlist" }], stats: { started: 88, submitted: 54 },
  }),
  makeJob("j3", "Sjuksköterska · natt", "Vårdavdelning 3", "sjuksköterska-natt", "sköterska", { autoRejectBelow: 45, stats: { started: 40, submitted: 29 } }),
];

function tl(kind, detail, h, actor = "System") { return { id: uid(), kind, detail, at: Date.now() - h * 3600e3, actor }; }
function C(jobId, id, name, ans, o = {}) {
  const appliedAt = Date.now() - (o.h ?? 6) * 3600e3;
  return { id, jobId, name, email: o.email ?? (name.toLowerCase().replace(/[^a-za-o ]/g, "").replace(/ /g, ".") + "@mejl.se"), phone: o.phone ?? null,
    appliedAt, status: "new", managerStatus: null, starred: false, answers: ans, rating: o.rating || 0, comments: o.comments || [], reviews: o.reviews || {}, source: o.source || "Direkt", reason: null, formVersion: o.fv ?? 3,
    timeline: [tl("application_received", "Ansökan mottagen via " + (o.source || "Direkt"), o.h ?? 6), tl("score_computed", "Matchning beräknad (regelverk v3)", (o.h ?? 6) - 0.01)] };
}
const CANDIDATES0 = [
  C("j1", "c1", "Elin Sandberg", { experience: 7, skills: ["B2B-försäljning", "CRM-system", "Förhandling", "Engelska", "Presentationsteknik"], education: "Kandidatexamen", availability: "Inom 1 månad", salary: 40000, workmode: "Hybrid", license: true, motivation: "Sju är på SaaS-sidan, älskar langa säljcykler.", cv: "elin_cv.pdf" }, { h: 2, source: "LinkedIn", phone: "070-1112233", rating: 4, reviews: { u1: "yes", u2: "maybe", u3: "yes" }, comments: [{ id: "m1", by: "u1", text: "Stark på discovery. Boka intervju.", at: Date.now() - 5400e3 }] }),
  C("j1", "c2", "Omar Haddad", { experience: 5, skills: ["B2B-försäljning", "Förhandling", "Projektledning", "Engelska"], education: "Masterexamen", availability: "Omgående", salary: 43500, workmode: "Hybrid", license: true, motivation: "Redo att sätta igång direkt.", cv: "omar_cv.pdf" }, { h: 5, source: "Massa", phone: "073-4445566", reviews: { u1: "yes", u3: "maybe" } }),
  C("j1", "c3", "Sara Lindqvist", { experience: 9, skills: ["B2B-försäljning", "CRM-system", "Förhandling", "Projektledning", "Engelska", "Presentationsteknik"], education: "Kandidatexamen", availability: "1-3 månader", salary: 47000, workmode: "Hybrid", license: true, motivation: "Har byggt två säljteam.", cv: "sara_cv.pdf" }, { h: 13, source: "LinkedIn", email: "sara.lindqvist@mejl.se", phone: "070-9998877", rating: 5 }),
  C("j1", "c4", "Viktor Nystrom", { experience: 4, skills: ["CRM-system", "Förhandling", "Engelska"], education: "Kandidatexamen", availability: "Omgående", salary: 38500, workmode: "Distans", license: true, motivation: "Vill jobba på distans." }, { h: 17, source: "Hemsida" }),
  C("j1", "c5", "Lucas Berg", { experience: 3, skills: ["Presentationsteknik", "Engelska"], education: "Gymnasium", availability: "Omgående", salary: 34000, workmode: "På plats", license: false, motivation: "Bor granne med kontoret." }, { h: 26, source: "Direkt" }),
  C("j1", "c6", "Nadia Khan", { experience: 8, skills: ["B2B-försäljning", "CRM-system", "Förhandling", "Engelska"], education: "Kandidatexamen", availability: "Inom 1 månad", salary: 44000, workmode: "Hybrid", license: true, motivation: "Nyckelkundsansvarig med starkt nätverk.", cv: "nadia_cv.pdf" }, { h: 30, source: "Massa", phone: "076-1234567", rating: 4 }),
  C("j1", "c7", "Erik Wallin", { experience: 1, skills: ["CRM-system"], education: "Yrkeshögskola", availability: "Omgående", salary: 33000, workmode: "På plats", license: true, motivation: "Precis klar med utbildning." }, { h: 34, source: "Platsbanken" }),
  C("j1", "c8", "Filippa Strom", { experience: 11, skills: ["B2B-försäljning", "CRM-system", "Förhandling", "Projektledning", "Presentationsteknik", "Engelska"], education: "Masterexamen", availability: "Mer än 3 månader", salary: 52000, workmode: "Distans", license: true, motivation: "Senior med stora affärer.", cv: "filippa_cv.pdf" }, { h: 38, source: "LinkedIn" }),
  // j2 — Lager (conditional truck)
  C("j2", "d1", "Josef Andersson", { experience: 4, truck: true, truck_beh: ["A2", "B1", "B2"], skills: ["Plockning", "Inleverans", "WMS-system", "Ordersystem"], weekend: true, availability: "Omgående", salary: 31000, motivation: "Kort truck i sex är.", cv: "josef_cv.pdf" }, { h: 3, source: "Platsbanken", phone: "070-2223344", rating: 4 }),
  C("j2", "d2", "Sara Lindqvist", { experience: 2, truck: true, truck_beh: ["A2", "B1"], skills: ["Plockning", "WMS-system"], weekend: true, availability: "Inom 1 månad", salary: 30000, motivation: "Bytt bransch, van vid högt tempo." }, { h: 7, source: "LinkedIn", email: "sara.lindqvist@mejl.se", phone: "070-9998877" }),
  C("j2", "d3", "Marcus Ek", { experience: 6, truck: false, skills: ["Plockning", "Inleverans"], weekend: true, availability: "Omgående", salary: 30000, motivation: "Kan ta truckkort snabbt." }, { h: 12, source: "Massa" }),
  C("j2", "d4", "Aisha Ali", { experience: 3, truck: true, truck_beh: ["A2", "B1", "B2"], skills: ["Plockning", "Inleverans", "WMS-system", "Ordersystem", "Engelska"], weekend: false, availability: "Omgående", salary: 31000, motivation: "Erfaren men kan ej helg.", cv: "aisha_cv.pdf" }, { h: 20, source: "Hemsida", phone: "073-5556677" }),
  C("j2", "d5", "Tobias Falk", { experience: 8, truck: true, truck_beh: ["A2", "B1", "B2"], skills: ["Plockning", "Inleverans", "WMS-system", "Ordersystem", "Engelska"], weekend: true, availability: "Inom 1 månad", salary: 33000, motivation: "Teamledarerfarenhet från lager.", cv: "tobias_cv.pdf" }, { h: 28, source: "Platsbanken", rating: 5 }),
  C("j2", "d6", "Lova Berg", { experience: 1, truck: true, truck_beh: ["A2"], skills: ["Plockning"], weekend: true, availability: "Omgående", salary: 29500, motivation: "Nybörjare, snabblard." }, { h: 33, source: "Direkt" }),
  // j3 — Sjuksköterska
  C("j3", "e1", "Hanna Strom", { experience: 5, legitimation: true, skills: ["Akutsjukvård", "Journalsystem", "Läkemedelshantering", "Handledning"], weekend: true, availability: "Inom 1 månad", salary: 37000, motivation: "Van vid nattpass." }, { h: 4, source: "Platsbanken", phone: "070-8887766", rating: 4 }),
  C("j3", "e2", "Yusuf Demir", { experience: 8, legitimation: true, skills: ["Akutsjukvård", "Journalsystem", "Läkemedelshantering", "Handledning", "Engelska"], weekend: true, availability: "Omgående", salary: 39000, motivation: "Handleder garna nyexade.", cv: "yusuf_cv.pdf" }, { h: 10, source: "Direkt" }),
  C("j3", "e3", "Lova Berglund", { experience: 2, legitimation: true, skills: ["Journalsystem", "Läkemedelshantering"], weekend: true, availability: "Inom 1 månad", salary: 34000, motivation: "Nyexad men driven." }, { h: 18, source: "Hemsida" }),
  C("j3", "e4", "Sandra Ek", { experience: 6, legitimation: false, skills: ["Akutsjukvård", "Journalsystem", "Läkemedelshantering"], weekend: true, availability: "Omgående", salary: 36000, motivation: "Legitimation under registrering." }, { h: 25, source: "Direkt" }),
  C("j3", "e5", "Mikael Norin", { experience: 11, legitimation: true, skills: ["Akutsjukvård", "Journalsystem", "Läkemedelshantering", "Handledning", "Engelska"], weekend: false, availability: "1-3 månader", salary: 42000, motivation: "Lång erfarenhet, vill gå ner i tempo." }, { h: 33, source: "LinkedIn", phone: "076-9990011" }),
];

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
function can(role, what) { const R = { recruiter: ["decide", "edit", "comment", "export", "message", "vote"], admin: ["decide", "edit", "comment", "export", "message", "vote", "settings"], manager: ["vote", "comment", "export", "message", "decide"], viewer: ["export"] }; return (R[role] || []).includes(what); }
const TL_LABEL = { application_received: "Ansökan mottagen", score_computed: "Matchning beräknad", knockout: "Diskvalificerad", status_change: "Status ändrad", message_sent: "Mejl köat", note: "Kommentar", completion_requested: "Komplettering begärd", auto_rule: "Auto-regel", vote: "Team review", hired: "Anställd" };
const validEmail = (e) => !!e && /.+@.+\..+/.test(e);

/* ---------- Meddelandemallar (variabler enligt spec) ---------- */
const DEFAULT_TEMPLATES = [
  { id: "t_received", name: "Tack för ansökan", trigger: "received", active: true, subject: "Tack för din ansökan till {{jobTitle}}", body: "Hej {{candidateName}},\n\nTack för din ansökan till {{jobTitle}} hos {{companyName}}. Vi har tagit emot den och går igenom alla ansökningar löpande. Du hör från oss.\n\nVänliga hälsningar,\n{{hrName}}\n{{companyName}}" },
  { id: "t_shortlist", name: "Intressant profil", trigger: "shortlist", active: true, subject: "Din ansökan till {{jobTitle}} går vidare", body: "Hej {{candidateName}},\n\nVi tycker din profil verkar intressant för {{jobTitle}} hos {{companyName}} och vill garna ta det vidare. Vi återkommer inom kort med nästa steg.\n\nVänliga hälsningar,\n{{hrName}}" },
  { id: "t_interview", name: "Boka intervju", trigger: "interview", active: true, subject: "Vi vill träffa dig - {{jobTitle}}", body: "Hej {{candidateName}},\n\nVi vill garna träffa dig för {{jobTitle}} hos {{companyName}}. Förslag på tid: {{interviewTime}}. Passar det, eller föreslår du en annan tid?\n\nSvara på detta mejl så bokar vi.\n\nVänliga hälsningar,\n{{hrName}}\n{{hrEmail}}" },
  { id: "t_reserve", name: "Reservlista", trigger: "reserve", active: true, subject: "Din ansökan - {{jobTitle}}", body: "Hej {{candidateName}},\n\nTack för din ansökan till {{jobTitle}}. Vi har lagt din profil på var reservlista och hör av oss om en passande roll blir aktuell.\n\nVänliga hälsningar,\n{{hrName}}" },
  { id: "t_reject", name: "Avslag", trigger: "reject", active: true, subject: "Besked om din ansökan till {{jobTitle}}", body: "Hej {{candidateName}},\n\nTack för din ansökan till {{jobTitle}} hos {{companyName}}. Den har gången går vi vidare med andra kandidater ({{rejectionReason}}). Vi önskar dig lycka till framöver.\n\nVänliga hälsningar,\n{{hrName}}" },
  { id: "t_completion", name: "Begär komplettering", trigger: "completion", active: true, subject: "Komplettering behövs - {{jobTitle}}", body: "Hej {{candidateName}},\n\nDin ansökan ser bra ut, men vi saknar: {{missingField}}. Kan du komplettera genom att svara på detta mejl?\n\nTack,\n{{hrName}}" },
  { id: "t_offer", name: "Erbjudande", trigger: "offer", active: true, subject: "Erbjudande - {{jobTitle}} hos {{companyName}}", body: "Hej {{candidateName}},\n\nVi är glada att erbjuda dig rollen som {{jobTitle}} hos {{companyName}}. Vi mejlar detaljerna separat. Hör garna av dig till {{hrName}} på {{hrEmail}} vid frågor.\n\nVarmt välkommen!\n{{hrName}}" },
  { id: "t_reminder", name: "Paminnelse", trigger: "reminder", active: true, subject: "Paminnelse - {{jobTitle}}", body: "Hej {{candidateName}},\n\nEn liten paminnelse angående din ansökan till {{jobTitle}}. Hör av dig till {{hrName}} ({{hrEmail}}) om du har frågor.\n\nVänliga hälsningar,\n{{hrName}}" },
];
function renderTpl(str, vars) { return (str || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars[k] == null || vars[k] === "" ? `{{${k}}}` : vars[k])); }
function tplVars(state, cand, job) { return { candidateName: cand.name, jobTitle: job.title, companyName: state.org.companyName, hrName: state.org.hrName, hrEmail: state.org.hrEmail, missingField: (missingInfo(job, cand)[0] || "efterfrågad uppgift"), interviewTime: state.org.defaultInterviewTime, rejectionReason: cand.reason ? cand.reason.toLowerCase() : "andra kandidater gick vidare" }; }
const TRIGGER_FOR = { shortlist: "shortlist", interview: "interview", reserve: "reserve", reject: "reject", hired: "offer" };

/* ---------- Reducer-hjalpare ---------- */
function withLog(state, action, detail) { const who = REVIEWERS.find((r) => r.id === state.currentUserId)?.name || "—"; return [{ id: uid(), at: Date.now(), who, action, detail }, ...state.log].slice(0, 200); }
function updateActiveJob(state, fn) { return { ...state, jobs: state.jobs.map((j) => (j.id === state.activeJobId ? fn(j) : j)) }; }
function bumpVersion(job, note, who) { const v = (job.version || 1) + 1; return { ...job, version: v, versions: [...job.versions, { v, at: Date.now(), by: who, note }] }; }
function addTL(cand, kind, detail, actorId) { const actor = REVIEWERS.find((r) => r.id === actorId)?.name || "System"; return { ...cand, timeline: [{ id: uid(), kind, detail, at: Date.now(), actor }, ...(cand.timeline || [])] }; }
function mapCand(state, id, fn) { return { ...state, candidates: state.candidates.map((c) => (c.id === id ? fn(c) : c)) }; }
function buildMessage(state, cand, job, trigger, who) {
  const tpl = state.templates.find((t) => t.trigger === trigger && t.active) || state.templates.find((t) => t.trigger === trigger);
  const vars = tplVars(state, cand, job);
  const ok = validEmail(cand.email);
  return { id: uid(), candidateId: cand.id, candidateName: cand.name, jobId: job.id, to: cand.email || "(saknar e-post)", subject: tpl ? renderTpl(tpl.subject, vars) : "Angående din ansökan", body: tpl ? renderTpl(tpl.body, vars) : "", trigger, tplName: tpl?.name || trigger, status: ok ? "queued" : "failed", error: ok ? null : "Saknar giltig e-post", at: Date.now(), by: who };
}
function applyDecision(state, cand, job, status, reason, who) {
  let c2 = addTL({ ...cand, status, reason: reason ?? cand.reason }, status === "hired" ? "hired" : "status_change", statusLabel(status) + (reason ? " · " + reason : ""), who);
  const trigger = TRIGGER_FOR[status];
  let msg = null;
  if (trigger) { msg = buildMessage(state, c2, job, trigger, who); c2 = addTL(c2, "message_sent", `${msg.subject}${msg.status === "failed" ? " · FEL: saknar e-post" : " · köad för utskick"}`, who); }
  return { c2, msg };
}

function reducer(state, ac) {
  const who = state.currentUserId;
  switch (ac.type) {
    case "DECIDE": {
      const cand = state.candidates.find((c) => c.id === ac.id); if (!cand) return state;
      const job = state.jobs.find((j) => j.id === cand.jobId);
      const { c2, msg } = applyDecision(state, cand, job, ac.status, ac.reason, who);
      const s2 = mapCand(state, ac.id, () => c2);
      return { ...s2, messages: msg ? [msg, ...state.messages] : state.messages, history: [...state.history, { id: ac.id, prev: cand.status }], log: withLog(s2, "Beslut", `${statusLabel(ac.status)} · ${cand.name}`) };
    }
    case "UNDO": { if (!state.history.length) return state; const last = state.history[state.history.length - 1]; return { ...mapCand(state, last.id, (c) => ({ ...c, status: last.prev })), history: state.history.slice(0, -1) }; }
    case "STAR": return mapCand(state, ac.id, (c) => ({ ...c, starred: !c.starred }));
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
    case "SET_ACTIVE_JOB": return { ...state, activeJobId: ac.id };
    case "SET_USER": return { ...state, currentUserId: ac.id };
    case "ADD_JOB": { const id = "j" + uid(); const job = makeJob(id, ac.title, ac.team || "Nytt team", (ac.title || "tjänst").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 22), ac.tmplId, { company: state.org.companyName }); const s2 = { ...state, jobs: [...state.jobs, job], activeJobId: id }; return { ...s2, log: withLog(s2, "Ny tjänst", ac.title) }; }
    case "SET_WEIGHT": return updateActiveJob(state, (job) => job.activeProfileId === "std" ? { ...job, criteria: job.criteria.map((c) => c.id === ac.critId ? { ...c, weight: ac.weight } : c) } : { ...job, profiles: job.profiles.map((p) => p.id === job.activeProfileId ? { ...p, weights: { ...p.weights, [ac.critId]: ac.weight } } : p) });
    case "SET_FIELD_FLAG": return updateActiveJob(state, (job) => bumpVersion({ ...job, criteria: job.criteria.map((c) => c.id === ac.critId ? { ...c, ...ac.patch } : c) }, "Ändrade fält: " + ac.critId, REVIEWERS.find((r) => r.id === who)?.name));
    case "TOGGLE_SKILL_MUST": return updateActiveJob(state, (job) => ({ ...job, criteria: job.criteria.map((c) => c.id === "skills" ? { ...c, options: c.options.map((o, i) => i === ac.idx ? { ...o, must: !o.must } : o) } : c) }));
    case "ADD_FIELD": return updateActiveJob(state, (job) => bumpVersion({ ...job, criteria: [...job.criteria.filter((c) => c.block !== "text"), ac.field, ...job.criteria.filter((c) => c.block === "text")] }, "La till fält: " + ac.field.label, REVIEWERS.find((r) => r.id === who)?.name));
    case "REMOVE_FIELD": return updateActiveJob(state, (job) => bumpVersion({ ...job, criteria: job.criteria.filter((c) => c.id !== ac.critId) }, "Tog bort fält", REVIEWERS.find((r) => r.id === who)?.name));
    case "MOVE_FIELD": return updateActiveJob(state, (job) => { const arr = [...job.criteria]; const i = arr.findIndex((c) => c.id === ac.critId); const j = i + ac.dir; if (i < 0 || j < 0 || j >= arr.length) return job; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...job, criteria: arr }; });
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
    default: return state;
  }
}
const INITIAL = {
  jobs: JOBS0.map((j) => ({ ...j, autopilotOn: false })), activeJobId: "j1", candidates: CANDIDATES0, currentUserId: "u1",
  history: [], templates: DEFAULT_TEMPLATES, messages: [],
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
  { id: "queue", label: "Kö", icon: Layers },
  { id: "candidates", label: "Kandidater", icon: ClipboardList },
  { id: "form", label: "Formulär", icon: Blocks },
  { id: "stats", label: "Statistik", icon: BarChart3 },
  { id: "team", label: "Team & logg", icon: Activity },
  { id: "settings", label: "Inställningar", icon: Settings },
];

/* ---------- Inline sidrubrik + jobbväljare ---------- */
function JobSwitch({ state, D }) { const job = state.jobs.find((j) => j.id === state.activeJobId); return <Menu trigger={<button className="ats-jobswitch">{job.title} <ChevronDown size={13} /></button>}>{state.jobs.map((j) => <button key={j.id} className={"ats-menu-item" + (j.id === state.activeJobId ? " is-active" : "")} onClick={() => D({ type: "SET_ACTIVE_JOB", id: j.id })}><Briefcase size={13} /> {j.title}</button>)}</Menu>; }
function PageHeader({ title, meta, right }) { return <div className="ats-ph"><div className="ats-ph-l"><h1 className="ats-ph-title">{title}</h1>{meta && <div className="ats-ph-meta">{meta}</div>}</div>{right && <div className="ats-ph-r">{right}</div>}</div>; }
function Dot() { return <span className="ats-ph-dot">·</span>; }

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const D = dispatch;
  const [view, setView] = useState("dashboard");
  const [pinned, setPinned] = useState(() => store.get("rekyl_pin", false));
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [newJob, setNewJob] = useState(false);
  const [reasonFor, setReasonFor] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);

  const job = state.jobs.find((j) => j.id === state.activeJobId);
  const me = REVIEWERS.find((r) => r.id === state.currentUserId);
  const cands = useMemo(() => state.candidates.filter((c) => c.jobId === state.activeJobId).map((c) => ({ ...c, ...scoreCandidate(job, c.answers), missing: missingInfo(job, c) })), [state.candidates, job]);
  const allScored = useMemo(() => state.jobs.map((j) => ({ job: j, list: state.candidates.filter((c) => c.jobId === j.id).map((c) => ({ ...c, ...scoreCandidate(j, c.answers) })) })), [state.candidates, state.jobs]);
  const dupIndex = useMemo(() => { const by = {}; state.candidates.forEach((c) => { const k = (c.email || "").toLowerCase(); if (!k) return; (by[k] ||= []).push(c); }); return by; }, [state.candidates]);
  const showToast = useCallback((t) => { setToast(t); setTimeout(() => setToast(null), 2800); }, []);
  const togglePin = () => setPinned((p) => { store.set("rekyl_pin", !p); return !p; });
  const toggleCompare = (id) => setCompareIds((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s);
  const detail = detailId ? cands.find((c) => c.id === detailId) || allScored.flatMap((a) => a.list).find((c) => c.id === detailId) : null;
  const go = (v) => { setView(v); setMoreOpen(false); };

  const shared = { state, D, me, job, cands, showToast, setDetailId, setPrintDoc, compareIds, toggleCompare, openCompare: () => setCompareOpen(true), setReasonFor, setView: go, allScored, dupIndex };
  const primary = NAV.slice(0, 5), more = NAV.slice(5);

  return (
    <div className="ats-root">
      <Style />
      <div className={"ats-app" + (pinned ? " is-pinned" : "")}>
        <aside className="ats-side">
          <div className="ats-side-top"><div className="ats-brand"><span className="ats-logo">R</span><span className="ats-lbl ats-brandtxt">Rekyl</span></div><button className="ats-pin" onClick={togglePin} title={pinned ? "Las upp meny" : "Las fast meny"}>{pinned ? <Pin size={15} /> : <PinOff size={15} />}</button></div>
          <nav className="ats-nav">{NAV.map((n) => <button key={n.id} className={"ats-side-item" + (view === n.id ? " is-active" : "")} onClick={() => go(n.id)}><n.icon size={18} strokeWidth={2} /><span className="ats-lbl">{n.label}</span></button>)}</nav>
          <div className="ats-side-foot"><Menu trigger={<button className="ats-side-user"><span className="ats-avatar is-sm">{me.initials}</span><span className="ats-lbl ats-side-userinfo"><b>{me.name}</b><small>{ROLE_LABEL[me.role]}</small></span></button>}><div className="ats-menu-label">Visa som roll</div>{REVIEWERS.map((r) => <button key={r.id} className={"ats-menu-item" + (r.id === state.currentUserId ? " is-active" : "")} onClick={() => D({ type: "SET_USER", id: r.id })}><span className="ats-avatar is-xs">{r.initials}</span>{r.name} · {ROLE_LABEL[r.role]}</button>)}</Menu></div>
        </aside>

        <main className="ats-main">
          <div className="ats-canvas">
            {view === "dashboard" && <DashboardView {...shared} />}
            {view === "queue" && <QueueView {...shared} />}
            {view === "candidates" && <CandidatesView {...shared} />}
            {view === "form" && <FormView {...shared} />}
            {view === "stats" && <StatsView {...shared} />}
            {view === "team" && <TeamView {...shared} />}
            {view === "settings" && <SettingsView {...shared} />}
          </div>
        </main>

        <nav className="ats-bottomnav">{primary.map((n) => <button key={n.id} className={"ats-bn" + (view === n.id ? " is-active" : "")} onClick={() => go(n.id)}><n.icon size={19} /><span>{n.label}</span></button>)}<button className={"ats-bn" + (moreOpen || more.some((m) => m.id === view) ? " is-active" : "")} onClick={() => setMoreOpen((o) => !o)}><MenuIcon size={19} /><span>Mer</span></button></nav>
        {moreOpen && <div className="ats-more-sheet" onClick={() => setMoreOpen(false)}><div className="ats-more-inner" onClick={(e) => e.stopPropagation()}>{more.map((n) => <button key={n.id} className="ats-more-item" onClick={() => go(n.id)}><n.icon size={18} /> {n.label}</button>)}</div></div>}
      </div>

      {toast && <div className={"ats-toast is-" + toast.kind}>{toast.kind === "ok" ? <Check size={16} /> : toast.kind === "warn" ? <AlertTriangle size={16} /> : <Info size={16} />}{toast.msg}</div>}
      {detail && <CandidateDrawer cand={detail} state={state} D={D} me={me} job={state.jobs.find((j) => j.id === detail.jobId)} onClose={() => setDetailId(null)} showToast={showToast} setPrintDoc={setPrintDoc} dupIndex={dupIndex} compareIds={compareIds} toggleCompare={toggleCompare} />}
      {compareOpen && <CompareModal cands={cands} compareIds={compareIds} toggleCompare={toggleCompare} onClose={() => setCompareOpen(false)} job={job} />}
      {newJob && <NewJobModal onClose={() => setNewJob(false)} onCreate={(t, tmpl) => { D({ type: "ADD_JOB", title: t, tmplId: tmpl }); setNewJob(false); go("form"); }} />}
      {reasonFor && <ReasonModal onClose={() => setReasonFor(null)} onPick={(reason) => { D({ type: "DECIDE", id: reasonFor.id, status: "reject", reason }); showToast({ kind: "ok", msg: "Avslag · avslagsmejl köat" }); if (reasonFor.after) reasonFor.after(); setReasonFor(null); }} />}
      {printDoc && <PrintModal doc={printDoc} onClose={() => setPrintDoc(null)} />}
      <button className="ats-fab" onClick={() => setNewJob(true)} title="Ny tjänst"><Plus size={20} /></button>
    </div>
  );
}

function NewJobModal({ onClose, onCreate }) { const [title, setTitle] = useState(""); const [tmpl, setTmpl] = useState(TEMPLATES[0].id); return <Modal title="Ny tjänst" onClose={onClose} wide><div className="ats-nj"><label className="ats-field"><span className="ats-field-l">Titel</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Innesäljare Göteborg" /></label><div className="ats-field-l" style={{ marginTop: 4 }}>Starta från mall — scoring, knockout och kandidatkort forladdas automatiskt</div><div className="ats-tmplgrid">{TEMPLATES.map((t) => { const Ic = ICONS[t.icon] || Briefcase; return <button key={t.id} className={"ats-tmpl" + (tmpl === t.id ? " is-on" : "")} onClick={() => setTmpl(t.id)}><span className="ats-tmpl-ic"><Ic size={16} /></span><b>{t.name}</b><span>{t.desc}</span></button>; })}</div><button className={"ats-send" + (title.trim().length > 1 ? "" : " is-off")} onClick={() => title.trim().length > 1 && onCreate(title.trim(), tmpl)}>Skapa tjänst <ArrowRight size={16} /></button></div></Modal>; }
function ReasonModal({ onClose, onPick }) { return <Modal title="Anledning till avslag" onClose={onClose}><div className="ats-reasons">{REASONS.map((r) => <button key={r} className="ats-reason" onClick={() => onPick(r)}>{r}</button>)}</div><p className="ats-reason-note">Anledningen sparas i kandidatens timeline och i statistiken, och anvands i avslagsmejlet ({"{{rejectionReason}}"}).</p></Modal>; }
function PrintModal({ doc, onClose }) { return <div className="ats-printwrap"><div className="ats-print-toolbar"><span>{doc.title}</span><div><button className="ats-ghost" onClick={() => window.print()}><Download size={15} /> Skriv ut / PDF</button><button className="ats-ghost" onClick={onClose}><X size={15} /> Stang</button></div></div><div className="ats-printdoc">{doc.node}</div></div>; }

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
          <div className="ats-quick"><span className="ats-quick-v">{job.stats.submitted}/{job.stats.started}</span><span className="ats-quick-l">Skickade / pabörjade</span></div>
          <div className="ats-quick"><span className="ats-quick-v">{Math.round((job.stats.submitted / Math.max(1, job.stats.started)) * 100)}%</span><span className="ats-quick-l">Completion rate</span></div>
          <div className="ats-quick"><span className="ats-quick-v">{cands.filter((c) => c.missing.length).length}</span><span className="ats-quick-l">Ofullstandiga</span></div>
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
function CardFace({ c, onStar, onOpen, showActions }) {
  const musts = c.parts.filter((p) => p.kind === "must");
  const scored = c.parts.filter((p) => p.kind === "scored").sort((a, b) => b.earned - a.earned).slice(0, 3);
  const { green, red } = flagsOf(c);
  const last = (c.timeline || [])[0];
  return (
    <div className="ats-face">
      <div className="ats-face-top"><div className="ats-face-id"><div className="ats-avatar">{initials(c.name)}</div><div className="ats-face-idtxt"><div className="ats-name">{c.name}{c.starred && <Star size={13} className="ats-starred" fill="currentColor" />}</div><div className="ats-face-mail"><Mail size={11} /> {c.email}</div></div></div><ScoreDial value={c.total} knockout={c.knockout} size={70} /></div>
      <div className="ats-face-statusrow"><span className={"ats-statuspill is-" + c.status}>{statusLabel(c.status)}</span><span className="ats-face-src">{c.source} · {timeAgo(c.appliedAt)}</span></div>
      {c.knockout && <div className="ats-ko"><ShieldAlert size={14} /> Diskvalificerad — {c.knockoutReasons.join(", ").toLowerCase()}</div>}
      {musts.length > 0 && <div className="ats-musts">{musts.map((m) => { const Icon = ICONS[m.icon] || ShieldCheck; return <span key={m.id} className={"ats-must" + (m.ok ? " is-ok" : " is-no")}><Icon size={12} /> {m.label} {m.ok ? "OK" : "saknas"}</span>; })}</div>}
      <div className="ats-flagcols">
        <div className="ats-flagcol"><div className="ats-flagcol-h is-green"><Check size={12} /> Green flags</div>{green.length ? green.map((g, i) => <span key={i} className="ats-flag is-green">{g}</span>) : <span className="ats-flag-none">—</span>}</div>
        <div className="ats-flagcol"><div className="ats-flagcol-h is-red"><AlertTriangle size={12} /> Red flags</div>{red.length ? red.map((g, i) => <span key={i} className="ats-flag is-red">{g}</span>) : <span className="ats-flag-none">Inga</span>}</div>
      </div>
      <div className="ats-break"><div className="ats-break-h"><span>Viktigaste krav</span><span className="ats-break-max">bidrag</span></div>
        {scored.map((p) => { const Icon = ICONS[p.icon] || Award; return <div key={p.id} className="ats-break-row"><span className="ats-break-ic"><Icon size={13} /></span><div className="ats-break-main"><div className="ats-break-label"><span>{p.label}</span><span className="ats-break-detail">{p.detail}</span></div><div className="ats-break-bar"><div className="ats-break-bar-fill" style={{ width: Math.round(p.frac * 100) + "%" }} /></div></div><span className="ats-break-pts">+{Math.round(p.earned)}</span></div>; })}
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
  const allowed = can(me.role, "decide"); const startRef = useRef(null);
  const deck = useMemo(() => { let d = cands.filter((c) => c.status === "new"); if (query.trim()) d = d.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())); if (hideKO) d = d.filter((c) => !c.knockout); d.sort((a, b) => sort === "score" ? (a.knockout !== b.knockout ? (a.knockout ? 1 : -1) : b.total - a.total) : b.appliedAt - a.appliedAt); return d; }, [cands, sort, hideKO, query]);
  const reviewed = cands.filter((c) => c.status !== "new").length, total = cands.length; const top = deck[0];
  const DIRS = { right: { status: "shortlist", label: "Shortlist", toast: "intressemejl" }, up: { status: "interview", label: "Intervju", toast: "intervjumejl" }, down: { status: "reserve", label: "Reservlista", toast: "reservmejl" }, left: { status: "reject", label: "Avslag", toast: "avslagsmejl" } };

  const commit = useCallback((dir) => {
    if (!top || exit || !allowed) return;
    if (dir === "left") { setReasonFor({ id: top.id }); return; }
    const d = DIRS[dir]; setExit({ dir }); const snap = { id: top.id, name: top.name, label: d.label, toast: d.toast, email: top.email };
    setTimeout(() => { D({ type: "DECIDE", id: top.id, status: d.status }); setExit(null); setDrag({ dx: 0, dy: 0, active: false }); setLast(snap); showToast({ kind: snap.email ? "ok" : "warn", msg: snap.email ? `${d.label} · ${d.toast} köat` : `${d.label} · mejl EJ köat (saknar e-post)` }); }, 300);
  }, [top, exit, allowed, D, setReasonFor, showToast]);
  useEffect(() => { const onKey = (e) => { if (e.key === "ArrowRight") commit("right"); else if (e.key === "ArrowLeft") commit("left"); else if (e.key === "ArrowUp") commit("up"); else if (e.key === "ArrowDown") commit("down"); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [commit]);
  const onDown = (e) => { if (exit || !allowed) return; startRef.current = { x: e.clientX, y: e.clientY }; setDrag({ dx: 0, dy: 0, active: true }); e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (!drag.active || !startRef.current) return; setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y, active: true }); };
  const onUp = () => { if (!drag.active) return; const { dx, dy } = drag; if (Math.abs(dx) > Math.abs(dy)) { if (dx > 120) commit("right"); else if (dx < -120) commit("left"); else setDrag({ dx: 0, dy: 0, active: false }); } else { if (dy < -110) commit("up"); else if (dy > 110) commit("down"); else setDrag({ dx: 0, dy: 0, active: false }); } startRef.current = null; };

  const header = <PageHeader title="Kö" meta={<><JobSwitch state={state} D={D} /><Dot /><span>{deck.length} väntar</span></>} right={<div className="ats-queue-filters"><div className="ats-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sok…" /></div><button className={"ats-chip" + (sort === "score" ? " is-on" : "")} onClick={() => setSort("score")}>Bast</button><button className={"ats-chip" + (sort === "new" ? " is-on" : "")} onClick={() => setSort("new")}>Senaste</button><button className={"ats-chip" + (hideKO ? " is-on" : "")} onClick={() => setHideKO((v) => !v)}>Dolj diskade</button></div>} />;

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
    </div>
  );
}
function ArrowLeftIcon() { return <ChevronLeft size={12} style={{ display: "inline", verticalAlign: "-2px" }} />; }

/* ===================== KANDIDATER ===================== */
function toCSV(list) { const head = ["Namn", "E-post", "Telefon", "Matchning", "Status", "Källa", "Betyg", "Diskvalificerad", "Saknar", "Avslagsanledning"]; const rows = list.map((c) => [c.name, c.email || "", c.phone || "", c.total + "%", statusLabel(c.status), c.source, c.rating || "", c.knockout ? "Ja" : "Nej", (c.missing || []).join("|"), c.reason || ""]); return [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"); }
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
      <div className="ats-cand-tools"><div className="ats-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sok kandidat…" /></div>
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
  const dupOf = (dupIndex[(c.email || "").toLowerCase()] || []).filter((x) => x.id !== c.id);
  const decide = (status, reason) => { D({ type: "DECIDE", id: c.id, status, reason }); showToast({ kind: c.email ? "ok" : "warn", msg: c.email ? `${statusLabel(status)} · mejl köat` : `${statusLabel(status)} · mejl EJ köat (saknar e-post)` }); };
  const sendMsg = (trigger) => { D({ type: "SEND_MESSAGE", id: c.id, trigger }); showToast({ kind: c.email ? "ok" : "warn", msg: c.email ? "Mejl köat i mejlloggen" : "EJ köat — saknar e-post" }); };
  return (
    <div className="ats-drawer-bg" onClick={onClose}><div className="ats-drawer" onClick={(e) => e.stopPropagation()}>
      <div className="ats-drawer-h"><div><h3>{c.name}</h3><span>{c.email || "e-post saknas"} · {c.phone || "telefon saknas"}</span></div><button onClick={onClose}><X size={18} /></button></div>
      <div className="ats-drawer-body">
        <div className="ats-drawer-score"><ScoreDial value={c.total} knockout={c.knockout} size={84} /><div><span className={"ats-statuspill is-" + c.status}>{statusLabel(c.status)}</span>{c.knockout ? <div className="ats-ko is-mini"><ShieldAlert size={13} /> {c.knockoutReasons.join(", ")}</div> : <div className="ats-below is-ok"><Check size={13} /> Uppfyller obligatoriska krav</div>}<TagPills tags={c.tags} /><MissingChips items={c.missing} /></div></div>
        {dupOf.length > 0 && <div className="ats-dupbox"><History size={13} /> Har sokt {dupOf.length + 1} gånger. {dupOf.map((d) => { const j = state.jobs.find((x) => x.id === d.jobId); return <span key={d.id} className="ats-dup-item">{j ? j.title : d.jobId} · {statusLabel(d.status)}</span>; })}</div>}

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><UserCheck size={12} /> Team review</div><div className="ats-verdicts">{[["yes", "Ja", ThumbsUp], ["maybe", "Osäker", HelpCircle], ["no", "Nej", ThumbsDown]].map(([v, label, Ic]) => <button key={v} disabled={!canVote} className={"ats-verdict is-" + v + (c.reviews[me.id] === v ? " is-on" : "")} onClick={() => D({ type: "REVIEW", id: c.id, verdict: v })}><Ic size={14} /> {label}</button>)}</div>{Object.keys(c.reviews).length > 0 && <div className="ats-cons-pills">{REVIEWERS.filter((r) => c.reviews[r.id]).map((r) => <span key={r.id} className={"ats-cons is-" + c.reviews[r.id]}>{r.initials}: {c.reviews[r.id] === "yes" ? "Ja" : c.reviews[r.id] === "no" ? "Nej" : "Osäker"}</span>)}</div>}</div>

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><Activity size={12} /> Timeline</div><div className="ats-tline">{(c.timeline || []).slice(0, 9).map((e) => <div key={e.id} className="ats-tline-row"><span className="ats-tline-dot" /><div className="ats-tline-main"><b>{TL_LABEL[e.kind] || e.kind}</b>{e.detail && <span> · {e.detail}</span>}</div><span className="ats-tline-time">{timeAgo(e.at)}</span></div>)}</div></div>

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><Gauge size={12} /> Poängunderlag</div>{c.parts.filter((p) => p.kind === "scored").map((p) => <div key={p.id} className="ats-break-row"><div className="ats-break-main"><div className="ats-break-label"><span>{p.label}</span><span className="ats-break-detail">{p.detail}</span></div><div className="ats-break-bar"><div className="ats-break-bar-fill" style={{ width: Math.round(p.frac * 100) + "%" }} /></div></div><span className="ats-break-pts">+{Math.round(p.earned)}</span></div>)}</div>

        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><Star size={12} /> Betyg</div><Stars value={c.rating} readOnly={!canComment} onSet={(n) => D({ type: "RATE", id: c.id, rating: n })} /></div>
        <div className="ats-drawer-sec"><div className="ats-drawer-sec-h"><FileText size={12} /> Kommentarer</div>{c.comments.map((m) => { const a = REVIEWERS.find((r) => r.id === m.by); return <div key={m.id} className="ats-cmt"><span className="ats-avatar is-xs">{a?.initials || "?"}</span><div><b>{a?.name}</b> <small>{timeAgo(m.at)}</small><p>{m.text}</p></div></div>; })}{canComment && <CommentBox onAdd={(t) => D({ type: "COMMENT", id: c.id, text: t })} />}</div>

        {canMsg && <div className="ats-drawer-msgs">{c.missing.length > 0 && <button className="ats-ghost" onClick={() => sendMsg("completion")}><Bell size={14} /> Begär komplettering</button>}<button className="ats-ghost" onClick={() => sendMsg("reminder")}><Mail size={14} /> Paminnelse</button><button className="ats-ghost" onClick={() => { toggleCompare(c.id); showToast({ kind: "ok", msg: compareIds.includes(c.id) ? "Borttagen från jämförelse" : "Tillagd i jämförelse" }); }}><GitCompare size={14} /> {compareIds.includes(c.id) ? "I jämförelse" : "Jämför"}</button></div>}
      </div>
      <div className="ats-drawer-foot">
        <button className="ats-ghost is-sm" onClick={() => setPrintDoc({ title: "Scorecard", node: <ScorecardDoc job={job} c={c} org={state.org} /> })}><FileText size={14} /> PDF</button>
        {canDecide && <div className="ats-drawer-decide">
          <Menu align="right" trigger={<button className="ats-dq-rej" title="Avslå"><X size={15} /></button>}><div className="ats-menu-label">Avslagsanledning</div>{REASONS.map((r) => <button key={r} className="ats-menu-item" onClick={() => decide("reject", r)}>{r}</button>)}</Menu>
          <button className="ats-dq-res" title="Reservlista" onClick={() => decide("reserve")}><PauseCircle size={15} /></button>
          <button className="ats-dq-int" title="Intervju" onClick={() => decide("interview")}><CalendarCheck size={15} /></button>
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

function optLabel(o){ return typeof o === "string" ? o : o.value; }
function FieldSettings({ c, job, D }) {
  const [adv, setAdv] = useState(false);
  const setC = (patch) => D({ type: "SET_CRIT", critId: c.id, patch });
  const setF = (patch) => D({ type: "SET_FIELD_FLAG", critId: c.id, patch });
  const condCandidates = job.criteria.filter((x) => x.id !== c.id && (x.type === "boolean" || x.type === "select"));
  const hasOptions = c.type === "multiselect" || c.type === "select" || c.type === "ordinal";
  const optArr = c.type === "ordinal" ? (c.scale || []) : (c.options || []);
  const writeOpts = (arr) => { if (c.type === "ordinal") setC({ scale: arr }); else setC({ options: arr }); };
  const renameOpt = (i, val) => writeOpts(optArr.map((o, k) => k === i ? (c.type === "multiselect" ? { ...o, value: val } : val) : o));
  const removeOpt = (i) => writeOpts(optArr.filter((_, k) => k !== i));
  const addOpt = () => writeOpts([...optArr, c.type === "multiselect" ? { value: "Nytt alternativ", must: false } : "Nytt alternativ"]);
  const toggleMust = (i) => writeOpts(optArr.map((o, k) => k === i ? { ...o, must: !o.must } : o));
  const duplicate = () => { const clone = { ...JSON.parse(JSON.stringify(c)), id: c.block + "_" + uid(), label: c.label + " (kopia)" }; D({ type: "ADD_FIELD", field: clone }); };
  return (
    <div className="ats-fset">
      <label className="ats-fset-row"><span>Etikett</span><input value={c.label} onChange={(e) => setC({ label: e.target.value })} /></label>
      <label className="ats-fset-row"><span>Hjälptext (visas för kandidaten)</span><input value={c.help || ""} onChange={(e) => setC({ help: e.target.value })} placeholder="t.ex. Ange antal hela år" /></label>
      <div className="ats-fset-toggles">
        {c.type !== "text" && c.type !== "file" && c.type !== "date" && c.type !== "phone" && c.type !== "url" && <button className={"ats-toggle" + (c.scored ? " is-on" : "")} onClick={() => setF({ scored: !c.scored })}><Gauge size={12} /> Påverkar poäng</button>}
        <button className={"ats-toggle" + (c.required ? " is-on" : "")} onClick={() => setF({ required: !c.required })}><CircleAlert size={12} /> Obligatorisk</button>
        {c.type === "boolean" && <button className={"ats-toggle is-ko" + (c.knockout ? " is-on" : "")} onClick={() => setF({ knockout: !c.knockout })}><ShieldAlert size={12} /> Knockout</button>}
      </div>
      {c.scored && c.type !== "text" && c.type !== "file" && <label className="ats-fset-row"><span>Vikt {weightOf(job, c)}</span><input type="range" min="0" max="40" value={weightOf(job, c)} onChange={(e) => D({ type: "SET_WEIGHT", critId: c.id, weight: Number(e.target.value) })} /></label>}
      {c.type === "number" && <label className="ats-fset-row"><span>Målvärde</span><input type="number" value={c.ideal} onChange={(e) => setC({ ideal: Number(e.target.value) })} /></label>}
      {c.type === "budget" && <label className="ats-fset-row"><span>Lönetak</span><input type="number" value={c.budget} onChange={(e) => setC({ budget: Number(e.target.value) })} /></label>}
      {hasOptions && <div className="ats-optedit"><div className="ats-optedit-h"><ListChecks size={12} /> Alternativ</div>{optArr.map((o, i) => <div key={i} className="ats-optrow"><input value={optLabel(o)} onChange={(e) => renameOpt(i, e.target.value)} />{c.type === "multiselect" && <button className={"ats-optmust" + (o.must ? " is-on" : "")} onClick={() => toggleMust(i)} title="Obligatoriskt (knockout)"><ShieldAlert size={12} /></button>}<button className="ats-optdel" onClick={() => removeOpt(i)}><X size={13} /></button></div>)}<button className="ats-ghost is-sm" onClick={addOpt}><Plus size={12} /> Lägg till alternativ</button></div>}
      <div className="ats-fset-actions"><button className="ats-ghost is-sm" onClick={duplicate}><Copy size={12} /> Duplicera fält</button></div>
      <button className="ats-advtoggle" onClick={() => setAdv((v) => !v)}>{adv ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Avancerat</button>
      {adv && <div className="ats-adv">
        <label className="ats-fset-row"><span>Steg i formuläret</span><select value={c.step} onChange={(e) => setF({ step: Number(e.target.value) })}>{[2, 3, 4, 5].map((s) => <option key={s} value={s}>{STEP_LABEL[s] || ("Steg " + s)}</option>)}</select></label>
        <button className={"ats-toggle" + (c.display ? " is-on" : "")} onClick={() => setF({ display: !c.display })}><Eye size={12} /> Syns på kandidatkort</button>
        {c.type === "boolean" && c.knockout && <label className="ats-fset-row"><span>Diskvalificera om svar</span><select value={String(c.koValue)} onChange={(e) => setF({ koValue: e.target.value === "true" })}><option value="false">Nej</option><option value="true">Ja</option></select></label>}
        <div className="ats-fset-cond"><div className="ats-fset-cond-h"><Workflow size={12} /> Visa endast om (villkor)</div>
          {c.showIf ? <div className="ats-fset-condrow"><span>{job.criteria.find((x) => x.id === c.showIf.field)?.label || c.showIf.field} = <b>{String(c.showIf.equals)}</b></span><button onClick={() => setF({ showIf: null })}><X size={12} /></button></div>
            : condCandidates.length > 0 ? <div className="ats-fset-condadd"><select id={"cond-" + c.id} className="ats-select is-sm" defaultValue=""><option value="" disabled>Välj fält…</option>{condCandidates.map((x) => x.type === "boolean" ? [<option key={x.id + "t"} value={x.id + "::true"}>{x.label} = Ja</option>, <option key={x.id + "f"} value={x.id + "::false"}>{x.label} = Nej</option>] : (x.options || []).map((o) => { const val = typeof o === "string" ? o : o.value; return <option key={x.id + val} value={x.id + "::" + val}>{x.label} = {val}</option>; }))}</select><button className="ats-ghost is-sm" onClick={() => { const el = document.getElementById("cond-" + c.id); if (!el || !el.value) return; const [field, raw] = el.value.split("::"); const equals = raw === "true" ? true : raw === "false" ? false : raw; setF({ showIf: { field, equals } }); }}><Plus size={12} /></button></div>
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
  if (c.type === "file") return <label className="ats-fileinp"><Upload size={14} /> {value ? value : "Välj fil…"}<input type="file" style={{ display: "none" }} onChange={(e) => onChange(e.target.files?.[0]?.name || "")} /></label>;
  if (c.type === "boolean") return <div className="ats-yn"><button className={value === true ? "is-on" : ""} onClick={() => onChange(true)}>Ja</button><button className={value === false ? "is-on" : ""} onClick={() => onChange(false)}>Nej</button></div>;
  if (c.type === "multiselect") { const sel = Array.isArray(value) ? value : []; return <div className="ats-chipset">{(c.options||[]).map((o) => { const v = o.value; const on = sel.includes(v); return <button key={v} className={"ats-selchip" + (on ? " is-on" : "") + (o.must ? " is-must" : "")} onClick={() => onChange(on ? sel.filter((x) => x !== v) : [...sel, v])}>{on && <Check size={12} />}{v}{o.must && <span className="ats-mustdot">krav</span>}</button>; })}</div>; }
  const opts = c.type === "ordinal" ? c.scale : c.options; return <div className="ats-chipset">{(opts||[]).map((o) => <button key={o} className={"ats-selchip" + (value === o ? " is-on" : "")} onClick={() => onChange(o)}>{value === o && <Check size={12} />}{o}</button>)}</div>;
}

function ApplyForm({ job, D, org, showToast }) {
  const [answers, setAnswers] = useState({}); const [base, setBase] = useState({ name: "", email: "", phone: "" }); const [consent, setConsent] = useState(false); const [step, setStep] = useState(0); const [sent, setSent] = useState(false); const [touched, setTouched] = useState(false);
  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const visible = job.criteria.filter((c) => isVisible(c, answers));
  const stepNums = Array.from(new Set(visible.map((c) => c.step))).sort((a, b) => a - b);
  const steps = [{ key: "base", label: "Grunduppgifter" }, ...stepNums.map((n) => ({ key: n, label: STEP_LABEL[n] || "Frågor" })), { key: "gdpr", label: "Skicka in" }];
  const cur = steps[step];
  const live = useMemo(() => scoreCandidate(job, answers), [job, answers]);
  const stepFields = typeof cur.key === "number" ? visible.filter((c) => c.step === cur.key) : [];
  const nameOk = base.name.trim().length > 1; const emailOk = validEmail(base.email.trim());
  const canNext = cur.key === "base" ? (nameOk && emailOk) : cur.key === "gdpr" ? consent : stepFields.filter((c) => c.required).every((c) => { const v = answers[c.id]; return !(v == null || v === "" || (Array.isArray(v) && v.length === 0)); });

  if (sent) return <div className="ats-applied"><div className="ats-empty-badge"><CheckCircle2 size={22} /></div><h3>Tack {base.name.split(" ")[0]}!</h3><p>Din ansökan till {job.title} är mottagen. En bekräftelse har köats till {base.email}. Ansökan syns nu i kön med {live.total}% matchning.</p><button className="ats-ghost" onClick={() => { setSent(false); setAnswers({}); setBase({ name: "", email: "", phone: "" }); setConsent(false); setStep(0); setTouched(false); }}>Fyll i en till</button></div>;

  const submit = () => { if (!nameOk || !emailOk || !consent) { setTouched(true); return; } D({ type: "APPLY", cand: { id: "c" + uid(), name: base.name.trim(), email: base.email.trim(), phone: base.phone.trim() || null, source: "Förhandsvisning", answers, rating: 0, comments: [], reviews: {}, status: "new", starred: false, appliedAt: Date.now(), reason: null, formVersion: job.version } }); setSent(true); showToast && showToast({ kind: "ok", msg: "Ansökan inskickad · bekräftelsemejl köat" }); };

  return (
    <div className="ats-apply">
      <div className="ats-apply-top"><div><div className="ats-apply-co">{org.companyName}</div><div className="ats-apply-title">{job.title}</div></div><div className="ats-apply-live"><ScoreDial value={live.total} knockout={live.knockout} size={54} /><span>live-matchning</span></div></div>
      <div className="ats-apply-steps">{steps.map((s, i) => <div key={String(s.key)} className={"ats-apply-step" + (i === step ? " is-on" : i < step ? " is-done" : "")}>{i < step ? <Check size={11} /> : i + 1}<span>{s.label}</span></div>)}</div>
      <div className="ats-apply-body">
        {cur.key === "base" && <div className="ats-apply-fields">
          <label className="ats-apply-f"><span>Namn *</span><input className={"ats-inp" + (touched && !nameOk ? " is-err" : "")} value={base.name} onChange={(e) => setBase((b) => ({ ...b, name: e.target.value }))} onBlur={() => setTouched(true)} />{touched && !nameOk && <span className="ats-err-txt">Ange ditt namn.</span>}</label>
          <label className="ats-apply-f"><span>E-post *</span><input className={"ats-inp" + (touched && !emailOk ? " is-err" : "")} value={base.email} onChange={(e) => setBase((b) => ({ ...b, email: e.target.value }))} onBlur={() => setTouched(true)} placeholder="namn@mejl.se" />{touched && !emailOk && <span className="ats-err-txt">Ange en giltig e-postadress — den anvands för all kommunikation kring ansökan.</span>}</label>
          <label className="ats-apply-f"><span>Telefon</span><input className="ats-inp" value={base.phone} onChange={(e) => setBase((b) => ({ ...b, phone: e.target.value }))} placeholder="070-…" /></label>
        </div>}
        {typeof cur.key === "number" && <div className="ats-apply-fields">{stepFields.map((c) => <div key={c.id} className="ats-apply-f"><span>{c.label} {c.required && "*"} {c.knockout && <span className="ats-reqko">krav</span>}</span><FieldInput c={c} value={answers[c.id]} onChange={(v) => set(c.id, v)} />{c.help && <small className="ats-fieldhelp">{c.help}</small>}</div>)}</div>}
        {cur.key === "gdpr" && <div className="ats-apply-gdpr"><label className={"ats-gdpr-check" + (touched && !consent ? " is-err" : "")}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Jag samtycker till att {org.companyName} sparar mina uppgifter och kontaktar mig via e-post om min ansökan. *</span></label>{touched && !consent && <span className="ats-err-txt">Samtycke kravs för att skicka in ansökan.</span>}<p className="ats-gdpr-text">Din e-postadress och dina svar sparas för att behandla ansökan och kontakta dig kring rekryteringen: bekräftelse, statusuppdateringar, kompletteringar, intervju och besked. Uppgifterna anvands enbart för detta syfte och delas inte för marknadsforing.</p></div>}
      </div>
      <div className="ats-apply-nav">{step > 0 ? <button className="ats-ghost" onClick={() => setStep((s) => s - 1)}><ChevronLeft size={15} /> Bakat</button> : <span />}{step < steps.length - 1 ? <button className={"ats-send" + (canNext ? "" : " is-off")} onClick={() => { setTouched(true); if (canNext) setStep((s) => s + 1); }}>Nästa <ArrowRight size={15} /></button> : <button className={"ats-send" + (canNext ? "" : " is-off")} onClick={submit}>Skicka ansökan <Send size={15} /></button>}</div>
    </div>
  );
}

function FormView({ job, D, me, state, showToast }) {
  const [tab, setTab] = useState("bygg"); const [selId, setSelId] = useState(job.criteria[0]?.id);
  const canEdit = can(me.role, "edit");
  const sel = job.criteria.find((c) => c.id === selId);
  const skills = job.criteria.find((c) => c.id === "skills");
  const scored = job.criteria.filter((c) => c.scored && c.type !== "text" && c.type !== "file");
  const link = `${state.org.appUrl}/j/${job.slug}`; const embed = `<iframe src="${link}/inbäddad" width="100%" height="720" style="border:0" title="${job.title}"></iframe>`;
  const [advScore, setAdvScore] = useState(false);
  const addDefaults = () => { D({ type: "ADD_AUTORULE", rule: { field: "total", op: ">=", value: 85, then: "shortlist" } }); D({ type: "ADD_AUTORULE", rule: { field: "total", op: "<", value: 45, then: "reject" } }); showToast({ kind: "ok", msg: "Smarta standardregler tillagda" }); };

  return (
    <div className="ats-view">
      <PageHeader title="Formulär" meta={<><JobSwitch state={state} D={D} /><Dot /><span>formulär v{job.version}</span></>} right={<button className="ats-ghost is-accent" onClick={() => setTab("dela")}><Eye size={15} /> Förhandsvisa</button>} />
      <div className="ats-subtabs">{[["bygg", "Formulär", Blocks], ["scoring", "Scoring & krav", Gauge], ["auto", "Automation", Workflow], ["dela", "Dela & förhandsvisa", Link2]].map(([id, label, Ic]) => <button key={id} className={"ats-subtab" + (tab === id ? " is-on" : "")} onClick={() => setTab(id)}><Ic size={14} /> {label}</button>)}</div>

      {tab === "bygg" && <div className="ats-grid-builder">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Struktur</h2>{canEdit && <Menu align="right" trigger={<button className="ats-ghost is-sm"><Plus size={13} /> Lägg till block</button>}>{ADDABLE.map(([b, label]) => <button key={b} className="ats-menu-item" onClick={() => { const f = buildField(b); D({ type: "ADD_FIELD", field: f }); setSelId(f.id); }}><Blocks size={13} /> {label}</button>)}</Menu>}</div>
          <p className="ats-builder-note"><Sparkles size={12} /> Formuläret <b>är</b> scoringmotorn. Scoring, knockout och kandidatkort skapas automatiskt från fälten.</p>
          <div className="ats-blocklist">{job.criteria.map((c, i) => { const Ic = ICONS[c.icon] || FileText; return <button key={c.id} className={"ats-blockrow" + (selId === c.id ? " is-sel" : "")} onClick={() => setSelId(c.id)}>
            <span className="ats-blockrow-ic"><Ic size={15} /></span><div className="ats-blockrow-txt"><b>{c.label}</b><span className="ats-blockrow-meta">{TYPE_LABEL[c.type]}{c.scored ? ` · vikt ${weightOf(job, c)}` : " · info"}{c.knockout ? " · knockout" : ""}{c.showIf ? " · villkorad" : ""}</span></div>
            {canEdit && <span className="ats-blockrow-acts"><span onClick={(e) => { e.stopPropagation(); D({ type: "MOVE_FIELD", critId: c.id, dir: -1 }); }} className={i === 0 ? "is-off" : ""}><ArrowUp size={14} /></span><span onClick={(e) => { e.stopPropagation(); D({ type: "MOVE_FIELD", critId: c.id, dir: 1 }); }} className={i === job.criteria.length - 1 ? "is-off" : ""}><ArrowDown size={14} /></span><span className="is-danger" onClick={(e) => { e.stopPropagation(); D({ type: "REMOVE_FIELD", critId: c.id }); if (selId === c.id) setSelId(job.criteria[0]?.id); }}><Trash2 size={14} /></span></span>}
          </button>; })}</div>
        </div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>{sel ? "Fältinställningar" : "Sammanfattning"}</h2></div>{sel && canEdit ? <FieldSettings c={sel} job={job} D={D} /> : <div className="ats-buildsum"><div><span>Fält</span><b>{job.criteria.length}</b></div><div><span>Poängsätta</span><b>{job.criteria.filter((c) => c.scored).length}</b></div><div><span>Knockout</span><b>{job.criteria.filter((c) => c.knockout).length}</b></div><div><span>Villkorade</span><b>{job.criteria.filter((c) => c.showIf).length}</b></div></div>}</div>
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
function RuleAdder({ criteria, onAdd }) { const [field, setField] = useState("total"); const [op, setOp] = useState(">="); const [value, setValue] = useState(80); const [tag, setTag] = useState("Toppmatch"); const numeric = [["total", "Matchning"], ...criteria.filter((c) => c.type === "number").map((c) => [c.id, c.label])]; return <div className="ats-ruleadd"><select className="ats-select is-sm" value={field} onChange={(e) => setField(e.target.value)}>{numeric.map((f) => <option key={f[0]} value={f[0]}>{f[1]}</option>)}</select><select className="ats-select is-sm" value={op} onChange={(e) => setOp(e.target.value)}>{[">=", ">", "<=", "<"].map((o) => <option key={o}>{o}</option>)}</select><input className="ats-inp is-sm" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} /><input className="ats-inp is-sm" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tagg" /><button className="ats-ghost is-sm" onClick={() => tag.trim() && onAdd({ field, op, value, tag: tag.trim() })}><Plus size={13} /></button></div>; }
function AutoRuleAdder({ onAdd }) { const [field, setField] = useState("total"); const [op, setOp] = useState(">="); const [value, setValue] = useState(85); const [then, setThen] = useState("shortlist"); return <><select className="ats-select is-sm" value={field} onChange={(e) => setField(e.target.value)}><option value="total">Matchning</option><option value="knockout">Diskvalificerad</option></select><select className="ats-select is-sm" value={op} onChange={(e) => setOp(e.target.value)}>{[">=", ">", "<=", "<", "="].map((o) => <option key={o}>{o}</option>)}</select><input className="ats-inp is-sm" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} /><ArrowRight size={14} /><select className="ats-select is-sm" value={then} onChange={(e) => setThen(e.target.value)}>{["shortlist", "interview", "reserve", "reject", "flag"].map((t) => <option key={t} value={t}>{statusLabel(t) === t ? "Flagga" : statusLabel(t)}</option>)}</select><button className="ats-ghost is-sm" onClick={() => onAdd({ field, op, value, then })}><Plus size={13} /></button></>; }

/* ===================== STATISTIK ===================== */
function StatsView({ cands, job, state, D }) {
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
  const funnel = [["Pabörjade", started, "neutral"], ["Skickade", submitted, "green"], ["Kvalificerade", cands.filter((c) => !c.knockout && c.total >= 55).length, "green"], ["Gick vidare", advanced, "amber"], ["Anställda", cands.filter((c) => c.status === "hired").length, "gold"]];
  const fMax = Math.max(1, ...funnel.map((f) => f[1]));
  return (
    <div className="ats-view">
      <PageHeader title="Statistik" meta={<><JobSwitch state={state} D={D} /><Dot /><span>kvalitet och källor</span></>} />
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
function TeamView({ state, me }) {
  const perms = [["decide", "Beslut"], ["vote", "Team review"], ["message", "Mejl"], ["edit", "Redigera"], ["comment", "Kommentera"], ["export", "Export"]];
  const msgs = state.messages.slice(0, 24);
  const cName = (id) => state.candidates.find((c) => c.id === id)?.name || "—";
  return (
    <div className="ats-view">
      <PageHeader title="Team & logg" meta={<><span>{REVIEWERS.length} personer</span><Dot /><span>{state.log.length} händelser</span></>} />
      <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Team & behörigheter</h2></div>
          <div className="ats-permtable"><div className="ats-permrow ats-permhead"><span>Person</span>{perms.map((p) => <span key={p[0]}>{p[1]}</span>)}</div>
            {REVIEWERS.map((r) => <div key={r.id} className={"ats-permrow" + (r.id === me.id ? " is-me" : "")}><span className="ats-permname"><span className="ats-avatar is-xs">{r.initials}</span><span>{r.name}<small>{ROLE_LABEL[r.role]}</small></span></span>{perms.map((p) => <span key={p[0]}>{can(r.role, p[0]) ? <Check size={14} className="ats-permyes" /> : <X size={13} className="ats-permno" />}</span>)}</div>)}
          </div>
          <p className="ats-builder-note"><ShieldCheck size={12} /> Team review, beslut i kön och per-kandidat-timeline gor processen sparbar och rättssäker.</p>
        </div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>Revisionslogg</h2><span className="ats-summono">senaste händelser</span></div>
          <div className="ats-log">{state.log.map((l) => <div key={l.id} className="ats-log-row"><span className="ats-log-dot" /><div className="ats-log-main"><b>{l.action}</b>{l.detail && <span> · {l.detail}</span>}<div className="ats-log-meta">{l.who} · {timeAgo(l.at)}</div></div></div>)}</div>
        </div>
      </div>
      <div className="ats-panel"><div className="ats-panel-h"><h2>Mejllogg</h2><span className="ats-summono">{state.messages.length} meddelanden</span></div>
        <div className="ats-honestbar"><Info size={13} /> Varje mejl loggas här och i kandidatens timeline med sann status. Status <b>Köad</b> betyder att mejlet är berett för utskick via appens backend (SMTP-modulen) — konfigurera SMTP under Inställningar. Ingen status visar "levererad" forran backend bekraftar leverans.</div>
        {msgs.length === 0 ? <div className="ats-col-empty" style={{ padding: 20 }}>Inga mejl loggade än. Swipa i kön så köas rätt mejl automatiskt.</div>
          : <div className="ats-msglog"><div className="ats-msglog-head"><span>Status</span><span>Mottagare</span><span>Ämne</span><span>Mall / trigger</span><span>Tid</span></div>{msgs.map((m) => <div key={m.id} className="ats-msglog-row"><span className={"ats-msgstatus is-" + m.status}>{m.status === "queued" ? "Köad" : "Fel"}</span><span className="ats-msglog-to">{cName(m.candidateId)}<small>{m.to}</small></span><span className="ats-msglog-subj">{m.subject}{m.error && <small className="ats-msgerr">{m.error}</small>}</span><span className="ats-msglog-tpl">{m.tplName}<small>{m.trigger}</small></span><span className="ats-msglog-time">{timeAgo(m.at)}</span></div>)}</div>}
      </div>
    </div>
  );
}

/* ===================== INSTALLNINGAR ===================== */
const VAR_CHIPS = ["candidateName", "jobTitle", "companyName", "hrName", "hrEmail", "missingField", "interviewTime", "rejectionReason"];
function SettingsView({ state, D, me, job, cands, showToast }) {
  const canEdit = can(me.role, "edit");
  const [selId, setSelId] = useState(state.templates[0]?.id);
  const [prevId, setPrevId] = useState(cands[0]?.id);
  const tpl = state.templates.find((t) => t.id === selId) || state.templates[0];
  const org = state.org;
  const setOrg = (patch) => D({ type: "SET_ORG", patch });
  const patchTpl = (p) => D({ type: "UPDATE_TEMPLATE", id: tpl.id, patch: p });
  const previewCand = cands.find((c) => c.id === prevId) || cands[0];
  const vars = previewCand ? tplVars(state, previewCand, job) : {};
  const envBlock = `# Rekyl SMTP - lägg i .env.local (backend)\nSMTP_HOST=smtp.din-leverantör.se\nSMTP_PORT=587\nSMTP_USER=${org.fromEmail}\nSMTP_PASS=din-smtp-nyckel\nSMTP_FROM="${org.companyName} <${org.fromEmail}>"\nSMTP_REPLY_TO=${org.hrEmail}\nAPP_URL=${org.appUrl}`;
  return (
    <div className="ats-view">
      <PageHeader title="Inställningar" meta={<><span>e-post</span><Dot /><span>mallar</span><Dot /><span>företag</span></>} />
      <div className="ats-grid-2">
        <div className="ats-panel"><div className="ats-panel-h"><h2>Företag & avsändare</h2></div>
          <label className="ats-field"><span className="ats-field-l">Företagsnamn</span><input value={org.companyName} disabled={!canEdit} onChange={(e) => setOrg({ companyName: e.target.value })} /></label>
          <div className="ats-tpl-two"><label className="ats-field"><span className="ats-field-l">HR-ansvarig (namn)</span><input value={org.hrName} disabled={!canEdit} onChange={(e) => setOrg({ hrName: e.target.value })} /></label><label className="ats-field"><span className="ats-field-l">HR-mejl (Reply-To)</span><input value={org.hrEmail} disabled={!canEdit} onChange={(e) => setOrg({ hrEmail: e.target.value })} /></label></div>
          <div className="ats-tpl-two"><label className="ats-field"><span className="ats-field-l">Avsändaradress (From)</span><input value={org.fromEmail} disabled={!canEdit} onChange={(e) => setOrg({ fromEmail: e.target.value })} /></label><label className="ats-field"><span className="ats-field-l">App-URL</span><input value={org.appUrl} disabled={!canEdit} onChange={(e) => setOrg({ appUrl: e.target.value })} /></label></div>
          <p className="ats-builder-note"><Mail size={12} /> Mejlen skickas från <b>{org.fromEmail}</b> med företagsnämnet synligt, och <b>{org.hrEmail}</b> som Reply-To så kandidatens svar går till rätt person.</p>
        </div>
        <div className="ats-panel"><div className="ats-panel-h"><h2>SMTP</h2><span className="ats-smtp-status"><Server size={13} /> Konfigureras i backend</span></div>
          <div className="ats-honestbar"><Info size={13} /> Sjalva utskicket sker i din Next.js-backend (mejl-modulen) — en webbklient kan inte öppna en SMTP-koppling. Lägg env-variablerna nedan så levererar backend mejlen som köas har. Saknas eller felar SMTP visas riktigt fel-state, aldrig fejkad "skickat".</div>
          <label className="ats-field"><span className="ats-field-l">.env (kopiera till backend)</span><div className="ats-envbox"><pre>{envBlock}</pre></div></label>
          <button className="ats-ghost" onClick={() => { copyText(envBlock); showToast({ kind: "ok", msg: "Env-block kopierat" }); }}><Copy size={14} /> Kopiera .env-block</button>
        </div>
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
            {previewCand && tpl ? <div className="ats-mailprev"><div className="ats-mailprev-h"><b>{renderTpl(tpl.subject, vars) || "(inget ämne)"}</b><span>Till: {previewCand.email} · Från: {org.companyName} &lt;{org.fromEmail}&gt; · Svar: {org.hrEmail}</span></div><div className="ats-mailprev-body">{renderTpl(tpl.body, vars)}</div></div> : <div className="ats-muted">Ingen kandidat att förhandsvisa mot.</div>}
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
.ats-root{--paper:#EDEBE5;--paper2:#EFEEE9;--surface:#fff;--ink:#16171B;--sub:#55524B;--muted:#86827A;--line:#E1DBCF;--line2:#EAE5DA;--petrol:#0C5C52;--petrol-deep:#083F38;--petrol-soft:#E3EEEB;--amber:#C98A24;--amber-soft:#F6ECD8;--brick:#A6412B;--brick-soft:#F3E2DC;--blue:#2C5F86;--blue-soft:#E4EDF6;--gold:#8A6516;--gold-soft:#F3E7C4;
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
.ats-deck{position:relative;height:540px;max-width:560px;margin:0 auto;width:100%}
.ats-card{position:absolute;inset:0;background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 8px 30px -14px rgba(0,0,0,.2);overflow:hidden}
.ats-card.is-top{cursor:grab;box-shadow:0 20px 50px -18px rgba(0,0,0,.32)}
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
.ats-apply-live{display:flex;flex-direction:column;align-items:center;gap:3px}
.ats-apply-live .ats-dial-track{stroke:rgba(255,255,255,.2)}.ats-apply-live .ats-dial-num b{color:#fff;font-size:15px}.ats-apply-live .ats-dial-num small{color:#a9d6cd}
.ats-apply-live>span{font-size:10px;color:#a9d6cd;font-family:'IBM Plex Mono'}
.ats-apply-steps{display:flex;gap:6px;padding:14px 22px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.ats-apply-step{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);background:var(--paper2);padding:5px 10px;border-radius:20px}
.ats-apply-step>span{font-weight:600}
.ats-apply-step.is-on{background:var(--petrol);color:#fff}
.ats-apply-step.is-done{background:var(--petrol-soft);color:var(--petrol-deep)}
.ats-apply-body{padding:22px}
.ats-apply-fields{display:flex;flex-direction:column;gap:16px}
.ats-apply-f{display:flex;flex-direction:column;gap:7px}
.ats-apply-f>span{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.ats-reqko{font-size:10px;background:var(--brick-soft);color:var(--brick);padding:1px 6px;border-radius:8px;font-weight:600}
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
.ats-msglog-head,.ats-msglog-row{display:grid;grid-template-columns:70px 1.4fr 2fr 1.2fr .8fr;gap:10px;align-items:center;padding:9px 10px}
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
  .ats-flagcols{grid-template-columns:1fr}
}
@media print{.ats-app,.ats-bottomnav,.ats-fab,.ats-print-toolbar{display:none!important}.ats-printwrap{position:static}.ats-pr{border:none}}
@media(prefers-reduced-motion:reduce){.ats-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`}</style>;
}
