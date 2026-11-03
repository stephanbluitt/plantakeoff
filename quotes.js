// TerraTakeoff 1.20 — supplier quote comparison inside the app: upload quotes, check what the AI read, compare suppliers
// side by side (and against this project's measurements), value engineering, pricing, the four reports, history, team.
// The server (worker/quotes.js) checks the plan, the allowances and who may do what; this screen only shows it.
// Every number is worked out by quote-engine.js — never by the AI.
import * as E from "./quote-engine.js?v=1.21.0";

const P = window.TT_PLANS;
// Who's signed in and where the server is. In TerraTakeoff: the app's own account. PLAN TAKEOFF sets window.TT_QUOTES_HOST
// (pt-quotes-host.js) with its own connection to a TerraTakeoff account, and has no teams' invitations, billing or shared projects.
const HOST = window.TT_QUOTES_HOST || {
  name: "terratakeoff",
  signedIn: () => !offlineMode && cloudReady(),
  signIn: () => authShow("signin"),
  api: () => sb && sb.api,
  projectId: () => cloudId,
  me: () => authUser && authUser.id,
  isAdmin: () => !!(acctProfile && acctProfile.is_admin),
  plans: () => (isPaid() && !(acctProfile && acctProfile.org_role && acctProfile.org_role !== "owner") ? openPortal() : payShow(false)),
  refreshAccount: async () => { await loadProfile(); updateAccountUI(); },
};
const API = () => { const a = HOST.api(); return (a && a.base) || String((window.TT_CONFIG || {}).supabaseUrl || "").replace(/\/+$/, ""); };
const fmtDayQ = d => { try { return typeof fmtDay === "function" ? fmtDay(d) : new Date(d).toLocaleDateString(lang === "es" ? "es-US" : "en-US", {month: "long", day: "numeric", year: "numeric"}); } catch (e) { return String(d); } };
const es = () => lang === "es";
const h = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const $q = s => document.querySelector("#qPanel " + s);
const money = c => E.fmtMoney(c);
const num2 = v => v == null || v === "" ? "" : String(Math.round(+v * 100) / 100);
const pctIn = f => f == null ? "" : String(Math.round(f * 10000) / 100);   // 0.125 → "12.5"
const pctOut = s => s === "" || s == null || !isFinite(+s) ? null : +s / 100;
const S = {open: false, tab: "quotes", usage: null, org: null, list: [], cmp: null, filter: "project", saveT: null, saving: null, dirty: false,
  profiles: null, revs: null, busy: 0, report: {showSuppliers: false, showUnit: true, showCosts: false, fold: true, intro: "", terms: "", title: ""}, openQuote: null};
const feat = k => !!(S.usage && S.usage.features && S.usage.features[k]);
const TABS = [["quotes", "Quotes"], ["compare", "Compare"], ["ve", "Value engineering", "valueEngineering"], ["pricing", "Pricing & profit"],
  ["reports", "Reports"], ["history", "History", "revisions"], ["team", "Team & usage"]];

// ---------------- talking to the server ----------------
async function api(path, opt) {
  opt = opt || {};
  const A = HOST.api();
  if (!A) throw {status: 0, message: "Sign in to compare supplier quotes"};
  await (A.ready && A.ready());
  const headers = {Authorization: "Bearer " + (A.token() || "")};
  let body = opt.body;
  if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
  let r;
  try { r = await fetch(API() + path, {method: opt.method || (body ? "POST" : "GET"), headers, body}); }
  catch (e) { throw {status: 0, message: es() ? "Sin conexión — inténtalo de nuevo" : "No connection — try again"}; }
  if (opt.raw && r.ok) return r;
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && HOST.lost) HOST.lost();   // PLAN TAKEOFF: the connection was ended or expired
  if (!r.ok || j.error) { const e = j.error || {}; throw {status: r.status, code: e.code || "", message: e.message || "HTTP " + r.status}; }
  return j.data;
}
function busy(on, txt) {
  S.busy += on ? 1 : -1;
  const b = $q(".qBusy"); if (!b) return;
  if (txt) b.textContent = t(txt);
  b.classList.toggle("on", S.busy > 0);
}
function fail(e) {
  if (e && String(e.code || "").startsWith("upgrade:") || e && /_exhausted|storage_full|seats_full/.test(e.code || "")) { upsellToast(e); return; }
  toast(t((e && e.message) || "Something went wrong — try again"), 6000);
}
function upsellToast(e) {
  toast(t(e.message) + (es() ? " — mira los planes en Equipo y uso." : " — see plans under Team & usage."), 7000);
}

// ---------------- the panel ----------------
function build() {
  if ($q(".qHead")) return;
  const el = document.createElement("div");
  el.id = "qPanel"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Quote comparison");
  el.innerHTML = `<div class="qHead">
      <h2>📑 <span>Quote comparison</span></h2>
      <select id="qCmpSel" aria-label="Comparison" data-nt></select>
      <button class="btn" data-act="new">＋ New comparison</button>
      <span class="sp"></span>
      <div class="qMeter" id="qMeter"></div>
      <button class="btn" data-act="close" title="Close (Esc)">✕</button>
    </div>
    <div class="qTabs" id="qTabs"></div>
    <div class="qBody"><div class="qWrap" id="qMain"></div></div>
    <div class="qBusy"></div>
    <input type="file" id="qFile" accept=".pdf,.xlsx,.csv,.tsv,.txt,application/pdf" multiple hidden>
    <input type="file" id="qLogo" accept="image/png,image/jpeg" hidden>`;
  document.body.appendChild(el);
  el.addEventListener("click", onClick);
  el.addEventListener("change", onChange);
  el.addEventListener("input", onInput);
  el.addEventListener("dragover", e => { const d = e.target.closest(".qDrop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
  el.addEventListener("dragleave", e => { const d = e.target.closest(".qDrop"); if (d) d.classList.remove("over"); });
  el.addEventListener("drop", e => { const d = e.target.closest(".qDrop"); if (!d) return; e.preventDefault(); d.classList.remove("over"); addFiles([...e.dataTransfer.files]); });
  $q("#qFile").addEventListener("change", e => { addFiles([...e.target.files]); e.target.value = ""; });
  $q("#qLogo").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) logoPick(f); });
  $q("#qCmpSel").addEventListener("change", e => { if (e.target.value) openCmp(e.target.value); });
  document.addEventListener("keydown", e => { if (S.open && e.key === "Escape" && !e.target.closest("input,textarea,select")) close(); });
}
export async function open(tab) {
  if (!HOST.signedIn()) { HOST.signIn(); return; }
  build();
  S.open = true; S.tab = tab || S.tab || "quotes";
  document.getElementById("qPanel").classList.add("open");
  renderTabs(); render();
  try { await Promise.all([loadUsage(), loadList()]); } catch (e) { fail(e); }
  if (!S.cmp && S.list.length) {
    const pid = HOST.projectId(), mine = S.list.find(c => c.project_id && c.project_id === pid) || (S.filter === "all" ? S.list[0] : null);
    if (mine) await openCmp(mine.id);
  }
  renderHead(); render();
}
async function close() {
  await flush();
  S.open = false;
  document.getElementById("qPanel").classList.remove("open");
}
async function loadUsage() { S.usage = await api("/quotes/usage"); renderHead(); renderTabs(); }
async function loadList() { S.list = await api("/quotes/list"); renderHead(); }
async function loadOrg() { S.org = await api("/org"); S.usage = S.org.usage; }

