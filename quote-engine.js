// TerraTakeoff quote comparison engine — plain, deterministic code shared by the app (browser) and the worker.
// No AI here: the AI only reads documents and suggests which lines are the same item. Every number on screen and in
// reports — differences, savings, markup, margin, selling price — is worked out by this file, in whole cents.
//
// A comparison: {quotes:[quote], groups:[group], resolved:{flagKey:true}, ve:[pair], pricing:{…}}
//   quote = {docId, fileName, supplier, ref, date, items:[item], exclusions:[text], allowances:[{desc, amount}],
//            stated:{subtotal, freight, tax, discount, total}}
//   item  = {id, desc, qty, unit, unitPrice, total, kind, optional, alternate, altOf, spec, page, unverified:[field]}
//           kind: material | labor | equipment | freight | tax | discount | allowance | other
//   group = {id, label, members:{docId:itemId}, takeoff:{key,label,qty,unit}|null, choice:docId|null}

// ---------------- money: whole cents, so 0.1 + 0.2 never shows up as 0.30000000004 ----------------
export const cents = v => (v == null || v === "" || !isFinite(+v)) ? null : Math.round(+v * 100);
export const dollars = c => c == null ? null : c / 100;
export function fmtMoney(c, cur) {
  if (c == null) return "—";
  const neg = c < 0, a = Math.abs(c);
  const s = (Math.floor(a / 100)).toLocaleString("en-US") + "." + String(a % 100).padStart(2, "0");
  return (neg ? "−" : "") + (cur || "$") + s;
}
export const pct = (num, den) => (den ? num / den : null);   // a fraction (0.125 = 12.5 %), null when there's nothing to divide by
export function fmtPct(f, d) { return f == null || !isFinite(f) ? "—" : (f * 100).toFixed(d == null ? 1 : d) + "%"; }

// ---------------- units ----------------
// each unit: [what it measures, how many base units one of it is]  (base: LF, SF, CY, TON, EA, GAL, HR, LB …)
const UNITS = {
  lf: ["len", 1], ft: ["len", 1], feet: ["len", 1], foot: ["len", 1], "lin ft": ["len", 1], "linear ft": ["len", 1], "linear feet": ["len", 1], "l.f.": ["len", 1],
  in: ["len", 1 / 12], inch: ["len", 1 / 12], inches: ["len", 1 / 12], yd: ["len", 3], m: ["len", 3.280839895], meter: ["len", 3.280839895], lm: ["len", 3.280839895],
  sf: ["area", 1], sqft: ["area", 1], "sq ft": ["area", 1], "square feet": ["area", 1], "s.f.": ["area", 1], ft2: ["area", 1],
  sy: ["area", 9], sqyd: ["area", 9], "sq yd": ["area", 9], "s.y.": ["area", 9], m2: ["area", 10.7639104], "sq m": ["area", 10.7639104], acre: ["area", 43560], ac: ["area", 43560],
  sq: ["area", 100],
  cy: ["vol", 1], yd3: ["vol", 1], "cu yd": ["vol", 1], "cubic yard": ["vol", 1], "cubic yards": ["vol", 1], "c.y.": ["vol", 1], yard: ["vol", 1], yards: ["vol", 1], yds: ["vol", 1],
  cf: ["vol", 1 / 27], "cu ft": ["vol", 1 / 27], ft3: ["vol", 1 / 27], m3: ["vol", 1.307950619],
  ton: ["wt", 1], tons: ["wt", 1], tn: ["wt", 1], t: ["wt", 1], lb: ["wt", 1 / 2000], lbs: ["wt", 1 / 2000], kg: ["wt", 1 / 907.18474], "metric ton": ["wt", 1.10231131],
  ea: ["ea", 1], each: ["ea", 1], pc: ["ea", 1], pcs: ["ea", 1], piece: ["ea", 1], pieces: ["ea", 1], unit: ["ea", 1], units: ["ea", 1], no: ["ea", 1], qty: ["ea", 1], ct: ["ea", 1],
  bag: ["bag", 1], bags: ["bag", 1], bg: ["bag", 1], pallet: ["pal", 1], pallets: ["pal", 1], plt: ["pal", 1], pal: ["pal", 1], roll: ["roll", 1], rolls: ["roll", 1],
  gal: ["gal", 1], gallon: ["gal", 1], gallons: ["gal", 1], hr: ["hr", 1], hrs: ["hr", 1], hour: ["hr", 1], hours: ["hr", 1], mh: ["hr", 1], day: ["day", 1], days: ["day", 1],
  ls: ["ls", 1], "lump sum": ["ls", 1], lot: ["ls", 1], job: ["ls", 1], load: ["load", 1], loads: ["load", 1], box: ["box", 1], bundle: ["bdl", 1], bdl: ["bdl", 1], sheet: ["sheet", 1], sheets: ["sheet", 1],
};
const SHORT = {len: "LF", area: "SF", vol: "CY", wt: "TON", ea: "EA", bag: "BAG", pal: "PALLET", roll: "ROLL", gal: "GAL", hr: "HR", day: "DAY", ls: "LS", load: "LOAD", box: "BOX", bdl: "BUNDLE", sheet: "SHEET"};
export function unitInfo(u) {
  if (u == null) return null;
  const k = String(u).toLowerCase().replace(/[()]/g, "").replace(/\.$/, "").replace(/\s+/g, " ").trim();
  const hit = UNITS[k] || UNITS[k.replace(/\./g, "")] || UNITS[k.replace(/s$/, "")];
  return hit ? {dim: hit[0], f: hit[1], base: SHORT[hit[0]]} : null;
}
// qty in the unit's base (LF, SF, CY, TON …), or null if the unit isn't known
export function baseQty(qty, unit) { const i = unitInfo(unit); return i && qty != null ? qty * i.f : null; }
export function sameDim(a, b) { const x = unitInfo(a), y = unitInfo(b); return !!(x && y && x.dim === y.dim); }

