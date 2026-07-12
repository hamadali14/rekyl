/* Rekyl — Superadmin-API (SaaS-ägarens tvär-organisationsvy).
 *
 * Behörighet: anroparens Supabase-session verifieras, och användaren måste finnas
 * i tabellen `superadmins`. Den kontrollen görs med service-nyckeln på servern —
 * den kan alltså inte förfalskas från klienten, och `superadmins` är oläsbar via RLS.
 *
 * Varje förändrande åtgärd skrivs till `audit_log` med vem, vad, mot vilket mål och när.
 * Service-nyckeln lämnar aldrig servern.
 */

import {
  SB_SERVICE, NOTIFY_SECRET, PROVIDER, enc, json, clean,
  configProblem, fromAddress, providerProblem, supabaseOk, verifyUser,
  sbAdmin, sbAdminPatch, sbAdminDelete, audit,
} from "../lib/mail.mjs";

/* Paket och deras gränser. Enterprise = i praktiken obegränsat. */
const PLANS = { start: { maxJobs: 3 }, pro: { maxJobs: 25 }, enterprise: { maxJobs: 999 } };
const ROLES = ["admin", "recruiter", "manager", "viewer"];

async function requireSuperadmin(req) {
  if (!SB_SERVICE) return { err: json(503, { error: "SUPABASE_SERVICE_ROLE_KEY saknas på servern." }) };
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { err: json(401, { error: "Saknar sessionstoken." }) };
  const user = await verifyUser(token);
  if (!user) return { err: json(401, { error: "Ogiltig eller utgången session." }) };
  const rows = await sbAdmin("superadmins?user_id=eq." + enc(user.id) + "&select=user_id");
  if (!Array.isArray(rows) || !rows.length) return { err: json(403, { error: "Behörighet saknas." }) };
  return { user };
}

/* Läser allt underlag en gång och härleder verkliga siffror ur organisationernas sparade state. */
async function loadTenants() {
  const [orgs, members, states] = await Promise.all([
    sbAdmin("orgs?select=id,name,owner_id,plan,suspended,max_jobs,created_at&order=created_at.desc"),
    sbAdmin("members?select=user_id,org_id,role,email"),
    sbAdmin("org_state?select=org_id,data,updated_at"),
  ]);
  if (!orgs || !members || !states) return null;

  const stateOf = {};
  states.forEach((s) => { stateOf[s.org_id] = s; });

  const tenants = orgs.map((o) => {
    const st = stateOf[o.id];
    const d = (st && st.data) || {};
    const cands = Array.isArray(d.candidates) ? d.candidates : [];
    const jobs = Array.isArray(d.jobs) ? d.jobs : [];
    const msgs = Array.isArray(d.messages) ? d.messages : [];
    const cvFiles = cands.reduce((n, c) => n + Object.values((c && c.answers) || {}).filter((v) => v && typeof v === "object" && v.url).length, 0);
    const bytes = st ? JSON.stringify(d).length : 0;
    return {
      id: o.id, name: o.name || "(namnlös)", plan: o.plan || "start", suspended: !!o.suspended,
      maxJobs: o.max_jobs == null ? 999 : o.max_jobs, createdAt: o.created_at,
      members: members.filter((m) => m.org_id === o.id).length,
      jobs: jobs.length, openJobs: jobs.filter((j) => (j.status || "open") === "open").length,
      candidates: cands.length,
      hired: cands.filter((c) => c.status === "hired").length,
      interviews: cands.filter((c) => c && c.interview && c.interview.at && !c.interview.cancelled).length,
      mailSent: msgs.filter((m) => m.status === "sent").length,
      mailFailed: msgs.filter((m) => m.status === "failed").length,
      cvFiles, bytes,
      lastActivity: st ? st.updated_at : null,
      company: (d.org && d.org.companyName) || null,
      hrEmail: (d.org && d.org.hrEmail) || null,
    };
  });
  return { tenants, members, states };
}