function renderHead() {
  const sel = $q("#qCmpSel"); if (!sel) return;
  const pid = HOST.projectId(), here = S.list.filter(c => pid && c.project_id === pid), other = S.list.filter(c => !(pid && c.project_id === pid));
  const opt = c => `<option value="${h(c.id)}"${S.cmp && S.cmp.id === c.id ? " selected" : ""}>${h(c.name)}</option>`;
  sel.innerHTML = `<option value="">${h(t(S.list.length ? "Open a comparison…" : "No comparisons yet"))}</option>` +
    (here.length ? `<optgroup label="${h(t("This project"))}">${here.map(opt).join("")}</optgroup>` : "") +
    (other.length ? `<optgroup label="${h(t(here.length ? "Other projects" : "All comparisons"))}">${other.map(opt).join("")}</optgroup>` : "");
  const u = S.usage, m = $q("#qMeter"); if (!m) return;
  if (!u) { m.innerHTML = ""; return; }
  const chip = (lbl, a, b) => { const left = b - a; return `<span class="qChip${left <= 0 ? " out" : left <= Math.max(1, b * 0.15) ? " low" : ""}" title="${h(t("Used this billing period"))}">${h(t(lbl))} <b data-nt>${a} / ${b}</b></span>`; };
  m.innerHTML = `<span class="qChip"><b data-nt>${h(u.plan)}</b></span>` + chip("Comparisons", u.comparisons.used, u.comparisons.max) + chip("Credits", u.credits.used, u.credits.max) +
    `<span class="qChip" title="${h(t("Quote document storage"))}">${h(t("Storage"))} <b data-nt>${fmtSizeQ(u.storage.used)} / ${fmtGB(u.storage.max)}</b></span>`;
}
const fmtSizeQ = b => (b ? fmtSize(b) : "0 MB");
const fmtGB = b => (b >= 1024 ** 3 ? Math.round(b / 1024 ** 3 * 10) / 10 + " GB" : Math.round(b / 1024 ** 2) + " MB");
function renderTabs() {
  const el = $q("#qTabs"); if (!el) return;
  el.innerHTML = TABS.map(([k, lbl, f]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}">${h(t(lbl))}${f && S.usage && !feat(f) ? '<span class="lock">PRO</span>' : ""}</button>`).join("");
}
function render() {
  const el = $q("#qMain"); if (!el) return;
  const needCmp = ["quotes", "compare", "ve", "pricing", "reports", "history"].includes(S.tab);
  if (needCmp && !S.cmp) { el.innerHTML = emptyHtml(); return; }
  el.innerHTML = ({quotes: quotesHtml, compare: compareHtml, ve: veHtml, pricing: pricingHtml, reports: reportsHtml, history: historyHtml, team: teamHtml})[S.tab]();
  if (S.tab === "history" && S.cmp && feat("revisions") && !S.revs) loadRevs();
  if (S.tab === "team" && !S.org) loadOrg().then(render, fail);
  if (S.tab === "pricing" && feat("pricingProfiles") && !S.profiles) loadProfiles();
}
function emptyHtml() {
  const recent = S.list.slice(0, 8);
  return `<div class="qEmpty"><h3>${h(t("Compare supplier quotes side by side"))}</h3>
    <p class="qd">${h(t("Upload quotes as PDF, Excel or CSV. The AI reads the lines, lines up the same items across suppliers, and flags missing items, different quantities, specs and exclusions. You check and correct everything; the math is done by the app."))}</p>
    <button class="btn primary" data-act="new">＋ ${h(t("New comparison"))}</button>
    ${recent.length ? `<div class="qCard" style="max-width:560px; margin:24px auto 0; text-align:left"><h3>${h(t("Recent comparisons"))}</h3>${recent.map(c =>
      `<div class="qRow" style="padding:6px 0; border-top:1px solid var(--hair)"><span style="flex:1" data-nt><b>${h(c.name)}</b><br><span class="qMeta">${c.doc_count} ${h(t("quotes"))} · ${h(new Date(c.updated_at).toLocaleDateString(es() ? "es-US" : undefined))}${c.updated_email ? " · " + h(c.updated_email) : ""}</span></span><button class="btn qBtnS" data-act="opencmp" data-id="${h(c.id)}">${h(t("Open"))}</button></div>`).join("")}</div>` : ""}</div>`;
}
function upsell(f, what) {
  const tier = P.order.find(k => P.tiers[k].features[f]);
  const T = P.tiers[tier];
  return `<div class="qUp"><div class="t"><b>${h(t(what))}</b> ${h(es() ? "viene con el plan" : "comes with the")} <b>${h(T.name)}</b> ${h(es() ? "" : "plan")} (${h("$" + T.price + (es() ? "/mes" : "/month"))}).</div>
    <button class="btn primary qBtnS" data-act="plans">${h(t("See plans"))}</button></div>`;
}

// ---------------- comparisons ----------------
async function newCmp() {
  const name = (projectName || defaultProjectName() || (es() ? "Proyecto" : "Project")) + (es() ? " — cotizaciones" : " — quotes");   // renamed in place on the Quotes tab
  busy(true, "Creating…");
  try {
    await flush();
    const r = await api("/quotes/cmp", {body: {name: name.trim() || "Quote comparison", projectId: HOST.projectId() || null}});
    S.cmp = {id: r.id, rev: r.rev, data: fillDefaults(r.data)}; S.revs = null;
    await loadList(); S.tab = "quotes"; renderTabs(); render();
  } catch (e) { fail(e); } finally { busy(false); }
}
async function openCmp(id) {
  await flush();
  busy(true, "Opening…");
  try {
    const r = await api("/quotes/cmp/" + id);
    S.cmp = {id: r.id, rev: r.rev, data: fillDefaults(r.data)}; S.revs = null;
    renderHead(); render();
  } catch (e) { fail(e); } finally { busy(false); }
}
function fillDefaults(d) {
  d = d || {}; d.quotes = d.quotes || []; d.groups = d.groups || []; d.resolved = d.resolved || {}; d.ve = d.ve || [];
  d.pricing = Object.assign({method: "markup", markup: 0.15, margin: 0.2, overhead: 0, byKind: {}}, d.pricing || {});
  d.report = Object.assign({}, d.report || {});
  return d;
}
const MAJOR = /^(Added|Removed a quote|Merged lines|Split a line|Deleted a line)/;   // these always keep a version in the history
function touch(note) {
  if (!S.cmp) return;
  S.dirty = true; S.note = note || S.note; if (note && MAJOR.test(note)) S.major = true;
  clearTimeout(S.saveT); S.saveT = setTimeout(save, 1500);
}
async function save() {
  clearTimeout(S.saveT); S.saveT = null;
  if (!S.cmp || !S.dirty) return;
  if (S.saving) { await S.saving; return save(); }
  S.dirty = false;
  const note = S.note, major = !!S.major; S.note = null; S.major = false;
  S.saving = (async () => {
    try { const r = await api("/quotes/cmp/" + S.cmp.id, {method: "PUT", body: {data: S.cmp.data, base: S.cmp.rev, note, major}}); S.cmp.rev = r.rev; }
    catch (e) {
      if (e.code === "conflict") {
        if (confirm(t("A teammate saved this comparison since you opened it. Load their version? (Cancel keeps yours on screen, unsaved.)"))) { await openCmp(S.cmp.id); return; }
        S.dirty = true; return;
      }
      S.dirty = true; fail(e);
    }
  })();
  await S.saving; S.saving = null;
}
async function flush() { if (S.dirty) await save(); else if (S.saving) await S.saving; }
async function analyze() {
  const d = S.cmp.data;
  if (!d.quotes.length) { toast("Add at least one quote first"); return; }
  busy(true, d.quotes.length > 1 ? "Lining up the same items across suppliers…" : "Reading the quote…");
  try {
    await flush();
    const r = await api("/quotes/cmp/" + S.cmp.id + "/analyze", {body: {}});
    S.cmp.rev = r.rev; S.cmp.data = fillDefaults(r.data);
    autoTakeoff();
    await loadUsage();
    toast(r.counted ? (es() ? "Comparación lista — se usó 1 comparación de tu plan" : "Comparison ready — 1 comparison used from your plan")
      : (es() ? "Comparación actualizada — sin costo (mismas cotizaciones)" : "Comparison updated — no charge (same quotes)") + (r.aiMatched === false ? (es() ? " · la IA no respondió: líneas emparejadas solo por texto" : " · the AI didn't answer: lines matched by wording only") : ""), 5000);
    S.tab = "compare"; renderTabs(); render();
  } catch (e) { fail(e); } finally { busy(false); }
}
function analyzedSet() { return S.cmp && (S.cmp.data.analyzed || []).length; }

// ---------------- adding quote files ----------------
// the text of each page; pages with (almost) no text — a scan or a photo — also come back as JPEG pictures for the AI to read
async function pdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({data, isEvalSupported: false}).promise;
  const pages = [], scans = [];
  for (let i = 1; i <= Math.min(doc.numPages, 61); i++) {
    const pg = await doc.getPage(i), tc = await pg.getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str) continue;
      const y = it.transform[5], x = it.transform[4];
      let r = rows.find(r => Math.abs(r.y - y) < 2.5);
      if (!r) rows.push(r = {y, items: []});
      r.items.push({x, s: it.str, w: it.width || 0});
    }
    rows.sort((a, b) => b.y - a.y);
    const txt = rows.map(r => { r.items.sort((a, b) => a.x - b.x); let s = "", end = null; for (const it of r.items) { if (end != null) s += it.x - end > 6 ? "   " : (it.x - end > 0.5 ? " " : ""); s += it.s; end = it.x + it.w; } return s; }).join("\n");
    pages.push(txt);
    if (txt.replace(/\s+/g, "").length < 20 && scans.length < P.ai.maxScanPages) {
      const v0 = pg.getViewport({scale: 1}), vp = pg.getViewport({scale: Math.min(2.2, 1700 / Math.max(v0.width, v0.height))});
      const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height);
      await pg.render({canvasContext: cx, viewport: vp}).promise;
      scans.push({page: i, blob: await new Promise(r => c.toBlob(r, "image/jpeg", 0.8))});
    }
    pg.cleanup();
  }
  doc.destroy();
  return {pages, scans};
}
async function addFiles(files) {
  if (!S.cmp) { await newCmp(); if (!S.cmp) return; }
  const max = S.usage ? S.usage.quotesPerComparison : 5;
  for (const f of files) {
    if (S.cmp.data.quotes.length >= max) { toast(es() ? "Tu plan compara hasta " + max + " cotizaciones a la vez" : "Your plan compares up to " + max + " quotes at a time", 6000); break; }
    if (!/\.(pdf|xlsx|csv|tsv|txt)$/i.test(f.name)) { toast((es() ? "Usa PDF, Excel .xlsx o .csv: " : "Use PDF, Excel .xlsx or .csv: ") + f.name, 5000); continue; }
    if (/\.xls$/i.test(f.name)) { toast("Old .xls files can't be read — save it as .xlsx or .csv and try again", 6000); continue; }
    if (f.size > P.maxQuoteFileMB * 1048576) { toast((es() ? "Máximo " : "Up to ") + P.maxQuoteFileMB + " MB: " + f.name, 5000); continue; }
    busy(true, (es() ? "Leyendo " : "Reading ") + f.name + "…");
    try {
      const fd = new FormData();
      fd.append("file", f, f.name);
      if (/\.pdf$/i.test(f.name)) {
        const r0 = await pdfText(f);
        fd.append("pages", JSON.stringify(r0.pages));
        if (r0.scans.length) {
          const bz = $q(".qBusy"); if (bz) bz.textContent = (es() ? "Leyendo un escaneo: " : "Reading a scan: ") + f.name + "…";
          fd.append("scanPages", JSON.stringify(r0.scans.map(s => s.page)));
          r0.scans.forEach(s => fd.append("scan", s.blob, "page-" + s.page + ".jpg"));
        }
      }
      const r = await api("/quotes/doc", {body: fd});
      const ex = r.extracted || {};
      if (S.cmp.data.quotes.some(q => q.docId === r.doc.id)) { toast(es() ? "Esa cotización ya está en esta comparación" : "That quote is already in this comparison"); continue; }
      S.cmp.data.quotes.push({docId: r.doc.id, fileName: ex.fileName || f.name, supplier: ex.supplier || f.name, ref: ex.ref || "", date: ex.date || "", validUntil: ex.validUntil || "",
        items: (ex.items || []).map(it => Object.assign({unverified: []}, it)), exclusions: ex.exclusions || [], allowances: ex.allowances || [], stated: ex.stated || {},
        unverified: ex.unverified || [], suggested: ex.suggested || null, method: ex.method || r.doc.method, scanned: !!ex.scanned, credits: r.doc.credits, pages: r.doc.pages, rows: r.doc.rows});
      S.openQuote = r.doc.id;
      touch("Added " + (ex.supplier || f.name));
      toast(r.reused ? (es() ? "Ya leída antes — sin créditos" : "Read before — no credits used")
        : (es() ? "Leída: " : "Read: ") + (ex.items || []).length + (es() ? " líneas · " : " lines · ") + r.doc.credits + (es() ? " crédito(s)" : " credit" + (r.doc.credits === 1 ? "" : "s")) + (es() ? " — revisa lo que leyó la IA" : " — check what was read"), 5000);
    } catch (e) { fail(e); } finally { busy(false); }
    render();
  }
  await flush(); loadUsage().catch(() => {});
}

// ---------------- Quotes tab: what each document says, editable ----------------
const KINDS = ["material", "labor", "equipment", "freight", "tax", "discount", "allowance", "other"];
function quotesHtml() {
  const d = S.cmp.data, max = S.usage ? S.usage.quotesPerComparison : 5;
  const canAdd = d.quotes.length < max;
  let out = `<div class="qCard"><div class="qRow"><input data-cmpname value="${h(d.name || "")}" aria-label="${h(t("Comparison name"))}" style="font-weight:700; font-size:14px; min-width:240px; flex:1" data-nt><span class="qMuted" data-nt>${d.quotes.length} / ${max} ${h(t("quotes"))}</span>
      <button class="btn" data-act="delcmp">${h(t("Delete"))}</button>
      <button class="btn primary" data-act="analyze" ${d.quotes.length ? "" : "disabled"}>${h(t(analyzedSet() ? "Analyze again" : "Analyze quotes"))} →</button></div>
      <p class="qd" style="margin-top:8px">${h(t("Analyzing uses 1 AI comparison the first time a set of quotes is compared. Re-analyzing the same quotes, editing, reopening and downloading reports are free."))}</p></div>`;
  if (canAdd) out += `<div class="qDrop" data-act="pick"><b>${h(t("Drop supplier quotes here"))}</b> ${h(t("or click to choose"))}<br><span class="qMeta">${h(t("PDF, Excel (.xlsx) or CSV · 1 credit per PDF page · 1 credit per 50 spreadsheet rows · a file read before is free"))}</span></div><br>`;
  else out += `<div class="qUp"><div class="t">${h(es() ? "Llegaste al máximo de cotizaciones por comparación de tu plan (" + max + ")." : "This comparison has your plan's maximum of " + max + " quotes.")}</div>${max < 10 ? `<button class="btn qBtnS" data-act="plans">${h(t("See plans"))}</button>` : ""}</div>`;
  d.quotes.forEach((q, qi) => {
    const s = E.quoteSums(q), unv = q.items.filter(i => (i.unverified || []).length).length + ((q.unverified || []).length ? 1 : 0);
    const opn = S.openQuote === q.docId;
    out += `<div class="qQuote"><div class="qqh">
      <input class="sup" data-q="${qi}" data-qf="supplier" value="${h(q.supplier)}" aria-label="${h(t("Supplier"))}" data-nt>
      <span class="qBadge ${q.method === "table" ? "ok" : q.method === "ocr" ? "warn" : "ai"}" title="${h(q.method === "ocr" ? t("Read from a scanned image — check every line and number against the original") : "")}">${h(q.method === "table" ? t("Read from columns") : q.method === "ocr" ? t("AI · scan") : "AI")}</span>
      ${unv ? `<span class="qBadge warn">${unv} ${h(t("to check"))}</span>` : ""}
      ${s.totalMismatch ? `<span class="qBadge bad">${h(t("Total doesn't match lines"))}</span>` : ""}
      <span class="qMeta" data-nt>${h(q.fileName || "")} · ${q.items.length} ${h(t("lines"))} · ${h(t("total"))} ${money(s.total)}</span>
      <span style="flex:1"></span>
      <button class="btn qBtnS" data-act="toggleq" data-q="${qi}">${h(t(opn ? "Hide lines" : "Review lines"))}</button>
      <button class="btn qBtnS" data-act="docfile" data-q="${qi}" title="${h(t("Download the original file"))}">⬇︎</button>
      <button class="btn qBtnS" data-act="rmq" data-q="${qi}" title="${h(t("Remove from this comparison"))}">✕</button></div>`;
    if (opn) out += quoteEditHtml(q, qi, s);
    out += `</div>`;
  });
  return out;
}
function quoteEditHtml(q, qi, s) {
  const unvStyle = (it, f) => (it.unverified || []).includes(f) ? " unv" : "";
  const sug = (it, f, key) => it.suggested && it.suggested[key] != null && (it.unverified || []).includes(f)
    ? `<button class="btn qBtnS" data-act="usesug" data-q="${qi}" data-i="${h(it.id)}" data-k="${key}" data-f="${f}" title="${h(t("The AI read this number but it isn't written in the document — check before using it"))}">${h(t("AI read"))} ${h(num2(it.suggested[key]))}?</button>` : "";
  let o = `<div style="padding:0 12px 12px">
    <div class="qRow" style="margin-bottom:8px">
      <label class="qMeta">${h(t("Quote #"))} <input data-q="${qi}" data-qf="ref" value="${h(q.ref || "")}" style="width:120px" data-nt></label>
      <label class="qMeta">${h(t("Date"))} <input data-q="${qi}" data-qf="date" value="${h(q.date || "")}" style="width:110px" data-nt></label>
      <label class="qMeta">${h(t("Valid until"))} <input data-q="${qi}" data-qf="validUntil" value="${h(q.validUntil || "")}" style="width:110px" data-nt></label>
    </div>
    <p class="qd">${h(t("Orange fields: the AI gave a number that isn't written in the document, so it was left empty. Enter it from the quote, or leave it empty — nothing is ever filled in for you."))}</p>
    <div class="qScroll"><table class="qTbl"><thead><tr><th>${h(t("Description"))}</th><th class="n">${h(t("Qty"))}</th><th>${h(t("Unit"))}</th><th class="n">${h(t("Unit price"))}</th><th class="n">${h(t("Total"))}</th><th>${h(t("Kind"))}</th><th>${h(t("Spec / size"))}</th><th title="${h(t("Optional: not in the base price"))}">${h(t("Opt."))}</th><th title="${h(t("Alternative product"))}">${h(t("Alt."))}</th><th></th></tr></thead><tbody>`;
  for (const it of q.items) {
    const lp = E.linePrice(it);
    o += `<tr><td style="min-width:220px"><input data-q="${qi}" data-i="${h(it.id)}" data-f="desc" value="${h(it.desc)}" data-nt></td>
      <td style="width:90px"><input class="n${unvStyle(it, "quantity")}" data-q="${qi}" data-i="${h(it.id)}" data-f="qty" value="${h(num2(it.qty))}" inputmode="decimal">${sug(it, "quantity", "quantity")}</td>
      <td style="width:70px"><input data-q="${qi}" data-i="${h(it.id)}" data-f="unit" value="${h(it.unit || "")}" data-nt></td>
      <td style="width:100px"><input class="n${unvStyle(it, "unit price")}" data-q="${qi}" data-i="${h(it.id)}" data-f="unitPrice" value="${h(num2(it.unitPrice))}" inputmode="decimal">${sug(it, "unit price", "unit price")}</td>
      <td style="width:110px"><input class="n${unvStyle(it, "total")}" data-q="${qi}" data-i="${h(it.id)}" data-f="total" value="${h(num2(it.total))}" inputmode="decimal" placeholder="${lp.computed ? h(num2(lp.c / 100)) : ""}">${sug(it, "total", "total")}</td>
      <td style="width:110px"><select data-q="${qi}" data-i="${h(it.id)}" data-f="kind">${KINDS.map(k => `<option value="${k}"${it.kind === k ? " selected" : ""}>${h(t(k))}</option>`).join("")}</select></td>
      <td style="min-width:120px"><input data-q="${qi}" data-i="${h(it.id)}" data-f="spec" value="${h(it.spec || "")}" data-nt></td>
      <td><input type="checkbox" data-q="${qi}" data-i="${h(it.id)}" data-f="optional"${it.optional ? " checked" : ""}></td>
      <td><input type="checkbox" data-q="${qi}" data-i="${h(it.id)}" data-f="alternate"${it.alternate ? " checked" : ""}></td>
      <td><button class="btn qBtnS" data-act="delline" data-q="${qi}" data-i="${h(it.id)}" title="${h(t("Delete line"))}">✕</button></td></tr>`;
  }
  const st = q.stated || {};
  const stIn = k => `<input class="n${(q.unverified || []).includes(k) ? " unv" : ""}" data-q="${qi}" data-st="${k}" value="${h(num2(st[k]))}" style="width:110px" inputmode="decimal">`;
  o += `</tbody></table></div>
    <div class="qRow" style="margin:8px 0"><button class="btn qBtnS" data-act="addline" data-q="${qi}">＋ ${h(t("Add a line"))}</button></div>
    <div class="qRow" style="gap:14px; margin:6px 0 10px">
      <label class="qMeta">${h(t("Stated subtotal"))} ${stIn("subtotal")}</label><label class="qMeta">${h(t("Freight"))} ${stIn("freight")}</label>
      <label class="qMeta">${h(t("Tax"))} ${stIn("tax")}</label><label class="qMeta">${h(t("Discount"))} ${stIn("discount")}</label><label class="qMeta">${h(t("Stated total"))} ${stIn("total")}</label>
      <span class="qMeta" data-nt>${h(t("Lines add up to"))} <b>${money(s.computedTotal)}</b>${s.optional ? " · " + h(t("options")) + " " + money(s.optional) : ""}</span></div>
    <div class="qGrid"><label class="qMeta">${h(t("Exclusions — one per line"))}<textarea data-q="${qi}" data-qf="exclusions" rows="4" style="width:100%" data-nt>${h((q.exclusions || []).join("\n"))}</textarea></label>
      <label class="qMeta">${h(t("Allowances — description: amount, one per line"))}<textarea data-q="${qi}" data-qf="allowances" rows="4" style="width:100%" data-nt>${h((q.allowances || []).map(a => a.desc + (a.amount != null ? ": " + a.amount : "")).join("\n"))}</textarea></label></div></div>`;
  return o;
}

