// Converts the cleaned transcriptions in data/hymns-src/gospel-hymns/*.txt into
// data/hymns/gospel-hymns-1895.json, verifying every hymn against both OCR scans.
//
// Transcription format:
//   ## <number in the book>
//   # Optional title (defaults to the first line)
//   lines of a verse...
//   <blank line between parts>
//   [C]            <- marks the next part as a chorus
//
// Usage: node scripts/hymnal/build.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(root, "data/hymns-src/gospel-hymns");
const SOURCE = "Gospel Hymns Nos. 1 to 6 (1895)";
const ID_OFFSET = 22; // book hymn N gets id 22 + N; ids 1-22 are the hand-entered starter set

// Same hymn as a starter but with a differently worded first line in the 1895 book (book number -> starter id).
const KNOWN_DUPLICATES = { 195: 7 };
const segments = JSON.parse(readFileSync(join(root, "data/raw/gospel-hymns/segments.json"), "utf8"));
const existing = JSON.parse(readFileSync(join(root, "data/hymns/public-domain.json"), "utf8"));
const firstLineKey = (s) => s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 40);
const existingKeys = new Map(existing.map((h) => [firstLineKey(h.parts[0].text.split("\n")[0]), h.id]));

const words = (s) => (s.toLowerCase().replace(/[’']/g, "").match(/[a-z]+/g) || []);
function lev(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

function parse(text) {
  const hymns = [];
  for (const block of text.split(/^## /m).slice(1)) {
    const lines = block.replace(/\r/g, "").split("\n");
    const number = Number(lines.shift().trim());
    let title = null;
    if (lines[0]?.startsWith("# ")) title = lines.shift().slice(2).trim();
    const parts = [];
    let cur = [], chorus = false;
    const flush = () => { if (cur.length) parts.push({ kind: chorus ? "chorus" : "verse", text: cur.join("\n") }); cur = []; chorus = false; };
    for (const raw of lines) {
      const l = raw.trimEnd();
      if (!l.trim()) { flush(); continue; }
      if (l.trim() === "[C]") { flush(); chorus = true; continue; }
      cur.push(l.trim());
    }
    flush();
    hymns.push({ number, title, parts });
  }
  return hymns;
}

const out = [], report = [], skipped = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".txt")).sort()) {
  for (const h of parse(readFileSync(join(SRC, file), "utf8"))) {
    let seg = segments[h.number - 1];
    if (!seg) throw new Error(`No segment for hymn ${h.number}`);
    // A few hymns were merged into the previous hymn's segment by the scans; verify against that one.
    if (!seg.a && !seg.b) seg = { a: segments[h.number - 2]?.a, b: segments[h.number - 2]?.b };
    if (!h.parts.length) throw new Error(`Hymn ${h.number} has no text`);
    const first = h.parts[0].text.split("\n")[0];
    const dup = KNOWN_DUPLICATES[h.number] ?? existingKeys.get(firstLineKey(first));
    if (dup) { skipped.push(`${h.number} (same as starter hymn ${dup})`); continue; }

    // Verification against both scans
    const ocr = words(`${seg.a || ""} ${seg.b || ""}`);
    const ocrSet = new Set(ocr);
    const ocrJoined = (seg.a || "").toLowerCase().replace(/[^a-z]/g, "") + (seg.b || "").toLowerCase().replace(/[^a-z]/g, "");
    const clean = words(h.parts.map((p) => p.text).join(" "));
    const unknown = [...new Set(clean.filter((w) => {
      if (ocrSet.has(w) || ocrJoined.includes(w)) return false;
      const tol = w.length >= 7 ? 2 : w.length >= 3 ? 1 : 0;
      return !ocr.some((o) => Math.abs(o.length - w.length) <= tol && lev(o, w) <= tol);
    }))];
    const cleanSet = new Set(clean);
    const scanA = words(seg.a || seg.b || "").filter((w) => w.length >= 4);
    const covered = scanA.length ? scanA.filter((w) => cleanSet.has(w) || [...cleanSet].some((c) => c.length >= 4 && lev(c, w) <= 1)).length / scanA.length : 1;
    report.push({ number: h.number, unknown, covered });

    out.push({
      id: ID_OFFSET + h.number,
      title: h.title || first.replace(/[,;:.!?]+$/, "").replace(/^"|"$/g, ""),
      author: null,
      year: null,
      copyright: "Public Domain",
      source: SOURCE,
      source_number: h.number,
      parts: h.parts,
    });
  }
}
out.sort((a, b) => a.id - b.id);
writeFileSync(join(root, "data/hymns/gospel-hymns-1895.json"), JSON.stringify(out, null, 2) + "\n");

const flagged = report.filter((r) => r.unknown.length || r.covered < 0.85);
console.log(`Wrote ${out.length} hymns to data/hymns/gospel-hymns-1895.json`);
if (skipped.length) console.log(`Skipped duplicates of starter hymns: ${skipped.join(", ")}`);
console.log(`Verified against both scans: ${report.length - flagged.length} clean, ${flagged.length} flagged`);
for (const r of flagged) console.log(`  #${r.number}: ${r.unknown.length ? `words not in scan: ${r.unknown.join(", ")}` : ""}${r.covered < 0.85 ? `  scan coverage ${(r.covered * 100).toFixed(0)}%` : ""}`);
