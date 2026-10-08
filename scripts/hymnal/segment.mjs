// Splits the OCR text of "Gospel Hymns Nos. 1 to 6" (1895, words-only edition) into its 739 hymns.
// Two independent scans are segmented; hymn starts come from the printed hymn numbers, with the
// book's first-line index used to place hymns whose number was lost in OCR.
// Output: data/raw/gospel-hymns/segments.json  [{ number, a: string|null, b: string|null, indexLines: string[], how }]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dir = join(root, "data/raw/gospel-hymns");
const TOTAL = 739;
const SCANS = { a: "gospelhymnsnos1t00sank.txt", b: "gospelhymnsnos1t00mcgr.txt" };

const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const similar = (a, b) => { const k = Math.min(a.length, b.length, 18); if (k < 6) return false; return lev(a.slice(0, k), b.slice(0, k)) <= Math.max(2, Math.floor(k * 0.25)); };

function load(file) {
  const lines = readFileSync(join(dir, file), "utf8").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
  const indexAt = lines.findIndex((l) => /^INDEX\.?$/.test(l));
  return { body: lines.slice(0, indexAt), index: lines.slice(indexAt) };
}

// Index entries: "First line text 123" or "Text 57, 207, 610"
function parseIndex(lines) {
  const map = new Map();
  for (const l of lines) {
    const m = l.match(/^(.*?[A-Za-z].*?)[\s.…]+((?:\d{1,3}[,\s]*)+)$/);
    if (!m) continue;
    for (const n of m[2].match(/\d{1,3}/g).map(Number)) {
      if (n < 1 || n > TOTAL) continue;
      if (!map.has(n)) map.set(n, []);
      map.get(n).push(m[1].trim());
    }
  }
  return map;
}

function segment(body, index) {
  // 1. Anchors from printed numbers, accepted only when they continue the sequence.
  const start = new Map();
  let expect = 1;
  body.forEach((l, i) => {
    const m = l.match(/^(\d{1,3})\.?$/);
    if (!m) return;
    const n = Number(m[1]);
    if (n >= expect && n <= expect + 6) { start.set(n, { line: i + 1, how: "number" }); expect = n + 1; }
  });
  // 2. Missing numbers: look for an index first line between the neighbouring anchors.
  for (let n = 1; n <= TOTAL; n++) {
    if (start.has(n)) continue;
    let lo = 0, hi = body.length;
    for (let k = n - 1; k >= 1; k--) if (start.has(k)) { lo = start.get(k).line + 1; break; }
    for (let k = n + 1; k <= TOTAL; k++) if (start.has(k)) { hi = start.get(k).line; break; }
    const cands = (index.get(n) || []).map(norm).filter((c) => c.length >= 6);
    for (let i = lo; i < hi && cands.length; i++) {
      const ln = norm(body[i]);
      if (cands.some((c) => similar(ln, c))) { start.set(n, { line: i, how: "index" }); break; }
    }
  }
  // 3. Cut text between consecutive starts.
  const ordered = [...start.entries()].sort((x, y) => x[1].line - y[1].line);
  const out = new Map();
  ordered.forEach(([n, s], k) => {
    const end = k + 1 < ordered.length ? ordered[k + 1][1].line - (ordered[k + 1][1].how === "number" ? 1 : 0) : body.length;
    out.set(n, { text: body.slice(s.line, end).filter((l) => !/^\d{1,3}$/.test(l)).join("\n").replace(/\n{3,}/g, "\n\n").trim(), how: s.how });
  });
  return out;
}

const scans = {};
const indexAll = new Map();
for (const [key, file] of Object.entries(SCANS)) {
  const { body, index } = load(file);
  const idx = parseIndex(index);
  for (const [n, v] of idx) indexAll.set(n, [...(indexAll.get(n) || []), ...v]);
  scans[key] = { body, idx };
}
for (const key of Object.keys(scans)) scans[key].seg = segment(scans[key].body, indexAll);

const result = [];
let both = 0, one = 0, none = 0;
for (let n = 1; n <= TOTAL; n++) {
  const a = scans.a.seg.get(n), b = scans.b.seg.get(n);
  if (a && b) both++; else if (a || b) one++; else none++;
  result.push({ number: n, a: a?.text ?? null, b: b?.text ?? null, how: [a?.how ?? "-", b?.how ?? "-"].join("/"), indexLines: [...new Set(indexAll.get(n) || [])] });
}
writeFileSync(join(dir, "segments.json"), JSON.stringify(result, null, 1));
console.log(`segments.json: ${TOTAL} hymns — in both scans: ${both}, one scan: ${one}, missing: ${none}`);