// ---------------- Compare tab ----------------
function analysis() { return E.analyze(S.cmp.data, {advanced: feat("advancedScope"), lang: es() ? "es" : "en"}); }
function supName(d) { const q = S.cmp.data.quotes.find(x => x.docId === d); return q ? q.supplier || q.fileName : "?"; }
function compareHtml() {
  const d = S.cmp.data;
  if (!d.quotes.length) return `<div class="qEmpty"><h3>${h(t("No quotes yet"))}</h3><button class="btn primary" data-act="tabquotes">${h(t("Add quotes"))}</button></div>`;
  if (!analyzedSet()) return `<div class="qEmpty"><h3>${h(t("Not analyzed yet"))}</h3><p class="qd">${h(t("Analyze the quotes to line up the same items across suppliers."))}</p><button class="btn primary" data-act="analyze">${h(t("Analyze quotes"))} →</button></div>`;
  const an = analysis(), quotes = d.quotes;
  const scope = an.flags.filter(f => f.sev === "scope"), open = scope.filter(f => !f.resolved);
  let o = "";
  if (quotes.length > 1) o += an.lowest
    ? `<div class="qBanner go">✓ ${h(t("Every scope difference is checked."))} <b data-nt>${h(supName(an.lowest))}</b> ${h(t("has the lowest total"))}: <b data-nt>${money(an.sums[an.lowest].total)}</b> — ${h(t("saves"))} <b data-nt>${money(an.savings)}</b> ${h(t("against the highest quote."))}</div>`
    : `<div class="qBanner hold">⚠︎ <b>${h(t("Not comparable yet"))}:</b> <span data-nt>${open.length}</span> ${h(t(open.length === 1 ? "scope difference to check" : "scope differences to check"))} (${h(t("missing items, quantities, exclusions…"))}). ${h(t("No supplier is recommended until each one is checked below — the lowest price may be missing scope."))}</div>`;
  o += `<div class="qSum">` + quotes.map(q => {
    const s = an.sums[q.docId], miss = an.flags.filter(f => f.docId === q.docId && f.sev === "scope" && (f.type === "missing" || f.type === "excluded")).length;
    return `<div class="s${an.lowest === q.docId ? " best" : ""}"><div class="k" data-nt>${h(q.supplier)}</div><div class="v" data-nt>${money(s.total)}</div>
      <div class="x" data-nt>${h(t(s.statedTotal != null ? "stated total" : "sum of lines"))}${quotes.length > 1 ? " · " + h(t("common scope")) + " " + money(an.commonTotals[q.docId]) : ""}</div>
      <div class="x" data-nt>${miss ? miss + " " + h(t("missing")) + " · " : ""}${(q.exclusions || []).length} ${h(t("exclusions"))}${s.optional ? " · " + h(t("options")) + " " + money(s.optional) : ""}</div></div>`;
  }).join("") + `</div>`;
  const takeoff = takeoffList();
  o += `<div class="qCard"><div class="qRow"><h3 style="margin:0">${h(t("Line by line"))}</h3><span class="qMuted">${h(t("Green = lowest. Click a price to choose that supplier for the line. Link a line to your measurements to check quoted quantities."))}</span></div><br>
    <div class="qScroll"><table class="qTbl"><thead><tr><th>${h(t("Item"))}</th><th>${h(t("Measured in this project"))}</th>${quotes.map(q => `<th class="n" data-nt>${h(q.supplier)}</th>`).join("")}<th></th></tr></thead><tbody>`;
  for (const r of an.rows) {
    const g = r.group, gf = an.flags.filter(f => f.gid === g.id && f.sev === "scope" && !f.resolved).length;
    o += `<tr><td style="min-width:200px"><input data-g="${h(g.id)}" data-gf="label" value="${h(g.label)}" data-nt>${gf ? `<span class="qBadge warn">${gf} ${h(t("to check"))}</span>` : ""}${g.ai ? ` <span class="qBadge ai" title="${h(t("Matched by the AI — check that these are really the same item"))}">AI</span>` : ""}</td>
      <td style="min-width:170px">${takeoffSel(g, takeoff)}</td>`;
    for (const q of quotes) {
      const c = r.cells[q.docId];
      if (!c) { o += `<td class="qCell miss">${h(t("not quoted"))}</td>`; continue; }
      const it = c.item, cls = (r.low === q.docId && quotes.length > 1 ? " low" : "") + (g.choice === q.docId ? " pick" : "");
      o += `<td class="qCell n${cls}" data-act="choose" data-g="${h(g.id)}" data-d="${h(q.docId)}" style="cursor:pointer" title="${h(it.desc)}">
        <div class="pr" data-nt>${c.price == null ? "—" : money(c.price)}${c.computed ? "*" : ""}</div>
        <div class="sm" data-nt>${it.qty != null ? num2(it.qty) + " " + h(it.unit || "") : ""}${it.unitPrice != null ? " @ " + money(E.cents(it.unitPrice)) : ""}${it.optional ? " · " + h(t("optional")) : ""}${it.alternate ? " · " + h(t("alternative")) : ""}</div>
        ${Object.keys(g.members).length > 1 ? `<button data-act="split" data-g="${h(g.id)}" data-d="${h(q.docId)}" title="${h(t("Not the same item — take it out of this line"))}">${h(t("not the same"))}</button>` : ""}</td>`;
    }
    o += `<td>${mergeSel(g, an.rows)}</td></tr>`;
  }
  o += `</tbody></table></div><p class="qMeta" style="margin-top:6px">* ${h(t("quantity × unit price — the quote has no line total"))}</p></div>`;
  // flags
  const label = {missing: "Missing", excluded: "Excluded", qty: "Quantity", takeoff: "Measured vs quoted", takeoffUnit: "Units", unit: "Units", spec: "Specs", noPrice: "No price",
    unverified: "Check", scanned: "Scan", totalMismatch: "Total", exclusion: "Exclusion", nofreight: "Freight", notax: "Tax", optional: "Option", alternate: "Alternative", allowance: "Allowance", priceDiff: "Price"};
  o += `<div class="qCard"><h3>${h(t("Differences found"))} <span class="qMuted" data-nt>(${scope.length - open.length}/${scope.length} ${h(t("checked"))})</span></h3>
    <p class="qd">${h(t("Tick a difference once you've dealt with it (asked the supplier, adjusted the quote, or decided it doesn't matter). The lowest supplier is only shown when all are ticked."))}</p><ul class="qFlags">`;
  for (const f of [...open, ...scope.filter(f => f.resolved), ...an.flags.filter(f => f.sev !== "scope")])
    o += `<li class="${f.resolved ? "res" : ""}"><span class="qBadge ${f.sev === "scope" ? "warn" : ""}">${h(t(label[f.type] || f.type))}</span><span data-nt>${h(f.text)}</span>${f.sev === "scope" ? `<label><input type="checkbox" data-flag="${h(f.key)}"${f.resolved ? " checked" : ""}> ${h(t("checked"))}</label>` : ""}</li>`;
  if (!an.flags.length) o += `<li>${h(t("No differences found."))}</li>`;
  o += `</ul>${feat("advancedScope") ? "" : `<br>${upsell("advancedScope", "Advanced scope and exclusions analysis (specs, exclusions against other suppliers' lines, missing freight or tax, allowances)")}`}</div>`;
  return o;
}
function takeoffSel(g, list) {
  const tk = g.takeoff;
  const live = tk && list.find(x => x.key === tk.key);
  return `<select data-g="${h(g.id)}" data-gf="takeoff"><option value="">—</option>${list.map(x => `<option value="${h(x.key)}"${tk && tk.key === x.key ? " selected" : ""} data-nt>${h(x.label)} · ${num2(x.qty)} ${h(x.unit)}</option>`).join("")}
    ${tk && !live ? `<option value="${h(tk.key)}" selected data-nt>${h(tk.label)} · ${num2(tk.qty)} ${h(tk.unit)} (${h(t("saved"))})</option>` : ""}</select>`;
}
function mergeSel(g, rows) {
  const others = rows.map(r => r.group).filter(x => x.id !== g.id && !Object.keys(x.members).some(d => g.members[d] != null));
  if (!others.length) return "";
  return `<select data-g="${h(g.id)}" data-gf="merge" title="${h(t("This line is the same item as…"))}" style="width:130px"><option value="">${h(t("Same item as…"))}</option>${others.map(x => `<option value="${h(x.id)}" data-nt>${h(x.label.slice(0, 50))}</option>`).join("")}</select>`;
}
// this project's measured totals, by category (and the material estimates that have a quantity)
function takeoffList() {
  const out = [];
  try {
    const r2 = v => Math.round(v * 100) / 100;
    const byCat = new Map();
    for (const m of measurements) {
      const v = measureValue(m); if (v == null) continue;
      const k = m.cat || ""; if (!byCat.has(k)) byCat.set(k, {area: 0, line: 0, count: 0});
      byCat.get(k)[m.type] += v;
    }
    const cats = orderedCats().map(c => [c.id, c]).concat(byCat.has("") ? [["", null]] : []);
    for (const [id, c] of cats) {
      const sub = byCat.get(id); if (!sub) continue;
      const name = c ? c.name : (es() ? "Sin categoría" : "No category");
      if (sub.area) out.push({key: id + ":area", label: name, qty: r2(sub.area), unit: "SF"});
      if (sub.line) out.push({key: id + ":line", label: name, qty: r2(sub.line), unit: "LF"});
      if (sub.count) out.push({key: id + ":count", label: name, qty: sub.count, unit: "EA"});
      if (c && c.waste > 0 && sub.area) out.push({key: id + ":areaw", label: name + " (+" + c.waste + "% " + (es() ? "desperdicio" : "waste") + ")", qty: r2(sub.area * (1 + c.waste / 100)), unit: "SF"});
      if (c && c.waste > 0 && sub.line) out.push({key: id + ":linew", label: name + " (+" + c.waste + "% " + (es() ? "desperdicio" : "waste") + ")", qty: r2(sub.line * (1 + c.waste / 100)), unit: "LF"});
      const cy = c && typeof catCY === "function" ? catCY(c, sub.area) : null;
      if (cy) { out.push({key: id + ":cy", label: name, qty: r2(cy.withWaste), unit: "CY"}); if (c.est && c.est.tons > 0) out.push({key: id + ":ton", label: name, qty: r2(cy.withWaste * c.est.tons), unit: "TON"}); }
    }
  } catch (e) { console.warn("takeoff", e); }
  return out;
}
// after an analysis: suggest a measured total for lines that don't have one yet (only when the name and unit fit well)
function autoTakeoff() {
  const list = takeoffList(); if (!list.length) return;
  let n = 0;
  for (const g of S.cmp.data.groups) {
    if (g.takeoff) { const live = list.find(x => x.key === g.takeoff.key); if (live && live.qty !== g.takeoff.qty) { g.takeoff = live; n++; } continue; }
    const first = Object.entries(g.members)[0]; if (!first) continue;
    const it = E.itemOf(S.cmp.data, first[0], first[1]);
    const s = E.suggestTakeoff(g.label, it && it.unit, list);
    if (s) { g.takeoff = Object.assign({suggested: true}, s); n++; }
  }
  if (n) touch("Linked to the takeoff");
}