function totals(tenants) {
  const sum = (k) => tenants.reduce((n, t) => n + (t[k] || 0), 0);
  return {
    orgs: tenants.length,
    suspended: tenants.filter((t) => t.suspended).length,
    members: sum("members"), jobs: sum("jobs"), openJobs: sum("openJobs"),
    candidates: sum("candidates"), hired: sum("hired"), interviews: sum("interviews"),
    mailSent: sum("mailSent"), mailFailed: sum("mailFailed"),
    cvFiles: sum("cvFiles"), bytes: sum("bytes"),
  };
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Metod stöds inte" });
  const gate = await requireSuperadmin(req);
  if (gate.err) return gate.err;
  const me = gate.user;

  let p;
  try { p = await req.json(); } catch (e) { return json(400, { error: "Felaktig begäran." }); }
  const action = String(p.action || "");

  if (action === "whoami") return json(200, { superadmin: true, email: me.email });

  /* ---- Läsning ---- */
  if (action === "overview") {
    const data = await loadTenants();
    if (!data) return json(503, { error: "Kunde inte läsa data (kontrollera service-nyckeln)." });
    const failures = [];
    data.states.forEach((s) => {
      const msgs = Array.isArray(s.data && s.data.messages) ? s.data.messages : [];
      const t = data.tenants.find((x) => x.id === s.org_id);
      msgs.filter((m) => m.status === "failed").slice(0, 20).forEach((m) => failures.push({ org: (t && t.name) || s.org_id, to: m.to, subject: m.subject, error: m.error || "okänt", at: m.at }));
    });
    failures.sort((a, b) => (b.at || 0) - (a.at || 0));
    return json(200, { tenants: data.tenants, totals: totals(data.tenants), failures: failures.slice(0, 40) });
  }

  if (action === "users") {
    const data = await loadTenants();
    if (!data) return json(503, { error: "Kunde inte läsa data." });
    const nameOf = {};
    data.tenants.forEach((t) => { nameOf[t.id] = t.name; });
    return json(200, { users: data.members.map((m) => ({ ...m, orgName: nameOf[m.org_id] || "—" })) });
  }

  if (action === "system") {
    const cfg = configProblem();
    const prov = cfg ? null : await providerProblem();
    return json(200, {
      mail: { ok: !cfg && !prov, provider: PROVIDER || null, from: cfg ? null : fromAddress(), reason: cfg || prov || null },
      supabase: await supabaseOk(),
      notify: !!NOTIFY_SECRET,
      reminders: !!SB_SERVICE,
      plans: PLANS,
    });
  }

  if (action === "audit") {
    const rows = await sbAdmin("audit_log?select=id,actor_email,action,target,meta,at&order=at.desc&limit=200");
    return json(200, { audit: Array.isArray(rows) ? rows : [] });
  }

  /* ---- Förändrande åtgärder (auditloggas) ---- */
  if (action === "set_plan") {
    const orgId = clean(p.org_id, 60);
    const plan = String(p.plan || "");
    if (!PLANS[plan]) return json(400, { error: "Okänt paket." });
    const ok = await sbAdminPatch("orgs", "id=eq." + enc(orgId), { plan, max_jobs: PLANS[plan].maxJobs });
    if (!ok) return json(502, { error: "Kunde inte spara paketet." });
    await audit(me, "set_plan", orgId, { plan, max_jobs: PLANS[plan].maxJobs });
    return json(200, { ok: true });
  }

  if (action === "set_suspended") {
    const orgId = clean(p.org_id, 60);
    const suspended = !!p.suspended;
    const ok = await sbAdminPatch("orgs", "id=eq." + enc(orgId), { suspended });
    if (!ok) return json(502, { error: "Kunde inte ändra spärren." });
    await audit(me, suspended ? "suspend_org" : "unsuspend_org", orgId, null);
    return json(200, { ok: true });
  }

  if (action === "set_member_role") {
    const userId = clean(p.user_id, 60);
    const role = String(p.role || "");
    if (!ROLES.includes(role)) return json(400, { error: "Okänd roll." });
    const ok = await sbAdminPatch("members", "user_id=eq." + enc(userId), { role });
    if (!ok) return json(502, { error: "Kunde inte ändra rollen." });
    await audit(me, "set_member_role", userId, { role });
    return json(200, { ok: true });
  }

  if (action === "remove_member") {
    const userId = clean(p.user_id, 60);
    if (userId === me.id) return json(400, { error: "Du kan inte ta bort dig själv." });
    const ok = await sbAdminDelete("members", "user_id=eq." + enc(userId));
    if (!ok) return json(502, { error: "Kunde inte ta bort medlemmen." });
    await audit(me, "remove_member", userId, null);
    return json(200, { ok: true });
  }

  if (action === "delete_org") {
    const orgId = clean(p.org_id, 60);
    const confirmName = String(p.confirm || "");
    const orgs = await sbAdmin("orgs?id=eq." + enc(orgId) + "&select=id,name");
    const org = orgs && orgs[0];
    if (!org) return json(404, { error: "Organisationen finns inte." });
    if (confirmName !== (org.name || "")) return json(400, { error: "Bekräftelsen matchar inte organisationens namn." });
    /* Ordningen spelar roll: beroende data först. */
    await sbAdminDelete("applications", "org_id=eq." + enc(orgId));
    await sbAdminDelete("jobs", "org_id=eq." + enc(orgId));
    await sbAdminDelete("reminders_sent", "org_id=eq." + enc(orgId));
    await sbAdminDelete("invites", "org_id=eq." + enc(orgId));
    await sbAdminDelete("members", "org_id=eq." + enc(orgId));
    await sbAdminDelete("org_state", "org_id=eq." + enc(orgId));
    const ok = await sbAdminDelete("orgs", "id=eq." + enc(orgId));
    if (!ok) return json(502, { error: "Kunde inte radera organisationen." });
    await audit(me, "delete_org", orgId, { name: org.name });
    return json(200, { ok: true });
  }

  return json(400, { error: "Okänd åtgärd." });
};