// ---------------- reading descriptions ----------------
const ABBR = {"ea": "each", "w/": "with", "w/o": "without", "galv": "galvanized", "pt": "pressure treated", "ptd": "pressure treated", "conc": "concrete",
  "agg": "aggregate", "crshd": "crushed", "crsh": "crushed", "stn": "stone", "blk": "block", "reinf": "reinforced", "alum": "aluminum", "blk.": "black",
  "pvc": "pvc", "hdpe": "hdpe", "sch": "schedule", "dia": "diameter", "ht": "height", "lg": "long", "wd": "wide", "thk": "thick", "gr": "grade", "std": "standard"};
const STOP = new Set(["the", "a", "an", "of", "for", "and", "to", "with", "per", "in", "on", "at", "by", "or", "as", "is", "be", "x", "supply", "supplied", "provide", "furnish", "deliver", "delivered", "material", "materials", "item", "qty"]);
export function dimsOf(s) {   // the sizes in a description: 4"x8", 3/4", 2x4, 6 ft, #57 — numbers only, so 1/8" x 4" and 1/8 x 4 are the same size
  let t = String(s || "").toLowerCase().replace(/[″”]/g, '"').replace(/[′’]/g, "'");
  const out = new Set();
  const N = "(\\d+(?:\\.\\d+)?(?:\\s*-?\\s*\\d+\\/\\d+|\\/\\d+)?)", U = "\\s*(?:\"|'|inch(?:es)?\\b|in\\b|ft\\b|feet\\b|mm\\b|cm\\b|m\\b)?";
  const clean = x => x.replace(/\s+/g, "").replace(/^(\d+)-(\d+\/\d+)$/, "$1-$2");
  t = t.replace(new RegExp(N + U + "\\s*[x×]\\s*" + N + U + "(?:\\s*[x×]\\s*" + N + U + ")?", "g"), (m, a, b, c) => { out.add([a, b, c].filter(Boolean).map(clean).join("x")); return " "; });
  for (const m of t.matchAll(new RegExp(N + "\\s*(\"|'|-?inch(?:es)?\\b|-?in\\b|mm\\b|cm\\b|ft\\b|gauge\\b|ga\\b|mil\\b|psi\\b|lb\\b|oz\\b)", "g")))
    out.add(clean(m[1]) + m[2].replace(/^-/, "").replace(/^inch(es)?$|^in$/, '"').replace("gauge", "ga"));
  for (const m of t.matchAll(/#\s?(\d+)/g)) out.add("#" + m[1]);
  return out;
}
export function wordsOf(s) {
  let t = String(s || "").toLowerCase().replace(/[″”"]/g, " in ").replace(/[′’']/g, " ft ").replace(/&/g, " and ");
  t = t.replace(/[^a-z0-9#/.\- ]+/g, " ");
  const out = [];
  for (let w of t.split(/\s+/)) {
    w = w.replace(/^[.\-/]+|[.\-/]+$/g, "");
    if (!w || STOP.has(w)) continue;
    if (ABBR[w]) { for (const x of ABBR[w].split(" ")) out.push(x); continue; }
    if (/^\d/.test(w) && !/^\d+[a-z]+$/.test(w)) continue;   // sizes are compared separately (dimsOf)
    if (w.length > 3 && w.endsWith("es") && !w.endsWith("ses")) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    out.push(w);
  }
  return out;
}
// how alike two item descriptions are, 0 … 1 (word overlap, plus or minus for matching or clashing sizes)
export function similarity(a, b) {
  const A = new Set(wordsOf(a)), B = new Set(wordsOf(b));
  if (!A.size || !B.size) return 0;
  let both = 0; for (const w of A) if (B.has(w)) both++;
  let s = both / (A.size + B.size - both);
  const containment = both / Math.min(A.size, B.size);   // "topsoil" vs "screened topsoil, delivered"
  s = Math.max(s, containment * 0.85);
  const da = dimsOf(a), db = dimsOf(b);
  if (da.size && db.size) {
    let same = 0; for (const d of da) if (db.has(d)) same++;
    s = same ? s + 0.15 : Math.min(s * 0.5, 0.45);   // 4" pipe and 6" pipe are different items, however alike the words
  }
  return Math.max(0, Math.min(1, s));
}

// ---------------- grouping the same item across suppliers (the deterministic first pass) ----------------
const PRICED = k => !["freight", "tax", "discount"].includes(k || "material");
export function autoGroup(quotes, threshold) {
  const th = threshold == null ? 0.5 : threshold;
  const groups = [];
  let n = 0;
  for (const q of quotes) {
    const taken = new Set();
    for (const it of q.items || []) {
      if (!PRICED(it.kind)) continue;
      let best = null, bs = th;
      for (const g of groups) {
        if (g.members[q.docId] != null || taken.has(g.id)) continue;
        const rep = g._rep;
        let s = similarity(it.desc, rep.desc);
        if (it.unit && rep.unit && unitInfo(it.unit) && unitInfo(rep.unit) && !sameDim(it.unit, rep.unit)) s -= 0.15;   // CY vs TON can still be the same item
        if (s > bs) { bs = s; best = g; }
      }
      if (best) { best.members[q.docId] = it.id; taken.add(best.id); best.score = Math.min(best.score, bs); }
      else groups.push({id: "g" + (++n), label: it.desc, members: {[q.docId]: it.id}, takeoff: null, choice: null, score: 1, _rep: it});
    }
  }
  for (const g of groups) delete g._rep;
  return groups;
}
// apply merges suggested by the AI: [[groupId, groupId…]] — refused if two lines of one supplier would end up together
export function mergeGroups(groups, merges) {
  const byId = new Map(groups.map(g => [g.id, g]));
  let merged = 0;
  for (const ids of merges || []) {
    const gs = [...new Set(ids)].map(id => byId.get(id)).filter(Boolean);
    if (gs.length < 2) continue;
    const docs = new Set(); let clash = false;
    for (const g of gs) for (const d of Object.keys(g.members)) { if (docs.has(d)) clash = true; docs.add(d); }
    if (clash) continue;
    const keep = gs[0];
    for (const g of gs.slice(1)) { Object.assign(keep.members, g.members); byId.delete(g.id); merged++; }
    keep.score = 0.6; keep.ai = true;
  }
  return {groups: groups.filter(g => byId.has(g.id)), merged};
}

// ---------------- reading one supplier's line ----------------
export function itemOf(cmp, docId, itemId) {
  const q = cmp.quotes.find(x => x.docId === docId);
  return q ? (q.items || []).find(i => i.id === itemId) || null : null;
}
// the line's price in cents: its stated total, or qty × unit price when only those are stated (marked computed)
export function linePrice(it) {
  if (!it) return {c: null};
  if (it.total != null && it.total !== "") return {c: cents(it.total)};
  if (it.qty != null && it.unitPrice != null && it.qty !== "" && it.unitPrice !== "") return {c: Math.round(+it.qty * +it.unitPrice * 100), computed: true};
  return {c: null};
}
export function quoteSums(q) {   // one supplier: lines by kind, the charges, and the stated total checked against the lines
  const s = {material: 0, labor: 0, equipment: 0, other: 0, allowance: 0, freight: 0, tax: 0, discount: 0, optional: 0, unpriced: 0, lines: 0};
  for (const it of q.items || []) {
    const p = linePrice(it).c;
    if (p == null) { if (PRICED(it.kind)) s.unpriced++; continue; }
    if (it.optional || it.alternate) { s.optional += p; continue; }   // options and alternates aren't in the base price
    const k = it.kind === "discount" ? "discount" : s[it.kind] != null ? it.kind : "other";
    s[k] += k === "discount" ? -Math.abs(p) : p;
    if (PRICED(it.kind)) s.lines += p;
  }
  const st = q.stated || {};
  if (st.freight != null && !s.freight) s.freight = cents(st.freight);
  if (st.tax != null && !s.tax) s.tax = cents(st.tax);
  if (st.discount != null && !s.discount) s.discount = -Math.abs(cents(st.discount));
  s.computedTotal = s.material + s.labor + s.equipment + s.other + s.allowance + s.freight + s.tax + s.discount;
  s.statedTotal = st.total != null ? cents(st.total) : null;
  s.total = s.statedTotal != null ? s.statedTotal : s.computedTotal;
  s.totalMismatch = s.statedTotal != null && Math.abs(s.statedTotal - s.computedTotal) > Math.max(100, Math.abs(s.statedTotal) * 0.005);
  return s;
}

// ---------------- the analysis: what's different, what's missing, what can be compared ----------------
// opts.advanced: Pro / Team (exclusions, specs, allowances, missing freight/tax) · opts.tol: allowed qty difference (0.02 = 2 %)
export function analyze(cmp, opts) {
  opts = opts || {};
  const tol = opts.tol == null ? 0.02 : opts.tol, adv = !!opts.advanced;
  const quotes = cmp.quotes || [], groups = cmp.groups || [], resolved = cmp.resolved || {};
  const es = opts.lang === "es", L = (en, sp) => (es ? sp : en);   // messages in the app's language (opts.lang)
  const FIELD = {quantity: "cantidad", "unit price": "precio unitario", total: "total", subtotal: "subtotal", freight: "flete", tax: "impuesto", discount: "descuento", "allowance amount": "monto provisional"};
  const fields = a => (es ? a.map(f => FIELD[f] || f) : a).join(", ");
  const flags = [];
  const add = (type, sev, gid, docId, text, extra) => {
    const key = type + ":" + (gid || "") + ":" + (docId || "");
    flags.push(Object.assign({key, type, sev, gid: gid || null, docId: docId || null, text, resolved: !!resolved[key]}, extra || {}));
  };
  const name = d => { const q = quotes.find(x => x.docId === d); return q ? (q.supplier || q.fileName || "Supplier") : "Supplier"; };
  const sums = {}; for (const q of quotes) sums[q.docId] = quoteSums(q);
  const rows = [];
  for (const g of groups) {
    const cells = {};
    for (const q of quotes) {
      const id = g.members[q.docId];
      const it = id != null ? itemOf(cmp, q.docId, id) : null;
      const lp = linePrice(it);
      const bq = it ? baseQty(it.qty == null ? null : +it.qty, it.unit) : null;
      cells[q.docId] = it ? {item: it, price: lp.c, computed: !!lp.computed, baseQty: bq, unitBase: it ? (unitInfo(it.unit) || {}).base : null,
        unitPriceBase: lp.c != null && bq ? lp.c / bq : null} : null;
    }
    const present = quotes.filter(q => cells[q.docId]);
    const priced = present.filter(q => cells[q.docId].price != null && !cells[q.docId].item.optional);
    // missing: at least one supplier has it, this one doesn't
    // an item someone offers only as an option or an alternative isn't missing scope at the others — just worth knowing
    const extra = present.length && present.every(q => cells[q.docId].item.optional || cells[q.docId].item.alternate);
    if (present.length && present.length < quotes.length)
      for (const q of quotes) if (!cells[q.docId]) {
        const excl = adv && excludedBy(q, g.label);
        add(excl ? "excluded" : "missing", extra && !excl ? "info" : "scope", g.id, q.docId, excl
          ? name(q.docId) + L(" excludes “", " excluye “") + g.label + "” (" + excl + ")"
          : name(q.docId) + L(" didn't quote “", " no cotizó “") + g.label + "”" + (extra ? L(" (offered elsewhere only as an option or alternative)", " (los demás la ofrecen solo como opción o alternativa)") : ""));
      }
    for (const q of present) {
      const c = cells[q.docId], it = c.item;
      if (c.price == null && !it.optional) add("noPrice", "scope", g.id, q.docId, name(q.docId) + L(": no price for “", ": sin precio para “") + it.desc + "”");
      if (it.optional) add("optional", "info", g.id, q.docId, name(q.docId) + L(" lists “", " pone “") + it.desc + L("” as optional — not in its base price", "” como opcional — no está en su precio base"));
      if (it.alternate) add("alternate", "info", g.id, q.docId, name(q.docId) + L(" offers an alternative: “", " ofrece una alternativa: “") + it.desc + "”" + (it.altOf ? L(" instead of “", " en lugar de “") + it.altOf + "”" : ""));
      if ((it.unverified || []).length) add("unverified", "scope", g.id, q.docId, name(q.docId) + ": " + fields(it.unverified) + L(" for “", " de “") + it.desc + L("” weren't found in the document — check and enter them", "” no aparece(n) en el documento — revísalo y escríbelo"));
    }
    // quantities: suppliers against each other (in base units when the units allow it)
    const withQ = present.filter(q => cells[q.docId].baseQty != null);
    const dimsSeen = new Set(present.map(q => (unitInfo(cells[q.docId].item.unit) || {}).dim).filter(Boolean));
    if (dimsSeen.size > 1) add("unit", "scope", g.id, null, "“" + g.label + L("” is quoted in different kinds of units (", "” se cotiza en tipos de unidades distintos (") + present.map(q => name(q.docId) + ": " + (cells[q.docId].item.unit || "?")).join(", ") + L(") — they can't be compared directly", ") — no se pueden comparar directamente"));
    else if (withQ.length > 1) {
      const qs = withQ.map(q => cells[q.docId].baseQty), hi = Math.max(...qs), lo = Math.min(...qs);
      if (hi > 0 && (hi - lo) / hi > tol) {
        const base = cells[withQ[0].docId].unitBase || "";
        add("qty", "scope", g.id, null, L("Quantities differ for “", "Las cantidades no coinciden en “") + g.label + "”: " + withQ.map(q => name(q.docId) + " " + num(cells[q.docId].baseQty) + " " + base).join(" · "),
          {diff: hi - lo, unit: base});
      }
    }
    // the takeoff: what TerraTakeoff measured against what each supplier quoted
    if (g.takeoff && g.takeoff.qty != null) {
      const tq = baseQty(+g.takeoff.qty, g.takeoff.unit), tu = (unitInfo(g.takeoff.unit) || {}).base || g.takeoff.unit;
      for (const q of present) {
        const c = cells[q.docId];
        if (c.baseQty == null || tq == null) continue;
        if (!sameDim(c.item.unit, g.takeoff.unit)) { add("takeoffUnit", "scope", g.id, q.docId, name(q.docId) + L(" quotes “", " cotiza “") + g.label + L("” in ", "” en ") + (c.item.unit || "?") + L(" — measured in ", " — se midió en ") + tu + L("; convert before comparing", "; conviértelo antes de comparar")); continue; }
        const d = c.baseQty - tq;
        if (Math.abs(d) > Math.max(tq * tol, 0.01))
          add("takeoff", "scope", g.id, q.docId, name(q.docId) + L(" quotes ", " cotiza ") + num(c.baseQty) + " " + tu + L(" of “", " de “") + g.label + L("”; you measured ", "”; mediste ") + num(tq) + " " + tu +
            " — " + num(Math.abs(d)) + " " + tu + (d < 0 ? L(" short", " de menos") : L(" more", " de más")), {diff: d, unit: tu});
      }
    }
    // specifications: the sizes / grades written in each description
    if (adv && present.length > 1) {
      const sets = present.map(q => [...dimsOf(cells[q.docId].item.desc + " " + (cells[q.docId].item.spec || ""))].sort().join(" "));
      if (new Set(sets).size > 1 && sets.some(Boolean))
        add("spec", "scope", g.id, null, L("Specs differ for “", "Las especificaciones no coinciden en “") + g.label + "”: " + present.map((q, i) => name(q.docId) + " " + (sets[i] || L("no size given", "sin medida"))).join(" · "));
    }
    // prices: the spread, per base unit when possible
    let low = null, high = null;
    const comparable = priced.filter(q => cells[q.docId].unitPriceBase != null);
    const use = comparable.length === priced.length && comparable.length > 1 ? comparable.map(q => [q.docId, cells[q.docId].unitPriceBase]) : priced.map(q => [q.docId, cells[q.docId].price]);
    for (const [d, v] of use) { if (!low || v < low[1]) low = [d, v]; if (!high || v > high[1]) high = [d, v]; }
    const perUnit = use.length && comparable.length === priced.length && comparable.length > 1;
    if (low && high && low[0] !== high[0] && high[1] > 0) {
      const f = (high[1] - low[1]) / high[1];
      if (f > 0.1) add("priceDiff", "info", g.id, null, "“" + g.label + "”: " + name(low[0]) + L(" is ", " está ") + fmtPct(f, 0) + L(" lower ", " más bajo ") + (perUnit ? L("per unit", "por unidad") : L("in total", "en total")) + L(" than ", " que ") + name(high[0]));
    }
    rows.push({group: g, cells, low: low ? low[0] : null, high: high ? high[0] : null, perUnit,
      complete: priced.length === quotes.length && quotes.length > 0});
  }
  // whole quotes
  for (const q of quotes) {
    const s = sums[q.docId];
    if (s.totalMismatch) add("totalMismatch", "scope", null, q.docId, name(q.docId) + L(": the stated total ", ": el total indicado ") + fmtMoney(s.statedTotal) + L(" doesn't match its lines ", " no cuadra con sus líneas ") + fmtMoney(s.computedTotal));
    if ((q.unverified || []).length) add("unverified", "scope", null, q.docId, name(q.docId) + ": " + fields(q.unverified) + L(" weren't found in the document — check them", " no aparece(n) en el documento — revísalo"));
    if (q.scanned) add("scanned", "scope", null, q.docId, name(q.docId) + L(" was read from a scanned image — check every line and number against the original before relying on it", " se leyó de una imagen escaneada — revisa cada línea y cada número con el original antes de usarla"));
    if (adv) {
      for (const e of q.exclusions || []) add("exclusion", "scope", null, q.docId, name(q.docId) + L(" excludes: ", " excluye: ") + e);
      for (const a of q.allowances || []) add("allowance", "info", null, q.docId, name(q.docId) + L(" includes an allowance: ", " incluye una partida provisional: ") + a.desc + (a.amount != null ? " (" + fmtMoney(cents(a.amount)) + ")" : "") + L(" — the final cost may differ", " — el costo final puede variar"));
      for (const k of ["freight", "tax"]) {
        const others = quotes.filter(o => o !== q && sums[o.docId][k]);
        if (!s[k] && others.length) add("no" + k, "scope", null, q.docId, name(q.docId) + L(" shows no " + (k === "freight" ? "freight / delivery" : "tax") + " — ", " no muestra " + (k === "freight" ? "flete / entrega" : "impuesto") + " — ") + others.map(o => name(o.docId)).join(", ") + L(others.length > 1 ? " do" : " does", others.length > 1 ? " sí lo muestran" : " sí lo muestra"));
      }
    }
  }
  // apples to apples: the lines every supplier priced
  const common = rows.filter(r => r.complete);
  const commonTotals = {}; for (const q of quotes) commonTotals[q.docId] = common.reduce((a, r) => a + r.cells[q.docId].price, 0);
  const open = flags.filter(f => f.sev === "scope" && !f.resolved);
  let lowest = null;
  for (const q of quotes) if (!lowest || sums[q.docId].total < sums[lowest].total) lowest = q.docId;
  const savings = quotes.length > 1 ? Math.max(...quotes.map(q => sums[q.docId].total)) - Math.min(...quotes.map(q => sums[q.docId].total)) : 0;
  return {rows, flags, sums, commonTotals, commonLines: common.length, openScope: open.length,
    // the lowest total is only called out once every scope difference has been checked and marked resolved
    lowest: open.length ? null : lowest, lowestIfResolved: lowest, savings};
}
function excludedBy(q, label) {
  const w = new Set(wordsOf(label));
  for (const e of q.exclusions || []) {
    const ew = wordsOf(e); let hit = 0;
    for (const x of ew) if (w.has(x)) hit++;
    if (hit && hit >= Math.min(2, w.size)) return e.length > 80 ? e.slice(0, 77) + "…" : e;
  }
  return null;
}
const num = v => (Math.round(v * 100) / 100).toLocaleString("en-US");

// ---------------- what you'd buy: the chosen supplier per line, and the cost by kind ----------------
export function chosenCosts(cmp, an) {
  const out = {material: 0, labor: 0, equipment: 0, other: 0, allowance: 0, freight: 0, tax: 0, discount: 0, lines: [], suppliers: new Set(), missing: 0, extras: 0};
  for (const r of an.rows) {
    const picked = r.group.choice && r.cells[r.group.choice] ? r.group.choice : null;
    const d = picked || r.low;
    const c = d ? r.cells[d] : null;
    // options and alternatives are only in the cost when someone chooses them on purpose
    const extra = x => x && (x.item.optional || x.item.alternate);
    if (!picked && (extra(c) || (!c && Object.values(r.cells).some(extra)))) { out.extras++; continue; }
    if (!c || c.price == null) { out.missing++; continue; }
    const k = out[c.item.kind] != null && !["freight", "tax", "discount"].includes(c.item.kind) ? c.item.kind : "other";
    out[k] += c.price; out.suppliers.add(d);
    out.lines.push({gid: r.group.id, label: r.group.label, docId: d, kind: k, price: c.price, qty: c.item.qty, unit: c.item.unit});
  }
  for (const d of out.suppliers) {   // each supplier used brings its own freight, tax and discount
    const s = an.sums[d]; out.freight += s.freight; out.tax += s.tax; out.discount += s.discount;
  }
  out.suppliers = [...out.suppliers];
  return out;
}

// ---------------- pricing: markup and gross margin are two different things ----------------
// markup  = profit ÷ cost        → selling price = cost × (1 + markup)
// margin  = profit ÷ selling price → selling price = cost ÷ (1 − margin)
// pricing = {method:"markup"|"margin", markup, margin, overhead, byKind:{material, labor, equipment, freight}} — fractions
export function priceJob(costs, pricing) {
  const p = Object.assign({method: "markup", markup: 0, margin: 0, overhead: 0}, pricing || {});
  const direct = costs.material + costs.labor + costs.equipment + costs.other + costs.allowance + costs.freight + costs.tax + costs.discount;
  const overhead = Math.round(direct * (+p.overhead || 0));
  const cost = direct + overhead;
  let sell;
  if (p.method === "margin") {
    const m = +p.margin || 0;
    if (m >= 1) return {direct, overhead, cost, sell: null, profit: null, margin: null, markup: null, error: "A margin must be under 100%"};
    sell = Math.round(cost / (1 - m));
  } else if (p.byKind && Object.values(p.byKind).some(v => v != null && v !== "")) {
    const mk = k => (p.byKind[k] != null && p.byKind[k] !== "" ? +p.byKind[k] : +p.markup || 0);
    sell = Math.round(costs.material * (1 + mk("material")) + costs.labor * (1 + mk("labor")) + costs.equipment * (1 + mk("equipment")) +
      (costs.other + costs.allowance) * (1 + (+p.markup || 0)) + costs.freight * (1 + mk("freight")) + costs.tax + costs.discount + overhead * (1 + (+p.markup || 0)));
  } else sell = Math.round(cost * (1 + (+p.markup || 0)));
  const profit = sell - cost;
  return {direct, overhead, cost, sell, profit, margin: pct(profit, sell), markup: pct(profit, cost)};
}
// the other number, so people can see both: a 25 % markup is a 20 % margin
export const markupToMargin = m => (m == null || m <= -1 ? null : m / (1 + m));
export const marginToMarkup = g => (g == null || g >= 1 ? null : g / (1 - g));

// ---------------- value engineering: original against alternative ----------------
// pair = {id, label, orig:{material, labor, equipment, freight}, alt:{…}, note} — dollar amounts as entered or taken from quote lines
export function veSide(s) {
  const c = k => cents(s && s[k]) || 0;
  const o = {material: c("material"), labor: c("labor"), equipment: c("equipment"), freight: c("freight")};
  o.total = o.material + o.labor + o.equipment + o.freight;
  return o;
}
export function veRow(pair) {
  const o = veSide(pair.orig), a = veSide(pair.alt);
  const savings = o.total - a.total;
  return {id: pair.id, label: pair.label, note: pair.note || "", orig: o, alt: a,
    materialSavings: o.material - a.material,
    laborDiff: a.labor - o.labor,                                  // + means the alternative needs more labor
    equipFreightDiff: (a.equipment + a.freight) - (o.equipment + o.freight),
    savings, savingsPct: pct(savings, o.total)};
}
export function veSummary(pairs, pricing) {
  const rows = (pairs || []).map(veRow);
  const sum = side => rows.reduce((acc, r) => { for (const k of ["material", "labor", "equipment", "freight", "total"]) acc[k] += r[side][k]; return acc; },
    {material: 0, labor: 0, equipment: 0, freight: 0, total: 0});
  const o = sum("orig"), a = sum("alt");
  const asCosts = s => ({material: s.material, labor: s.labor, equipment: s.equipment, other: 0, allowance: 0, freight: s.freight, tax: 0, discount: 0});
  return {rows, orig: o, alt: a, savings: o.total - a.total, savingsPct: pct(o.total - a.total, o.total),
    origPrice: priceJob(asCosts(o), pricing), altPrice: priceJob(asCosts(a), pricing)};
}
// a VE side from a quote line (its kind decides where the money goes)
export function sideFromItem(it) {
  const p = linePrice(it).c, v = p == null ? 0 : p / 100;
  const k = it && ["labor", "equipment", "freight"].includes(it.kind) ? it.kind : "material";
  return {material: k === "material" ? v : 0, labor: k === "labor" ? v : 0, equipment: k === "equipment" ? v : 0, freight: k === "freight" ? v : 0, from: it ? it.id : null};
}

// ---------------- the takeoff: suggest which measured total goes with a line ----------------
// takeoff = [{key, label, qty, unit}] (from the project's categories)
export function suggestTakeoff(groupLabel, unit, takeoff) {
  let best = null, bs = 0.34;
  for (const t of takeoff || []) {
    let s = similarity(groupLabel, t.label);
    if (unit && t.unit && unitInfo(unit) && unitInfo(t.unit)) s += sameDim(unit, t.unit) ? 0.15 : -0.3;
    if (s > bs) { bs = s; best = t; }
  }
  return best;
}

// ---------------- spreadsheets: find the header row and read lines without AI ----------------
const HEAD = {
  desc: /^(item\s*)?(desc(ription)?|item|material|product|scope|work|name|article)\b/i,
  qty: /^(qty|quantity|quan|cant(idad)?|amount\s*qty|units?\s*ordered|q'?ty)\b/i,
  unit: /^(unit|uom|u\/m|um|units?\s*of\s*measure|measure)$/i,
  unitPrice: /^(unit\s*(price|cost|rate)|price(\s*each|\s*\/\s*unit)?|rate|cost\s*each|each|precio(\s*unit)?)/i,
  total: /^(total|ext(ended)?(\s*(price|amount|cost))?|amount|line\s*total|importe|subtotal\s*line)/i,
};
export function readTable(rows) {
  const out = {items: [], headerRow: -1, map: null};
  const lim = Math.min(rows.length, 25);
  for (let r = 0; r < lim; r++) {
    const m = {};
    (rows[r] || []).forEach((c, i) => {
      const s = String(c == null ? "" : c).trim();
      for (const k of Object.keys(HEAD)) if (HEAD[k].test(s)) {
        // "Item" (often just the line number) gives way to a real Description column
        const weak = k === "desc" && /^item(\s*(no\.?|#|number))?$/i.test(s);
        if (m[k] == null || (k === "desc" && m._weak)) { m[k] = i; if (k === "desc") m._weak = weak; }
        break;
      }
    });
    if (m.desc != null && (m.qty != null || m.total != null || m.unitPrice != null)) { delete m._weak; out.headerRow = r; out.map = m; break; }
  }
  if (!out.map) return out;
  const m = out.map;
  for (let r = out.headerRow + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const desc = String(row[m.desc] == null ? "" : row[m.desc]).trim();
    const n = i => { if (i == null) return null; const v = numIn(row[i]); return v; };
    const qty = n(m.qty), up = n(m.unitPrice), tot = n(m.total);
    if (!desc && qty == null && tot == null) continue;
    if (!desc) continue;
    out.items.push({desc, qty, unit: m.unit != null ? String(row[m.unit] == null ? "" : row[m.unit]).trim() || null : null, unitPrice: up, total: tot, kind: kindOf(desc), row: r + 1});
  }
  return out;
}
export function numIn(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  let s = String(v).trim();
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s);
  s = s.replace(/[()$€£,\s]/g, "").replace(/^-/, "");
  if (!/^\d*\.?\d+$/.test(s)) return null;
  return neg ? -parseFloat(s) : parseFloat(s);
}
export function kindOf(desc) {
  const d = String(desc || "").toLowerCase();
  if (/\b(freight|delivery|shipping|haul(ing)?|trucking|fuel surcharge)\b/.test(d)) return "freight";
  if (/\b(sales\s*tax|tax)\b/.test(d)) return "tax";
  if (/\b(discount|credit|rebate)\b/.test(d)) return "discount";
  if (/\ballowance\b/.test(d)) return "allowance";
  if (/\b(labor|labour|install(ation)?|crew|man\s*hours?)\b/.test(d)) return "labor";
  if (/\b(equipment|rental|excavator|skid\s*steer|loader|bobcat|machine)\b/.test(d)) return "equipment";
  return "material";
}

// ---------------- checking the AI: a number counts only if it's written in the document ----------------
export function numbersIn(text) {
  const set = new Set();
  for (const m of String(text || "").matchAll(/\d[\d,]*(?:\.\d+)?|\.\d+/g)) {
    const v = parseFloat(m[0].replace(/,/g, ""));
    if (isFinite(v)) { set.add(round4(v)); }
  }
  return set;
}
const round4 = v => Math.round(v * 10000) / 10000;
export function inDoc(v, set) {
  if (v == null) return true;
  const a = Math.abs(+v);
  return set.has(round4(a)) || set.has(round4(Math.round(a * 100) / 100));
}

// ---------------- spreadsheet files, read without any library (the worker reads them itself, so credits are counted on the real file) ----------------
export function csvRows(text, maxRows) {
  const rows = []; let row = [], cell = "", q = false;
  const s = String(text || "").replace(/^﻿/, "");
  const sep = (() => { const first = s.split(/\r?\n/, 1)[0] || ""; const c = (first.match(/,/g) || []).length, sc = (first.match(/;/g) || []).length, tb = (first.match(/\t/g) || []).length; return tb > c && tb > sc ? "\t" : sc > c ? ";" : ","; })();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; if (maxRows && rows.length >= maxRows) return rows; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export const nonEmptyRows = rows => rows.filter(r => (r || []).some(c => c != null && String(c).trim() !== ""));

// a .zip (an .xlsx is one): the central directory, then each wanted file inflated with the browser's / worker's own DecompressionStream
async function inflateRaw(bytes, cap) {
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter(); w.write(bytes); w.close();
  const r = ds.readable.getReader(); const parts = []; let n = 0;
  for (;;) { const {done, value} = await r.read(); if (done) break; n += value.length; if (n > cap) { r.cancel(); throw new Error("too big inside"); } parts.push(value); }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
export async function unzip(buf, want, cap) {
  const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("not a zip");
  const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  const out = {}, dec = new TextDecoder();
  for (let k = 0; k < count && p + 46 <= b.length; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (!want(name)) continue;
    if (usize > (cap || 60e6)) throw new Error("too big inside");
    const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    const data = b.subarray(ds, ds + csize);
    out[name] = method === 0 ? data : method === 8 ? await inflateRaw(data, cap || 60e6) : null;
  }
  return out;
}
const xmlText = s => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&");
const colNum = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
// every sheet of an .xlsx as rows of cell text: [{name, rows}]
export async function xlsxSheets(buf, maxRows) {
  const files = await unzip(buf, n => n === "xl/workbook.xml" || n === "xl/sharedStrings.xml" || n === "xl/_rels/workbook.xml.rels" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const dec = new TextDecoder();
  if (!files["xl/workbook.xml"]) throw new Error("not an xlsx");
  const shared = [];
  if (files["xl/sharedStrings.xml"]) for (const m of dec.decode(files["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g))
    shared.push(xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join("")));
  const rels = {};
  if (files["xl/_rels/workbook.xml.rels"]) for (const m of dec.decode(files["xl/_rels/workbook.xml.rels"]).matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0]), tg = /Target="([^"]+)"/.exec(m[0]);
    if (id && tg) rels[id[1]] = "xl/" + tg[1].replace(/^\/?xl\//, "").replace(/^\//, "");
  }
  const sheets = [];
  for (const m of dec.decode(files["xl/workbook.xml"]).matchAll(/<sheet\b[^>]*>/g)) {
    const nm = /name="([^"]*)"/.exec(m[0]), rid = /r:id="([^"]+)"/.exec(m[0]);
    const path = rid && rels[rid[1]];
    const xml = path && files[path] ? dec.decode(files[path]) : null;
    if (!xml) continue;
    const rows = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = /r="([A-Z]+\d+)"/.exec(c[1]), ty = (/t="([^"]+)"/.exec(c[1]) || [])[1];
        const inner = c[2] || "", v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        let val = "";
        if (ty === "s") val = v ? shared[+v[1]] || "" : "";
        else if (ty === "inlineStr") val = xmlText((/<is>([\s\S]*?)<\/is>/.exec(inner) || [, ""])[1]);
        else if (ty === "b") val = v && v[1] === "1" ? "TRUE" : "FALSE";
        else val = v ? xmlText(v[1]) : "";
        const i = ref ? colNum(ref[1]) : row.length;
        while (row.length < i) row.push("");
        row[i] = /^-?\d+(\.\d+)?(E[-+]?\d+)?$/i.test(val) && ty !== "s" && ty !== "inlineStr" && ty !== "str" ? +val : val;
      }
      rows.push(row);
      if (maxRows && rows.length >= maxRows) break;
    }
    sheets.push({name: nm ? xmlText(nm[1]) : "Sheet", rows});
  }
  return sheets;
}