// ---------------- Value engineering ----------------
function veHtml() {
  if (!feat("valueEngineering")) return upsell("valueEngineering", "Value engineering comparisons");
  const d = S.cmp.data, sum = E.veSummary(d.ve, d.pricing);
  let o = `<div class="qCard"><div class="qRow"><h3 style="margin:0">${h(t("Original against alternative"))}</h3><span style="flex:1"></span>
    <button class="btn" data-act="vesuggest">✨ ${h(t("Add the suppliers' alternatives"))}</button><button class="btn" data-act="veadd">＋ ${h(t("Add a comparison"))}</button></div>
    <p class="qd" style="margin-top:8px">${h(t("Amounts are in dollars for the whole line. Savings = original total − alternative total. A positive labor difference means the alternative needs more labor."))}</p>`;
  if (!d.ve.length) o += `<p class="qMuted">${h(t("Nothing here yet. Add the alternatives the suppliers offered, or add your own."))}</p>`;
  else {
    o += `<div class="qScroll"><table class="qTbl"><thead><tr><th>${h(t("Item"))}</th><th></th><th class="n">${h(t("Material"))}</th><th class="n">${h(t("Labor"))}</th><th class="n">${h(t("Equipment"))}</th><th class="n">${h(t("Freight"))}</th><th class="n">${h(t("Total"))}</th><th class="n">${h(t("Savings"))}</th><th></th></tr></thead><tbody>`;
    d.ve.forEach((p, i) => {
      const r = E.veRow(p);
      const cells = side => ["material", "labor", "equipment", "freight"].map(k => `<td style="width:88px"><input class="n" data-ve="${i}" data-side="${side}" data-k="${k}" value="${h(num2(p[side] && p[side][k]))}" inputmode="decimal" aria-label="${h(t(side === "orig" ? "Original" : "Alternative") + " · " + t(k))}"></td>`).join("");
      o += `<tr><td rowspan="2" style="min-width:170px"><input data-ve="${i}" data-k="label" value="${h(p.label || "")}" data-nt><input data-ve="${i}" data-k="note" value="${h(p.note || "")}" placeholder="${h(t("Note"))}" style="margin-top:4px" data-nt></td>
        <td class="qMuted">${h(t("Original"))}</td>${cells("orig")}<td class="n" data-nt>${money(r.orig.total)}</td>
        <td rowspan="2" class="n" data-nt style="white-space:normal; min-width:130px"><b>${money(r.savings)}</b> <span class="qMuted">${E.fmtPct(r.savingsPct)}</span><br><span class="qMeta">${h(t("material"))} ${money(r.materialSavings)}<br>${h(t("labor"))} ${r.laborDiff >= 0 ? "+" : ""}${money(r.laborDiff)}<br>${h(t("equip./freight"))} ${r.equipFreightDiff >= 0 ? "+" : ""}${money(r.equipFreightDiff)}</span></td>
        <td rowspan="2"><button class="btn qBtnS" data-act="vedel" data-ve="${i}">✕</button></td></tr>
        <tr><td class="qMuted">${h(t("Alternative"))}</td>${cells("alt")}<td class="n" data-nt>${money(r.alt.total)}</td></tr>`;
    });
    o += `<tr class="sum"><td>${h(t("Total"))}</td><td></td><td class="n" data-nt>${money(sum.orig.material)} → ${money(sum.alt.material)}</td><td class="n" data-nt>${money(sum.orig.labor)} → ${money(sum.alt.labor)}</td><td class="n" data-nt>${money(sum.orig.equipment)} → ${money(sum.alt.equipment)}</td><td class="n" data-nt>${money(sum.orig.freight)} → ${money(sum.alt.freight)}</td><td class="n" data-nt>${money(sum.orig.total)} → ${money(sum.alt.total)}</td><td class="n" data-nt>${money(sum.savings)}<br>${E.fmtPct(sum.savingsPct)}</td><td></td></tr></tbody></table></div>`;
    o += `<div class="qSum" style="margin-top:12px">${[["Selling price — original", sum.origPrice], ["Selling price — alternative", sum.altPrice]].map(([k, p]) =>
      `<div class="s"><div class="k">${h(t(k))}</div><div class="v" data-nt>${money(p.sell)}</div><div class="x" data-nt>${h(t("profit"))} ${money(p.profit)} · ${h(t("margin"))} ${E.fmtPct(p.margin)} · ${h(t("markup"))} ${E.fmtPct(p.markup)}</div></div>`).join("")}
      <div class="s"><div class="k">${h(t("Price difference for the client"))}</div><div class="v" data-nt>${sum.origPrice.sell != null && sum.altPrice.sell != null ? money(sum.origPrice.sell - sum.altPrice.sell) : "—"}</div><div class="x">${h(t("using the pricing on the Pricing & profit tab"))}</div></div></div>`;
  }
  return o + `</div>`;
}
function veSuggest() {
  const d = S.cmp.data, an = analysis(); let n = 0;
  for (const q of d.quotes) for (const it of q.items) {
    if (!it.alternate || d.ve.some(p => p.alt && p.alt.from === it.id && p.altDoc === q.docId)) continue;
    // the original: the line the alternative replaces (by its "instead of" text, or by its description)
    let best = null, bs = 0.25;
    for (const r of an.rows) {
      if (Object.entries(r.group.members).some(([dd, ii]) => dd === q.docId && ii === it.id)) continue;
      const s = E.similarity(it.altOf || it.desc, r.group.label); if (s > bs) { bs = s; best = r; }
    }
    const origDoc = best ? (best.group.choice && best.cells[best.group.choice] ? best.group.choice : best.low) : null;
    const origIt = best && origDoc ? best.cells[origDoc].item : null;
    d.ve.push({id: "v" + Date.now().toString(36) + n, label: (origIt ? origIt.desc + " → " : "") + it.desc, note: supName(q.docId) + (origIt ? " · " + (es() ? "original de " : "original from ") + supName(origDoc) : ""),
      orig: origIt ? E.sideFromItem(origIt) : {material: 0, labor: 0, equipment: 0, freight: 0}, alt: E.sideFromItem(it), altDoc: q.docId});
    n++;
  }
  toast(n ? (es() ? n + " alternativa(s) agregadas — revisa los montos" : n + " alternative" + (n === 1 ? "" : "s") + " added — check the amounts") : (es() ? "No hay alternativas marcadas en las cotizaciones" : "No lines are marked as alternatives in the quotes"), 5000);
  if (n) touch("Value engineering");
}

// ---------------- Pricing & profit ----------------
function pricingHtml() {
  const d = S.cmp.data, an = analysis(), costs = E.chosenCosts(d, an), pr = d.pricing, res = E.priceJob(costs, pr);
  const kinds = [["material", "Material"], ["labor", "Labor"], ["equipment", "Equipment"], ["other", "Other"], ["allowance", "Allowances"], ["freight", "Freight / delivery"], ["tax", "Tax"], ["discount", "Discounts"]];
  let o = `<div class="qCard"><h3>${h(t("Cost from the chosen suppliers"))}</h3>
    <p class="qd">${h(t("For each line: the supplier you chose on the Compare tab, otherwise the lowest. Each supplier used brings its own freight, tax and discount."))}${costs.missing ? " " + h(es() ? costs.missing + " línea(s) sin precio no se incluyen." : costs.missing + " line(s) without a price aren't included.") : ""}${costs.extras ? " " + h(es() ? costs.extras + " opción(es) o alternativa(s) no se incluyen — haz clic en su precio en Comparar para incluirla." : costs.extras + " option(s) or alternative(s) aren't included — click its price on the Compare tab to include it.") : ""}</p>
    <table class="qTbl" style="max-width:520px"><tbody>${kinds.filter(([k]) => costs[k]).map(([k, l]) => `<tr><td>${h(t(l))}</td><td class="n" data-nt>${money(costs[k])}</td></tr>`).join("")}
    <tr class="sum"><td>${h(t("Direct cost"))}</td><td class="n" data-nt>${money(res.direct)}</td></tr></tbody></table>
    <p class="qMeta" data-nt>${h(t("Suppliers used"))}: ${h(costs.suppliers.map(supName).join(", ") || "—")}</p></div>`;
  const pIn = (k, v, lbl) => `<span class="qPct"><input type="number" step="0.1" data-pr="${k}" value="${h(pctIn(v))}" style="width:90px" aria-label="${h(t(lbl || k))}"> %</span>`;
  o += `<div class="qCard"><div class="qRow"><h3 style="margin:0">${h(t("Markup and margin"))}</h3><span style="flex:1"></span>${profileBar()}</div><br>
    <div class="qForm">
      <label>${h(t("Price by"))}</label><div class="qRow"><label><input type="radio" name="qMethod" data-pr="method" value="markup"${pr.method !== "margin" ? " checked" : ""}> ${h(t("Markup on cost"))}</label>
        <label><input type="radio" name="qMethod" data-pr="method" value="margin"${pr.method === "margin" ? " checked" : ""}> ${h(t("Target gross margin"))}</label></div>
      <label>${h(t("Overhead (on direct cost)"))}</label><div>${pIn("overhead", pr.overhead, "Overhead (on direct cost)")}</div>
      ${pr.method === "margin" ? `<label>${h(t("Gross margin"))}</label><div>${pIn("margin", pr.margin, "Gross margin")} <span class="qMeta" data-nt>= ${h(t("markup"))} ${E.fmtPct(E.marginToMarkup(pr.margin))}</span></div>`
        : `<label>${h(t("Markup"))}</label><div>${pIn("markup", pr.markup, "Markup")} <span class="qMeta" data-nt>= ${h(t("margin"))} ${E.fmtPct(E.markupToMargin(pr.markup))}</span></div>`}
      ${pr.method !== "margin" && feat("pricingProfiles") ? ["material", "labor", "equipment", "freight"].map(k => `<label>${h(t("Markup on " + k))}</label><div>${pIn("by:" + k, pr.byKind && pr.byKind[k], "Markup on " + k)} <span class="qMeta">${h(t("empty = the markup above"))}</span></div>`).join("") : ""}
    </div>${feat("pricingProfiles") ? "" : `<br>${upsell("pricingProfiles", "Saved pricing profiles and separate markups for material, labor, equipment and freight")}`}</div>`;
  o += `<div class="qSum">${[["Direct cost", res.direct], ["Overhead", res.overhead], ["Total cost", res.cost], ["Selling price", res.sell], ["Gross profit", res.profit]].map(([k, v]) =>
      `<div class="s${k === "Selling price" ? " best" : ""}"><div class="k">${h(t(k))}</div><div class="v" data-nt>${money(v)}</div></div>`).join("")}
    <div class="s"><div class="k">${h(t("Gross margin"))}</div><div class="v" data-nt>${E.fmtPct(res.margin)}</div><div class="x">${h(t("profit ÷ selling price"))}</div></div>
    <div class="s"><div class="k">${h(t("Markup"))}</div><div class="v" data-nt>${E.fmtPct(res.markup)}</div><div class="x">${h(t("profit ÷ total cost"))}</div></div></div>
    ${res.error ? `<div class="qBanner hold">${h(t(res.error))}</div>` : ""}`;
  return o;
}
function profileBar() {
  if (!feat("pricingProfiles")) return "";
  const list = (S.profiles || []).filter(p => p.kind === "profile");
  const company = S.org && S.org.settings && S.org.settings.estimating;
  return `<select data-act-change="loadprofile" style="max-width:220px"><option value="">${h(t("Load a pricing profile…"))}</option>${company ? `<option value="__company">${h(t("Company standard"))}</option>` : ""}${list.map(p => `<option value="${h(p.id)}" data-nt>${h(p.name)}${p.shared ? " 👥" : ""}</option>`).join("")}</select>
    <button class="btn qBtnS" data-act="saveprofile">${h(t("Save as profile"))}</button>`;
}
async function loadProfiles() { try { S.profiles = await api("/quotes/profiles"); if (S.tab === "pricing" || S.tab === "team" || S.tab === "reports") render(); } catch (e) { S.profiles = []; } }

// ---------------- Reports ----------------
function reportsHtml() {
  const R = Object.assign(S.report, S.cmp.data.report || {});
  const x = feat("excel"), trial = S.usage && S.usage.tier === "trial";
  const card = (k, title, desc, f) => `<div class="qCard"><h3>${h(t(title))}</h3><p class="qd">${h(t(desc))}</p>${f && !feat(f) ? upsell(f, title) : `<div class="qRow">
      <button class="btn primary" data-act="report" data-k="${k}" data-fmt="pdf">⬇︎ PDF</button>${x ? `<button class="btn" data-act="report" data-k="${k}" data-fmt="xlsx">⬇︎ Excel</button>` : `<span class="qMeta">${h(t("Excel exports come with Pro and Team"))}</span>`}</div>`}</div>`;
  let o = trial ? `<div class="qBanner hold">${h(t("During the free trial you can see everything on screen. Downloading reports comes with a plan."))} <button class="btn qBtnS" data-act="plans">${h(t("See plans"))}</button></div>` : "";
  o += card("supplier", "Supplier comparison report", "Totals, every line side by side, the measured quantities, and each difference found — with what's been checked. For you and your team.");
  o += card("ve", "Value engineering report", "Original against alternative: material, labor, equipment and freight, savings and the effect on the selling price.", "valueEngineering");
  o += card("profit", "Internal cost and profitability report", "Cost by kind, the supplier chosen for each line, overhead, markup, gross margin and selling price. Internal — not for the client.", "profitReports");
  const tpls = (S.profiles || []).filter(p => p.kind === "template");
  o += `<div class="qCard"><h3>${h(t("Client-facing comparison report"))}</h3><p class="qd">${h(t("Your selling prices for the client. It never shows your costs, overhead, markup or margin — unless you tick the box below."))}</p>
    <div class="qForm">
      ${feat("pricingProfiles") ? `<label>${h(t("Template"))}</label><div class="qRow"><select data-act-change="loadtemplate"><option value="">—</option>${tpls.map(p => `<option value="${h(p.id)}" data-nt>${h(p.name)}${p.shared ? " 👥" : ""}</option>`).join("")}</select><button class="btn qBtnS" data-act="savetemplate">${h(t("Save as template"))}</button></div>` : ""}
      <label>${h(t("Title"))}</label><input data-rp="title" value="${h(R.title || "")}" placeholder="${h(t("Proposal"))}" data-nt>
      <label>${h(t("Introduction"))}</label><textarea data-rp="intro" rows="3" data-nt>${h(R.intro || "")}</textarea>
      <label>${h(t("Terms and notes"))}</label><textarea data-rp="terms" rows="3" data-nt>${h(R.terms || "")}</textarea>
      <label>${h(t("Show"))}</label><div>
        <label><input type="checkbox" data-rp="showUnit"${R.showUnit !== false ? " checked" : ""}> ${h(t("quantities and unit prices"))}</label><br>
        <label><input type="checkbox" data-rp="showSuppliers"${R.showSuppliers ? " checked" : ""}> ${h(t("supplier names"))}</label><br>
        <label><input type="checkbox" data-rp="fold"${R.fold !== false ? " checked" : ""}> ${h(t("delivery, tax and overhead included in the line prices"))}</label><br>
        <label style="color:#b0281a"><input type="checkbox" data-rp="showCosts"${R.showCosts ? " checked" : ""}> ${h(t("include my internal costs, markup and margin (not usually shown to clients)"))}</label></div>
    </div><br><div class="qRow"><button class="btn primary" data-act="report" data-k="client" data-fmt="pdf">⬇︎ PDF</button>${x ? `<button class="btn" data-act="report" data-k="client" data-fmt="xlsx">⬇︎ Excel</button>` : ""}</div></div>`;
  o += feat("branding") ? `<p class="qMeta">${h(t("Reports carry your company name and logo from Team & usage → Company branding."))}</p>` : upsell("branding", "Company branding on reports");
  return o;
}

// ---------------- History ----------------
async function loadRevs() { try { S.revs = await api("/quotes/cmp/" + S.cmp.id + "/revisions"); if (S.tab === "history") render(); } catch (e) { S.revs = []; fail(e); } }
function historyHtml() {
  if (!feat("revisions")) return upsell("revisions", "Comparison revision history");
  const keep = S.usage.revisionsKept;
  let o = `<div class="qCard"><h3>${h(t("Earlier versions"))}</h3><p class="qd">${h(es() ? "Se guarda una versión cada vez que alguien cambia la comparación (como máximo una cada 10 minutos, más cada análisis). Se guardan las últimas " + keep + "." : "A version is kept whenever someone changes the comparison (at most one every 10 minutes, plus every analysis). The last " + keep + " are kept.")}</p>`;
  if (!S.revs) o += `<p class="qMuted">${h(t("Loading…"))}</p>`;
  else if (!S.revs.length) o += `<p class="qMuted">${h(t("No earlier versions yet."))}</p>`;
  else o += `<table class="qTbl"><thead><tr><th>${h(t("Version"))}</th><th>${h(t("When"))}</th><th>${h(t("Who"))}</th><th>${h(t("What"))}</th><th></th></tr></thead><tbody>${S.revs.map(r =>
    `<tr><td data-nt>${r.rev}</td><td data-nt>${h(new Date(r.created_at).toLocaleString(es() ? "es-US" : undefined))}</td><td data-nt>${h(r.email || "")}</td><td data-nt>${h(r.note || "")}</td><td><button class="btn qBtnS" data-act="restore" data-rev="${r.rev}">${h(t("Bring back"))}</button></td></tr>`).join("")}</tbody></table>`;
  return o + `</div>`;
}

// ---------------- Team & usage ----------------
function teamHtml() {
  const u = S.usage, org = S.org;
  if (!u || !org) return `<p class="qMuted">${h(t("Loading…"))}</p>`;
  const isAdm = u.role === "owner" || u.role === "admin";
  const ends = u.periodEnds ? fmtDayQ(u.periodEnds) : "—";
  let o = `<div class="qCard"><h3>${h(t("Your plan"))}: <span data-nt>${h(u.plan)}</span></h3>
    <p class="qd" data-nt>${h(u.tier === "trial" ? (es() ? "Prueba gratis: los límites son para toda la prueba." : "Free trial: the allowances are for the whole trial.") : (es() ? "Los límites se renuevan el " : "Allowances reset on ") + ends + (es() ? ". No se acumulan y nunca se cobra extra por uso." : ". They don't carry over, and usage is never billed extra."))}${u.member ? " " + h(es() ? "El plan lo administra " + org.ownerEmail + "." : "The plan is managed by " + org.ownerEmail + ".") : ""}</p>
    <div class="qSum">${[["AI comparisons", u.comparisons], ["Document credits", u.credits]].map(([k, x]) => `<div class="s"><div class="k">${h(t(k))}</div><div class="v" data-nt>${x.used} / ${x.max}</div><div class="x" data-nt>${Math.max(0, x.max - x.used)} ${h(t("left"))}</div></div>`).join("")}
      <div class="s"><div class="k">${h(t("Quote storage"))}</div><div class="v" data-nt>${fmtSizeQ(u.storage.used)}</div><div class="x" data-nt>${h(t("of"))} ${fmtGB(u.storage.max)}</div></div>
      <div class="s"><div class="k">${h(t("Users"))}</div><div class="v" data-nt>${org.members.length} / ${u.seats}</div><div class="x">${h(t("quotes per comparison"))}: <span data-nt>${u.quotesPerComparison}</span></div></div></div>
    <div class="qRow">${u.member ? "" : `<button class="btn primary" data-act="plans">${h(t(u.tier === "trial" ? "Choose a plan" : "Change plan"))}</button>`}<span class="qMeta">${h(t("At the limit you can upgrade or wait for the next billing period — nothing is charged automatically."))}</span></div></div>`;
  // members
  o += `<div class="qCard"><h3>${h(t("Team"))}</h3>`;
  if (u.seats <= 1 && !u.member) o += upsell("sharedProjects", "Teammates, shared projects and shared comparisons");
  o += `<table class="qTbl qMem"><thead><tr><th>${h(t("Email"))}</th><th>${h(t("Role"))}</th><th>${h(t("Last active"))}</th><th></th></tr></thead><tbody>${org.members.map(m =>
    `<tr><td data-nt>${h(m.email)}${m.user_id === HOST.me() ? " (" + h(t("you")) + ")" : ""}</td><td>${m.role === "owner" ? h(t("Owner")) : feat("teamRoles") && isAdm
      ? `<select data-role="${h(m.user_id)}">${["admin", "estimator", "viewer"].map(r => `<option value="${r}"${m.role === r ? " selected" : ""}>${h(t(r[0].toUpperCase() + r.slice(1)))}</option>`).join("")}</select>` : h(t(m.role[0].toUpperCase() + m.role.slice(1)))}</td>
      <td data-nt>${m.last_active_at ? h(fmtDayQ(m.last_active_at)) : "—"}</td><td>${m.role !== "owner" && (isAdm || m.user_id === HOST.me()) ? `<button class="btn qBtnS" data-act="rmmember" data-u="${h(m.user_id)}">${h(t(m.user_id === HOST.me() ? "Leave" : "Remove"))}</button>` : ""}</td></tr>`).join("")}
    ${(org.invites || []).map(i => `<tr><td data-nt>${h(i.email)}</td><td>${h(t("Invited"))} · ${h(t(i.role))}</td><td data-nt>${h(t("expires"))} ${h(fmtDayQ(i.expires_at))}</td><td><button class="btn qBtnS" data-act="uninvite" data-email="${h(i.email)}">${h(t("Cancel"))}</button></td></tr>`).join("")}</tbody></table>`;
  if (isAdm && u.seats > 1) o += `<br><div class="qRow"><input type="email" id="qInvEmail" placeholder="${h(t("teammate@company.com"))}" style="flex:1; min-width:200px">${feat("teamRoles") ? `<select id="qInvRole"><option value="estimator">${h(t("Estimator"))}</option><option value="admin">${h(t("Admin"))}</option><option value="viewer">${h(t("Viewer"))}</option></select>` : ""}<button class="btn primary" data-act="invite">${h(t("Invite"))}</button></div>
    <p class="qMeta">${h(feat("teamRoles") ? t("Admins manage the team and settings · estimators work on projects and comparisons · viewers can only look.") : t("Teammates can work on shared projects and all the team's comparisons. Choosing roles (admin, estimator, viewer) comes with Team."))}</p>`;
  o += `</div>`;
  // usage by member (Team)
  if (org.byMember) o += `<div class="qCard"><h3>${h(t("Usage by teammate this period"))}</h3><table class="qTbl"><thead><tr><th>${h(t("Email"))}</th><th class="n">${h(t("Credits"))}</th><th class="n">${h(t("Comparisons"))}</th><th class="n">${h(t("Actions"))}</th></tr></thead><tbody>${org.byMember.map(r =>
    `<tr><td data-nt>${h(r.email || "")}</td><td class="n" data-nt>${r.credits}</td><td class="n" data-nt>${r.comparisons}</td><td class="n" data-nt>${r.actions}</td></tr>`).join("")}</tbody></table></div>`;
  else if (!u.member) o += upsell("usageDashboard", "Organization usage dashboard");
  // branding
  const br = (org.settings && org.settings.branding) || {};
  if (!feat("branding")) o += upsell("branding", "Company branding on reports");
  else if (isAdm) o += `<div class="qCard"><h3>${h(t("Company branding on reports"))}</h3><div class="qForm">
    ${[["company", "Company name"], ["address", "Address"], ["phone", "Phone"], ["email", "Email"], ["web", "Website"]].map(([k, l]) => `<label>${h(t(l))}</label><input data-br="${k}" value="${h(br[k] || "")}" data-nt>`).join("")}
    <label>${h(t("Logo (PNG or JPG, under 300 KB)"))}</label><div class="qRow">${br.logo ? `<img src="${h(br.logo)}" alt="" style="max-height:40px; max-width:160px">` : ""}<button class="btn qBtnS" data-act="logo">${h(t(br.logo ? "Change" : "Upload"))}</button>${br.logo ? `<button class="btn qBtnS" data-act="nologo">${h(t("Remove"))}</button>` : ""}</div>
    </div><br><button class="btn primary" data-act="savebrand">${h(t("Save branding"))}</button></div>`;
  // company-wide estimating settings (Team)
  if (feat("orgSettings") && isAdm) {
    const est = (org.settings && org.settings.estimating) || {};
    o += `<div class="qCard"><h3>${h(t("Company-wide estimating settings"))}</h3><p class="qd">${h(t("The company standard pricing everyone on the team can load on the Pricing & profit tab."))}</p><div class="qForm">
      <label>${h(t("Price by"))}</label><select data-est="method"><option value="markup"${est.method !== "margin" ? " selected" : ""}>${h(t("Markup on cost"))}</option><option value="margin"${est.method === "margin" ? " selected" : ""}>${h(t("Target gross margin"))}</option></select>
      ${[["markup", "Markup"], ["margin", "Gross margin"], ["overhead", "Overhead (on direct cost)"]].map(([k, l]) => `<label>${h(t(l))}</label><span class="qPct"><input type="number" step="0.1" data-est="${k}" value="${h(pctIn(est[k]))}" style="width:90px"> %</span>`).join("")}
      <label>${h(t("Labor rate ($/hour)"))}</label><input type="number" step="0.01" data-est="laborRate" value="${h(est.laborRate == null ? "" : est.laborRate)}" style="width:110px">
      </div><br><button class="btn primary" data-act="saveest">${h(t("Save company settings"))}</button></div>`;
  } else if (!u.member && feat("branding")) o += upsell("orgSettings", "Company-wide estimating settings, shared profiles and templates");
  // profiles & templates
  if (feat("pricingProfiles")) {
    if (!S.profiles) loadProfiles();
    o += `<div class="qCard"><h3>${h(t("Pricing profiles and report templates"))}</h3>${!S.profiles ? `<p class="qMuted">${h(t("Loading…"))}</p>` : !S.profiles.length ? `<p class="qMuted">${h(t("None yet — save one from the Pricing & profit or Reports tab."))}</p>`
      : `<table class="qTbl"><tbody>${S.profiles.map(p => `<tr><td data-nt>${h(p.name)}</td><td>${h(t(p.kind === "template" ? "Report template" : "Pricing profile"))}</td><td>${p.shared ? h(t("Shared with the team")) : h(t("Only you"))}</td><td data-nt>${h(p.mine ? "" : p.email || "")}</td><td>${p.mine || isAdm ? `<button class="btn qBtnS" data-act="delprofile" data-id="${h(p.id)}">${h(t("Delete"))}</button>` : ""}${p.mine && feat("sharedProfiles") ? ` <button class="btn qBtnS" data-act="shareprofile" data-id="${h(p.id)}">${h(t(p.shared ? "Stop sharing" : "Share with team"))}</button>` : ""}</td></tr>`).join("")}</tbody></table>`}</div>`;
  }
  // PLAN TAKEOFF: connect it to this account (TerraTakeoff, the owner's admin account) — or, inside PLAN TAKEOFF, disconnect
  if (HOST.name === "terratakeoff" && HOST.isAdmin()) o += `<div class="qCard"><h3>${h(t("PLAN TAKEOFF"))}</h3>
    <p class="qd">${h(t("Use Quotes inside PLAN TAKEOFF with this account and its allowances. Get a code, then paste it in PLAN TAKEOFF → 📑 Quotes. The code works once, for 10 minutes. PLAN TAKEOFF can only use Quotes — not your projects, plans, account or billing."))}</p>
    ${S.toolCode ? `<p style="font:700 26px/1.2 var(--mono, monospace); letter-spacing:2px" data-nt>${h(S.toolCode)}</p>` : ""}
    <div class="qRow"><button class="btn primary" data-act="toolcode">${h(t(S.toolCode ? "Get a new code" : "Get a connection code"))}</button><button class="btn" data-act="toolrevoke">${h(t("Disconnect PLAN TAKEOFF"))}</button></div></div>`;
  if (HOST.name !== "terratakeoff") o += `<div class="qCard"><h3>${h(t("TerraTakeoff account"))}</h3><p class="qd" data-nt>${h(t("Connected as"))} ${h(HOST.email ? HOST.email() : "")}</p><button class="btn" data-act="hostdisconnect">${h(t("Disconnect"))}</button></div>`;
  // activity log (Team)
  if (feat("audit") && isAdm) o += `<div class="qCard"><div class="qRow"><h3 style="margin:0">${h(t("Activity log"))}</h3><span style="flex:1"></span><button class="btn qBtnS" data-act="audit">${h(t(S.audit ? "Refresh" : "Show"))}</button></div>${S.audit ? `<br><div class="qScroll"><table class="qTbl"><tbody>${S.audit.map(a =>
    `<tr><td data-nt>${h(new Date(a.created_at).toLocaleString(es() ? "es-US" : undefined))}</td><td data-nt>${h(a.email || "")}</td><td data-nt>${h(a.action)}</td><td data-nt>${h([a.target, a.detail].filter(Boolean).join(" · "))}</td></tr>`).join("")}</tbody></table></div>` : ""}</div>`;
  else if (!u.member) o += upsell("audit", "Audit and activity log");
  return o;
}
function logoPick(f) {
  if (!/^image\/(png|jpeg)$/.test(f.type) || f.size > 300 * 1024) { toast("The logo must be a PNG or JPG under 300 KB"); return; }
  const r = new FileReader();
  r.onload = () => { S.org.settings.branding = Object.assign({}, S.org.settings.branding || {}, {logo: r.result}); render(); };
  r.readAsDataURL(f);
}

// ---------------- events ----------------
async function onClick(e) {
  const tab = e.target.closest("[data-tab]");
  if (tab) { await flush(); S.tab = tab.dataset.tab; renderTabs(); render(); return; }
  const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
  const act = b.dataset.act, d = S.cmp && S.cmp.data, qi = +b.dataset.q;
  try {
    if (act === "close") return close();
    if (act === "new") return newCmp();
    if (act === "pick") return $q("#qFile").click();
    if (act === "opencmp") return openCmp(b.dataset.id);
    if (act === "analyze") return analyze();
    if (act === "tabquotes") { S.tab = "quotes"; renderTabs(); return render(); }
    if (act === "plans") { await close(); return HOST.plans(); }
    if (act === "delcmp") {
      if (!confirm(t("Delete this comparison? The quote files stay in your documents."))) return;
      busy(true, "Deleting…"); try { await api("/quotes/cmp/" + S.cmp.id, {method: "DELETE"}); S.cmp = null; S.dirty = false; await loadList(); render(); } finally { busy(false); } return;
    }
    if (act === "toggleq") { S.openQuote = S.openQuote === d.quotes[qi].docId ? null : d.quotes[qi].docId; return render(); }
    if (act === "rmq") { if (!confirm(t("Remove this quote from the comparison?"))) return; const id = d.quotes[qi].docId; d.quotes.splice(qi, 1); for (const g of d.groups) delete g.members[id]; d.groups = d.groups.filter(g => Object.keys(g.members).length); touch("Removed a quote"); return render(); }
    if (act === "docfile") {
      const q = d.quotes[qi]; busy(true, "Downloading…");
      try { const r = await api("/quotes/doc/" + q.docId + "/file", {raw: true}); downloadBlob(await r.blob(), q.fileName || "quote"); } finally { busy(false); } return;
    }
    if (act === "addline") { const q = d.quotes[qi]; q.items.push({id: "u" + Date.now().toString(36), desc: "", qty: null, unit: "", unitPrice: null, total: null, kind: "material", unverified: [], added: true}); touch("Added a line"); return render(); }
    if (act === "delline") { const q = d.quotes[qi]; q.items = q.items.filter(i => i.id !== b.dataset.i); for (const g of d.groups) if (g.members[q.docId] === b.dataset.i) delete g.members[q.docId]; d.groups = d.groups.filter(g => Object.keys(g.members).length); touch("Deleted a line"); return render(); }
    if (act === "usesug") {
      const it = d.quotes[qi].items.find(i => i.id === b.dataset.i);
      const field = {quantity: "qty", "unit price": "unitPrice", total: "total"}[b.dataset.f];
      if (!confirm((es() ? "La IA leyó " : "The AI read ") + num2(it.suggested[b.dataset.k]) + (es() ? ", pero ese número no aparece en el documento. ¿Lo comprobaste en la cotización y quieres usarlo?" : ", but that number isn't written in the document. Did you check it on the quote, and want to use it?"))) return;
      it[field] = it.suggested[b.dataset.k]; it.unverified = it.unverified.filter(x => x !== b.dataset.f); it.edited = true; touch("Checked AI values"); return render();
    }
    if (act === "choose") { if (e.target.closest("button")) return; const g = d.groups.find(x => x.id === b.dataset.g); g.choice = g.choice === b.dataset.d ? null : b.dataset.d; touch("Chose suppliers"); return render(); }
    if (act === "split") {
      const g = d.groups.find(x => x.id === b.dataset.g), id = g.members[b.dataset.d]; delete g.members[b.dataset.d];
      const it = E.itemOf(d, b.dataset.d, id);
      d.groups.push({id: "s" + Date.now().toString(36), label: it ? it.desc : g.label, members: {[b.dataset.d]: id}, takeoff: null, choice: null});
      if (g.choice === b.dataset.d) g.choice = null;
      touch("Split a line"); return render();
    }
    if (act === "veadd") { d.ve.push({id: "v" + Date.now().toString(36), label: "", note: "", orig: {material: 0, labor: 0, equipment: 0, freight: 0}, alt: {material: 0, labor: 0, equipment: 0, freight: 0}}); touch("Value engineering"); return render(); }
    if (act === "vedel") { d.ve.splice(+b.dataset.ve, 1); touch("Value engineering"); return render(); }
    if (act === "vesuggest") { veSuggest(); return render(); }
    if (act === "saveprofile" || act === "savetemplate") {
      const n = prompt(t(act === "saveprofile" ? "Name this pricing profile" : "Name this report template")); if (!n) return;
      const shared = feat("sharedProfiles") && confirm(t("Share it with your team?"));
      const data = act === "saveprofile" ? d.pricing : Object.assign({}, S.report);
      await api("/quotes/profiles", {body: {name: n, kind: act === "saveprofile" ? "profile" : "template", shared, data}}); S.profiles = null; await loadProfiles(); toast(t("Saved")); return;
    }
    if (act === "delprofile") { if (!confirm(t("Delete it?"))) return; await api("/quotes/profiles/" + b.dataset.id, {method: "DELETE"}); S.profiles = null; await loadProfiles(); return render(); }
    if (act === "shareprofile") { const p = S.profiles.find(x => x.id === b.dataset.id); await api("/quotes/profiles", {body: {id: p.id, name: p.name, kind: p.kind, shared: !p.shared, data: p.data}}); S.profiles = null; await loadProfiles(); return render(); }
    if (act === "report") return report(b.dataset.k, b.dataset.fmt);
    if (act === "restore") {
      if (!confirm((es() ? "¿Volver a la versión " : "Bring back version ") + b.dataset.rev + (es() ? "? La versión actual se guarda en el historial." : "? The current version is kept in the history."))) return;
      await flush(); busy(true, "Restoring…");
      try { await api("/quotes/cmp/" + S.cmp.id + "/restore/" + b.dataset.rev, {body: {}}); S.revs = null; await openCmp(S.cmp.id); S.tab = "compare"; renderTabs(); render(); } finally { busy(false); } return;
    }
    // team
    if (act === "invite") {
      const em = $q("#qInvEmail").value.trim(), role = $q("#qInvRole") ? $q("#qInvRole").value : "estimator";
      if (!em) return;
      busy(true, "Inviting…");
      try {
        const r = await api("/org/invite", {body: {email: em, role}});
        if (!r.mailed) prompt(t("The email couldn't be sent from here. Copy this invitation link and send it yourself:"), r.link);
        else toast((es() ? "Invitación enviada a " : "Invitation sent to ") + r.email);
        await loadOrg(); render();
      } finally { busy(false); } return;
    }
    if (act === "uninvite") { await api("/org/invite/cancel", {body: {email: b.dataset.email}}); await loadOrg(); return render(); }
    if (act === "rmmember") {
      const me = b.dataset.u === HOST.me();
      if (!confirm(t(me ? "Leave this team? You'll go back to your own account." : "Remove this teammate? Their own projects stay with them; projects they shared stop being shared."))) return;
      await api("/org/remove", {body: {userId: b.dataset.u}});
      if (me) { await HOST.refreshAccount(); S.org = null; S.cmp = null; await loadUsage(); await loadList(); }
      else await loadOrg();
      return render();
    }
    if (act === "logo") return $q("#qLogo").click();
    if (act === "nologo") { S.org.settings.branding = Object.assign({}, S.org.settings.branding, {logo: null}); return render(); }
    if (act === "savebrand") {
      const br = Object.assign({}, S.org.settings.branding || {});
      document.querySelectorAll("#qPanel [data-br]").forEach(i => { br[i.dataset.br] = i.value.trim(); });
      await api("/org/settings", {body: {branding: br}}); await loadOrg(); toast(t("Branding saved")); return render();
    }
    if (act === "saveest") {
      const est = {};
      document.querySelectorAll("#qPanel [data-est]").forEach(i => { const k = i.dataset.est; est[k] = k === "method" ? i.value : k === "laborRate" ? (i.value === "" ? null : +i.value) : pctOut(i.value); });
      await api("/org/settings", {body: {estimating: est}}); await loadOrg(); toast(t("Company settings saved")); return render();
    }
    if (act === "audit") { S.audit = await api("/org/audit"); return render(); }
    if (act === "toolcode") { const r = await api("/auth/toolcode", {body: {}}); S.toolCode = r.code; render(); setTimeout(() => { if (S.toolCode === r.code) { S.toolCode = null; if (S.open && S.tab === "team") render(); } }, 10 * 60e3); return; }
    if (act === "toolrevoke") { if (!confirm(t("Disconnect PLAN TAKEOFF from this account?"))) return; await api("/auth/toolrevoke", {body: {}}); S.toolCode = null; toast(t("PLAN TAKEOFF disconnected")); return render(); }
    if (act === "hostdisconnect") { if (!confirm(t("Disconnect from TerraTakeoff? You can connect again with a new code."))) return; await close(); return HOST.disconnect(); }
  } catch (err) { fail(err); }
}
function onInput(e) {
  const el = e.target;
  if (el.dataset.rp && el.tagName !== "INPUT" || el.dataset.rp && el.type !== "checkbox") { S.report[el.dataset.rp] = el.value; S.cmp.data.report = Object.assign({}, S.cmp.data.report, {[el.dataset.rp]: el.value}); touch(); }
}
async function onChange(e) {
  const el = e.target, d = S.cmp && S.cmp.data;
  try {
    if (el.dataset.actChange === "loadprofile") {
      if (el.value === "__company") Object.assign(d.pricing, clean(S.org.settings.estimating));
      else { const p = (S.profiles || []).find(x => x.id === el.value); if (p) Object.assign(d.pricing, clean(p.data)); }
      touch("Pricing profile"); return render();
    }
    if (el.dataset.actChange === "loadtemplate") { const p = (S.profiles || []).find(x => x.id === el.value); if (p) { Object.assign(S.report, p.data); d.report = Object.assign({}, p.data); touch(); render(); } return; }
    if (el.dataset.role) { await api("/org/role", {body: {userId: el.dataset.role, role: el.value}}); await loadOrg(); return render(); }
    if (!d) return;
    if (el.dataset.cmpname != null) { d.name = el.value.trim().slice(0, 200) || d.name; touch("Renamed"); await flush(); await loadList(); return; }
    if (el.dataset.qf != null) {
      const q = d.quotes[+el.dataset.q], f = el.dataset.qf;
      if (f === "exclusions") q.exclusions = el.value.split("\n").map(s => s.trim()).filter(Boolean);
      else if (f === "allowances") q.allowances = el.value.split("\n").map(s => s.trim()).filter(Boolean).map(s => { const m = /^(.*?)[:\-–]\s*\$?([\d,]+(?:\.\d+)?)\s*$/.exec(s); return m ? {desc: m[1].trim(), amount: E.numIn(m[2])} : {desc: s, amount: null}; });
      else q[f] = el.value.trim();
      touch("Edited " + (q.supplier || "a quote")); if (f === "supplier") render(); return;
    }
    if (el.dataset.st) { const q = d.quotes[+el.dataset.q]; q.stated = q.stated || {}; const v = E.numIn(el.value); if (v == null) delete q.stated[el.dataset.st]; else q.stated[el.dataset.st] = v; q.unverified = (q.unverified || []).filter(x => x !== el.dataset.st); touch("Edited totals"); return render(); }
    if (el.dataset.i != null && el.dataset.f) {
      const q = d.quotes[+el.dataset.q], it = q.items.find(i => i.id === el.dataset.i), f = el.dataset.f;
      if (el.type === "checkbox") it[f] = el.checked;
      else if (["qty", "unitPrice", "total"].includes(f)) {
        const v = E.numIn(el.value);
        if (el.value.trim() !== "" && v == null) { toast(t("That isn't a number")); el.value = num2(it[f]); return; }
        it[f] = v; const nm = {qty: "quantity", unitPrice: "unit price", total: "total"}[f]; it.unverified = (it.unverified || []).filter(x => x !== nm);
      } else it[f] = el.value.trim();
      it.edited = true; touch("Corrected lines"); return render();
    }
    if (el.dataset.g) {
      const g = d.groups.find(x => x.id === el.dataset.g);
      if (el.dataset.gf === "label") { g.label = el.value.trim() || g.label; g.labelEdited = true; touch("Renamed a line"); return; }
      if (el.dataset.gf === "takeoff") { const x = takeoffList().find(t => t.key === el.value) || (g.takeoff && g.takeoff.key === el.value ? g.takeoff : null); g.takeoff = x ? {key: x.key, label: x.label, qty: x.qty, unit: x.unit} : null; touch("Linked to the takeoff"); return render(); }
      if (el.dataset.gf === "merge") { const o = d.groups.find(x => x.id === el.value); if (o) { Object.assign(g.members, o.members); d.groups = d.groups.filter(x => x !== o); g.ai = false; touch("Merged lines"); } return render(); }
    }
    if (el.dataset.flag) { if (el.checked) d.resolved[el.dataset.flag] = true; else delete d.resolved[el.dataset.flag]; touch("Checked differences"); return render(); }
    if (el.dataset.ve != null) {
      const p = d.ve[+el.dataset.ve];
      if (el.dataset.side) { p[el.dataset.side] = p[el.dataset.side] || {}; p[el.dataset.side][el.dataset.k] = E.numIn(el.value) || 0; }
      else p[el.dataset.k] = el.value.trim();
      touch("Value engineering"); return render();
    }
    if (el.dataset.pr) {
      const k = el.dataset.pr;
      if (k === "method") d.pricing.method = el.value;
      else if (k.startsWith("by:")) { d.pricing.byKind = d.pricing.byKind || {}; d.pricing.byKind[k.slice(3)] = pctOut(el.value); }
      else d.pricing[k] = pctOut(el.value) || 0;
      touch("Pricing"); return render();
    }
    if (el.dataset.rp && el.type === "checkbox") { S.report[el.dataset.rp] = el.checked; d.report = Object.assign({}, d.report, {[el.dataset.rp]: el.checked}); touch(); return; }
  } catch (err) { fail(err); }
}
const clean = p => { p = p || {}; const o = {}; for (const k of ["method", "markup", "margin", "overhead"]) if (p[k] != null) o[k] = p[k]; if (p.byKind) o.byKind = Object.assign({}, p.byKind); return o; };

// ================= reports =================
async function report(kind, fmt) {
  if (S.usage && S.usage.tier === "trial") { toast(t("During the free trial you can see everything on screen. Downloading reports comes with a plan."), 6000); return; }
  if (kind === "client" && S.report.showCosts && !confirm(t("This client report will show your internal costs, markup and margin. Continue?"))) return;
  await flush();
  const R = buildReport(kind);
  busy(true, "Building the report…");
  try {
    const name = slug((S.cmp.data.name || "quotes") + "-" + R.file);
    if (fmt === "xlsx") {
      const r = await api("/quotes/xlsx", {body: {name: R.title, sheets: R.sheets}, raw: true});
      downloadBlob(await r.blob(), name + ".xlsx");
    } else downloadBlob(new Blob([await pdfReport(R)], {type: "application/pdf"}), name + ".pdf");
    api("/quotes/cmp/" + S.cmp.id + "/exported", {body: {what: kind + " " + fmt}}).catch(() => {});
    toast(t("Report downloaded"));
  } catch (e) { fail(e); } finally { busy(false); }
}
// one report as tables, used for both the PDF and the Excel file
function buildReport(kind) {
  const d = S.cmp.data, an = analysis(), quotes = d.quotes, M = c => ({v: c == null ? null : c / 100, f: "money"}), Pc = f => ({v: f, f: "pct"});
  const H = s => ({v: t(s), f: "head"});
  const project = projectName || defaultProjectName() || "";
  const flagRows = an.flags.map(f => [f.sev === "scope" ? (f.resolved ? t("Checked") : t("To check")) : t("Note"), f.text]);
  if (kind === "supplier") {
    const sum = [[H("Supplier"), H("Quote #"), H("Total"), H("Common scope"), H("Lines"), H("Missing"), H("Exclusions")]].concat(quotes.map(q => {
      const s = an.sums[q.docId];
      return [q.supplier, q.ref || "", M(s.total), M(an.commonTotals[q.docId]), q.items.length, an.flags.filter(f => f.docId === q.docId && f.sev === "scope" && /missing|excluded/.test(f.type)).length, (q.exclusions || []).length];
    }));
    const lines = [[H("Item"), H("Measured")].concat(quotes.flatMap(q => [{v: q.supplier, f: "head"}, H("Qty"), H("Unit price")]))].concat(an.rows.map(r => {
      const g = r.group;
      return [g.label, g.takeoff ? num2(g.takeoff.qty) + " " + g.takeoff.unit : ""].concat(quotes.flatMap(q => {
        const c = r.cells[q.docId]; if (!c) return [t("not quoted"), "", ""];
        return [M(c.price), c.item.qty != null ? num2(c.item.qty) + " " + (c.item.unit || "") : "", c.item.unitPrice != null ? M(E.cents(c.item.unitPrice)) : ""];
      }));
    }));
    const status = quotes.length > 1 ? (an.lowest ? t("All scope differences checked. Lowest total:") + " " + supName(an.lowest) + " (" + money(an.sums[an.lowest].total) + ")"
      : t("Not comparable yet:") + " " + an.openScope + " " + t("scope differences still to check. No supplier is recommended.")) : "";
    const excl = quotes.flatMap(q => (q.exclusions || []).map(e => [q.supplier, e]));
    return {file: "supplier-comparison", title: t("Supplier comparison report"), project, status, internal: true,
      sheets: [{name: t("Summary"), cols: [28, 14, 14, 14, 8, 9, 10], rows: sum}, {name: t("Lines"), cols: [40, 14].concat(quotes.flatMap(() => [14, 12, 12])), rows: lines},
        {name: t("Differences"), cols: [12, 100], rows: [[H("Status"), H("Difference")]].concat(flagRows)}, {name: t("Exclusions"), cols: [28, 90], rows: [[H("Supplier"), H("Exclusion")]].concat(excl)}],
      pdf: [{h: t("Summary"), cols: [3, 1.4, 1.4, 1.4, .7, .8, .9], rows: sum, align: "lllrrrr"}, {text: status, strong: true},
        {h: t("Line by line"), cols: [3, 1.3].concat(quotes.map(() => 1.6)), rows: [[H("Item"), H("Measured")].concat(quotes.map(q => ({v: q.supplier, f: "head"})))].concat(an.rows.map(r => [r.group.label, r.group.takeoff ? num2(r.group.takeoff.qty) + " " + r.group.takeoff.unit : ""].concat(quotes.map(q => { const c = r.cells[q.docId]; return c ? (c.price == null ? "—" : money(c.price)) + (c.item.qty != null ? "\n" + num2(c.item.qty) + " " + (c.item.unit || "") : "") : t("not quoted"); })))), align: "ll" + "r".repeat(quotes.length)},
        {h: t("Differences found"), cols: [1, 7], rows: [[H("Status"), H("Difference")]].concat(flagRows), align: "ll"},
        excl.length ? {h: t("Exclusions"), cols: [2, 6], rows: [[H("Supplier"), H("Exclusion")]].concat(excl), align: "ll"} : null].filter(Boolean)};
  }
  if (kind === "ve") {
    const s = E.veSummary(d.ve, d.pricing);
    const rows = [[H("Item"), H("Original"), H("Alternative"), H("Material savings"), H("Labor difference"), H("Equip. + freight difference"), H("Savings"), H("Savings %")]].concat(s.rows.map(r =>
      [r.label + (r.note ? " — " + r.note : ""), M(r.orig.total), M(r.alt.total), M(r.materialSavings), M(r.laborDiff), M(r.equipFreightDiff), M(r.savings), Pc(r.savingsPct)]));
    rows.push([{v: t("Total"), f: "bold"}, M(s.orig.total), M(s.alt.total), M(s.orig.material - s.alt.material), M(s.alt.labor - s.orig.labor), M((s.alt.equipment + s.alt.freight) - (s.orig.equipment + s.orig.freight)), M(s.savings), Pc(s.savingsPct)]);
    const pr = [[H(""), H("Original"), H("Alternative")], [t("Total cost"), M(s.origPrice.cost), M(s.altPrice.cost)], [t("Selling price"), M(s.origPrice.sell), M(s.altPrice.sell)], [t("Gross profit"), M(s.origPrice.profit), M(s.altPrice.profit)], [t("Gross margin"), Pc(s.origPrice.margin), Pc(s.altPrice.margin)], [t("Markup"), Pc(s.origPrice.markup), Pc(s.altPrice.markup)]];
    const detail = [[H("Item"), H("Side"), H("Material"), H("Labor"), H("Equipment"), H("Freight"), H("Total")]].concat(s.rows.flatMap(r => [[r.label, t("Original"), M(r.orig.material), M(r.orig.labor), M(r.orig.equipment), M(r.orig.freight), M(r.orig.total)], ["", t("Alternative"), M(r.alt.material), M(r.alt.labor), M(r.alt.equipment), M(r.alt.freight), M(r.alt.total)]]));
    return {file: "value-engineering", title: t("Value engineering report"), project, internal: true,
      sheets: [{name: t("Value engineering"), cols: [44, 14, 14, 14, 14, 14, 14, 10], rows}, {name: t("Detail"), cols: [44, 12, 14, 14, 14, 14, 14], rows: detail}, {name: t("Pricing"), cols: [22, 16, 16], rows: pr}],
      pdf: [{h: t("Original against alternative"), cols: [3.4, 1.2, 1.2, 1.2, 1.2, 1.3, 1.2, .9], rows, align: "lrrrrrrr"}, {h: t("Detail"), cols: [3.4, 1.1, 1.2, 1.2, 1.2, 1.2, 1.2], rows: detail, align: "llrrrrr"}, {h: t("Effect on the selling price"), cols: [2, 1.4, 1.4], rows: pr, align: "lrr"}]};
  }
  const costs = E.chosenCosts(d, an), res = E.priceJob(costs, d.pricing);
  if (kind === "profit") {
    const kinds = [["material", "Material"], ["labor", "Labor"], ["equipment", "Equipment"], ["other", "Other"], ["allowance", "Allowances"], ["freight", "Freight / delivery"], ["tax", "Tax"], ["discount", "Discounts"]];
    const pr = d.pricing;
    const sum = [[H(""), H("Amount")]].concat(kinds.filter(([k]) => costs[k]).map(([k, l]) => [t(l), M(costs[k])]),
      [[{v: t("Direct cost"), f: "bold"}, M(res.direct)], [t("Overhead") + " (" + E.fmtPct(pr.overhead || 0) + ")", M(res.overhead)], [{v: t("Total cost"), f: "bold"}, M(res.cost)],
       [t(pr.method === "margin" ? "Target gross margin" : "Markup"), Pc(pr.method === "margin" ? pr.margin : pr.markup)], [{v: t("Selling price"), f: "bold"}, M(res.sell)], [t("Gross profit"), M(res.profit)],
       [t("Gross margin (profit ÷ selling price)"), Pc(res.margin)], [t("Markup (profit ÷ total cost)"), Pc(res.markup)]]);
    const lines = [[H("Item"), H("Supplier"), H("Kind"), H("Qty"), H("Cost"), H("Share of cost")]].concat(costs.lines.map(l => [l.label, supName(l.docId), t(l.kind), l.qty != null ? num2(l.qty) + " " + (l.unit || "") : "", M(l.price), Pc(E.pct(l.price, res.direct))]));
    return {file: "internal-profitability", title: t("Internal cost and profitability report"), project, internal: true,
      sheets: [{name: t("Profitability"), cols: [40, 16], rows: sum}, {name: t("Lines"), cols: [40, 24, 12, 14, 14, 12], rows: lines}],
      pdf: [{h: t("Cost, markup and margin"), cols: [3, 1.4], rows: sum, align: "lr"}, {h: t("Chosen supplier per line"), cols: [3, 2, 1, 1.2, 1.2, 1], rows: lines, align: "lllrrr"}]};
  }
  // client-facing: selling prices only (spread over the lines in proportion to their cost; the cents add up exactly)
  const R = S.report;
  const lines = costs.lines.slice();
  if (!R.fold) { if (costs.freight) lines.push({label: t("Delivery"), price: costs.freight, kind: "freight"}); if (costs.tax) lines.push({label: t("Sales tax"), price: costs.tax, kind: "tax"}); if (costs.discount) lines.push({label: t("Discount"), price: costs.discount, kind: "discount"}); }
  const base = lines.reduce((a, l) => a + l.price, 0), sell = res.sell == null ? base : res.sell;
  const exact = [], raw = lines.map(l => (base ? l.price * sell / base : 0));
  let rest = sell; raw.forEach((v, i) => { exact[i] = Math.floor(v); rest -= exact[i]; });
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, Math.max(0, rest)).forEach(([, i]) => exact[i]++);
  const head = [H("Item")].concat(R.showSuppliers ? [H("Supplier")] : [], R.showUnit !== false ? [H("Qty"), H("Unit price")] : [], [H("Amount")], R.showCosts ? [H("Cost"), H("Margin")] : []);
  const rows = [head].concat(lines.map((l, i) => [l.label].concat(R.showSuppliers ? [l.docId ? supName(l.docId) : ""] : [],
    R.showUnit !== false ? [l.qty != null ? num2(l.qty) + " " + (l.unit || "") : "", l.qty ? M(Math.round(exact[i] / l.qty)) : ""] : [], [M(exact[i])], R.showCosts ? [M(l.price), Pc(E.pct(exact[i] - l.price, exact[i]))] : [])));
  rows.push([{v: t("Total"), f: "bold"}].concat(R.showSuppliers ? [""] : [], R.showUnit !== false ? ["", ""] : [], [{v: sell / 100, f: "moneyBold"}], R.showCosts ? [M(res.cost), Pc(res.margin)] : []));
  const cols = [4].concat(R.showSuppliers ? [2] : [], R.showUnit !== false ? [1.3, 1.3] : [], [1.4], R.showCosts ? [1.3, 1] : []);
  return {file: "proposal", title: R.title || t("Proposal"), project, internal: false, intro: R.intro, terms: R.terms,
    sheets: [{name: t("Proposal"), cols: cols.map(c => c * 11), rows}],
    pdf: [R.intro ? {text: R.intro} : null, R.showUnit !== false ? {text: t("Unit prices are rounded to the cent; line amounts are exact.")} : null, {h: "", cols, rows, align: "l" + (R.showSuppliers ? "l" : "") + (R.showUnit !== false ? "rr" : "") + "r" + (R.showCosts ? "rr" : "")}, R.terms ? {h: t("Terms and notes"), text: R.terms} : null].filter(Boolean)};
}
// WinAnsi (the standard PDF fonts) has no − → ✓ etc.: swap them for plain characters
const WIN = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const pdfSafe = s => String(s == null ? "" : s).replace(/−/g, "-").replace(/[→⇒]/g, "->").replace(/✓|✔/g, "OK").replace(/[⚠︎✕✨]/g, "").replace(/[“”]/g, '"').replace(/ /g, " ")
  .replace(/./gu, ch => (ch.charCodeAt(0) < 256 || WIN.includes(ch) ? ch : "?"));
async function pdfReport(R) {
  const L = await loadPdfLib();
  const doc = await L.PDFDocument.create(), F = await doc.embedFont(L.StandardFonts.Helvetica), B = await doc.embedFont(L.StandardFonts.HelveticaBold);
  const brand = feat("branding") && S.org && S.org.settings && S.org.settings.branding || (feat("branding") ? await api("/org").then(o => { S.org = o; return o.settings.branding; }).catch(() => null) : null);
  let logo = null;
  if (brand && brand.logo) try { const bytes = Uint8Array.from(atob(brand.logo.split(",")[1]), c => c.charCodeAt(0)); logo = /png/.test(brand.logo.slice(0, 20)) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes); } catch (e) {}
  const W = 792, Hh = 612, M = 36, green = L.rgb(0.12, 0.54, 0.3), grey = L.rgb(0.42, 0.43, 0.46), ink = L.rgb(0.1, 0.1, 0.12), line = L.rgb(0.85, 0.86, 0.88), band = L.rgb(0.93, 0.96, 0.94);
  let page, y;
  const fmtCell = c => { if (c && typeof c === "object") { if (c.f === "money" || c.f === "moneyBold") return c.v == null ? "—" : money(Math.round(c.v * 100)); if (c.f === "pct") return E.fmtPct(c.v); return String(c.v == null ? "" : c.v); } return c == null ? "" : String(c); };
  const wrap = (txt, font, size, width) => {
    const out = [];
    for (const para of pdfSafe(txt).split("\n")) {
      let cur = "";
      for (const w of para.split(/\s+/)) {
        const tryS = cur ? cur + " " + w : w;
        if (font.widthOfTextAtSize(tryS, size) <= width) cur = tryS;
        else { if (cur) out.push(cur); cur = w; while (font.widthOfTextAtSize(cur, size) > width && cur.length > 1) { let k = cur.length - 1; while (k > 1 && font.widthOfTextAtSize(cur.slice(0, k), size) > width) k--; out.push(cur.slice(0, k)); cur = cur.slice(k); } }
      }
      out.push(cur);
    }
    return out;
  };
  const newPage = () => {
    page = doc.addPage([W, Hh]); y = Hh - M;
    let x = M;
    if (logo) { const s = Math.min(120 / logo.width, 36 / logo.height); page.drawImage(logo, {x, y: y - logo.height * s, width: logo.width * s, height: logo.height * s}); x += logo.width * s + 12; }
    const who = brand && brand.company ? brand.company : "TerraTakeoff";
    page.drawText(pdfSafe(who), {x, y: y - 14, size: 13, font: B, color: brand && brand.company ? ink : green});
    const contact = brand ? [brand.address, brand.phone, brand.email, brand.web].filter(Boolean).join("  ·  ") : "";
    if (contact) page.drawText(pdfSafe(contact).slice(0, 140), {x, y: y - 28, size: 8.5, font: F, color: grey});
    const right = pdfSafe(R.title), rw = B.widthOfTextAtSize(right, 13);
    page.drawText(right, {x: W - M - rw, y: y - 14, size: 13, font: B, color: ink});
    const sub = pdfSafe([R.project, new Date().toLocaleDateString(es() ? "es-US" : "en-US", {year: "numeric", month: "long", day: "numeric"})].filter(Boolean).join("  ·  ")), sw = F.widthOfTextAtSize(sub, 9);
    page.drawText(sub, {x: W - M - sw, y: y - 28, size: 9, font: F, color: grey});
    y -= 44; page.drawLine({start: {x: M, y}, end: {x: W - M, y}, thickness: 1, color: line}); y -= 14;
  };
  const need = hgt => { if (y - hgt < M + 24) newPage(); };
  newPage();
  for (const sec of R.pdf) {
    if (sec.h) { need(40); page.drawText(pdfSafe(sec.h), {x: M, y: y - 11, size: 11.5, font: B, color: ink}); y -= 20; }
    if (sec.text && !sec.rows) {
      for (const l of wrap(sec.text, sec.strong ? B : F, 9.5, W - 2 * M)) { need(14); page.drawText(l, {x: M, y: y - 10, size: 9.5, font: sec.strong ? B : F, color: ink}); y -= 13; }
      y -= 8; continue;
    }
    if (!sec.rows) continue;
    const total = sec.cols.reduce((a, b) => a + b, 0), cw = sec.cols.map(c => c / total * (W - 2 * M));
    const drawRow = (row, head) => {
      const cells = row.map((c, i) => wrap(fmtCell(c), head || (c && (c.f === "bold" || c.f === "moneyBold")) ? B : F, 8.5, cw[i] - 8));
      const hgt = Math.max(...cells.map(c => c.length)) * 11 + 6;
      need(hgt);
      if (head) page.drawRectangle({x: M, y: y - hgt, width: W - 2 * M, height: hgt, color: band});
      let x = M;
      cells.forEach((ls, i) => {
        const right = (sec.align || "")[i] === "r";
        ls.forEach((l, k) => { const f = head || (row[i] && (row[i].f === "bold" || row[i].f === "moneyBold")) ? B : F; const w = f.widthOfTextAtSize(l, 8.5); page.drawText(l, {x: right ? x + cw[i] - 4 - w : x + 4, y: y - 11 - k * 11, size: 8.5, font: f, color: ink}); });
        x += cw[i];
      });
      y -= hgt; page.drawLine({start: {x: M, y}, end: {x: W - M, y}, thickness: .5, color: line});
    };
    const [head, ...body] = sec.rows;
    drawRow(head, true);
    for (const r of body) { if (y - 20 < M + 24) { newPage(); drawRow(head, true); } drawRow(r, false); }
    y -= 14;
  }
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    const foot = pdfSafe((R.internal ? (es() ? "Interno — no compartir con el cliente  ·  " : "Internal — not for the client  ·  ") : "") + (es() ? "Página " : "Page ") + (i + 1) + (es() ? " de " : " of ") + pages.length + (feat("branding") && brand && brand.company ? "" : "  ·  " + (es() ? "Hecho con TerraTakeoff" : "Prepared with TerraTakeoff")));
    pg.drawText(foot, {x: M, y: 20, size: 8, font: F, color: grey});
    if (R.internal) { const n = es() ? "Los números vienen de las cotizaciones tal como se revisaron; verifícalos antes de usarlos." : "Figures come from the quotes as reviewed; check them before relying on them."; pg.drawText(pdfSafe(n), {x: W - M - F.widthOfTextAtSize(pdfSafe(n), 8), y: 20, size: 8, font: F, color: grey}); }
  });
  return await doc.save();
}

// ================= hooks into the app =================
window.ttQuotes = {open, close};
// a link to join a team: …/app/?invite=<token> — kept until the person is signed in
if (HOST.name === "terratakeoff") (function invites() {
  try {
    const q = new URLSearchParams(location.search).get("invite");
    if (q) { localStorage.setItem("tt.invite", JSON.stringify({t: q, at: Date.now()})); const u = new URL(location.href); u.searchParams.delete("invite"); history.replaceState(null, "", u.toString()); }
  } catch (e) {}
  const tryJoin = async () => {
    let inv = null; try { inv = JSON.parse(localStorage.getItem("tt.invite") || "null"); } catch (e) {}
    if (!inv || !HOST.me() || Date.now() - inv.at > 14 * 864e5) return;
    try {
      const r = await api("/org/accept", {body: {token: inv.t}});
      localStorage.removeItem("tt.invite");
      await HOST.refreshAccount();
      toast((es() ? "Te uniste al equipo como " : "You joined the team as ") + t(r.role) + (es() ? " — ya tienes su plan." : " — you now have the team's plan."), 7000);
    } catch (e) {
      if (e.status === 403 || e.status === 400 || e.status === 402) { localStorage.removeItem("tt.invite"); toast(t(e.message), 9000); }
    }
  };
  const iv = setInterval(() => { if (HOST.me()) { clearInterval(iv); setTimeout(tryJoin, 1500); } }, 1000);
})();
