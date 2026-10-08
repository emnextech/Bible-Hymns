// Builds data/seed.sql from data/raw/kjv.json and data/hymns/*.json.
// Usage: node scripts/build-seed.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BOOKS } from "../src/books.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const out = [];
const BATCH = 100; // rows per INSERT; keeps each statement well under D1's 100 KB limit

function insertRows(table, columns, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const values = rows.slice(i, i + BATCH).map((r) => `(${r.map(q).join(",")})`).join(",\n");
    out.push(`INSERT INTO ${table} (${columns.join(",")}) VALUES\n${values};`);
  }
}

// --- Translations & books ---------------------------------------------------
insertRows("translations", ["id", "name", "language", "license"], [["kjv", "King James Version (1769)", "en", "Public Domain"]]);
insertRows("books", ["id", "osis", "name", "testament", "chapters"], BOOKS.map((b) => [b.id, b.osis, b.name, b.testament, b.chapters]));

// --- KJV ---------------------------------------------------------------------
const kjv = JSON.parse(readFileSync(join(root, "data/raw/kjv.json"), "utf8"));
if (kjv.books.length !== 66) throw new Error(`Expected 66 books, got ${kjv.books.length}`);
const verses = [];
kjv.books.forEach((src, i) => {
  const book = BOOKS[i];
  if (src.chapters.length !== book.chapters) throw new Error(`${book.name}: expected ${book.chapters} chapters, got ${src.chapters.length}`);
  for (const ch of src.chapters) {
    for (const v of ch.verses) {
      verses.push(["kjv", book.id * 1_000_000 + ch.chapter * 1_000 + v.verse, book.id, ch.chapter, v.verse, v.text.trim()]);
    }
  }
});
insertRows("verses", ["translation", "vid", "book", "chapter", "verse", "text"], verses);
out.push("INSERT INTO verses_fts(verses_fts) VALUES('rebuild');");

// --- Hymns -------------------------------------------------------------------
const hymnDir = join(root, "data/hymns");
const hymns = readdirSync(hymnDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(hymnDir, f), "utf8")));

const seen = new Set();
let nextId = Math.max(0, ...hymns.map((h) => h.id ?? 0)) + 1;
const hymnRows = [], partRows = [], ftsRows = [];
for (const h of hymns) {
  const id = h.id ?? nextId++;
  if (seen.has(id)) throw new Error(`Duplicate hymn id ${id} (${h.title})`);
  seen.add(id);
  if (!h.title || !h.parts?.length) throw new Error(`Hymn ${id} needs a title and parts`);
  const firstLine = h.parts[0].text.split("\n")[0].replace(/[,;:.!]+$/, "");
  hymnRows.push([id, h.title, firstLine, h.author ?? null, h.year ?? null, h.copyright ?? "Public Domain", h.scripture ?? null, h.source ?? null, h.source_number ?? null]);
  let verseNo = 0;
  h.parts.forEach((p, pos) => {
    if (p.kind !== "verse" && p.kind !== "chorus") throw new Error(`Hymn ${id}: bad part kind "${p.kind}"`);
    partRows.push([id, pos + 1, p.kind, p.kind === "verse" ? ++verseNo : null, p.text]);
  });
  ftsRows.push([id, h.title, [h.author, h.source].filter(Boolean).join(" "), h.parts.map((p) => p.text).join("\n")]);
}
insertRows("hymns", ["id", "title", "first_line", "author", "year", "copyright", "scripture", "source", "source_number"], hymnRows);
insertRows("hymn_parts", ["hymn_id", "position", "kind", "number", "text"], partRows);
insertRows("hymns_fts", ["rowid", "title", "author", "lyrics"], ftsRows);

// --- Offline export ---------------------------------------------------------
// One static file with everything, served at /v1/export.json. Bible text is nested
// by position: bible.kjv[book - 1][chapter - 1][verse - 1].
const exportBody = {
  translations: [{ id: "kjv", name: "King James Version (1769)", language: "en", license: "Public Domain" }],
  books: BOOKS.map(({ id, osis, name, testament, chapters }) => ({ id, osis, name, testament, chapters })),
  bible: { kjv: kjv.books.map((b) => b.chapters.map((c) => c.verses.map((v) => v.text.trim()))) },
  hymns: hymns
    .map((h) => {
      let n = 0;
      return {
        id: h.id, title: h.title, author: h.author ?? null, year: h.year ?? null, copyright: h.copyright ?? "Public Domain",
        scripture: h.scripture ?? null, source: h.source ?? null, source_number: h.source_number ?? null,
        parts: h.parts.map((p) => ({ kind: p.kind, number: p.kind === "verse" ? ++n : null, lines: p.text.split("\n") })),
      };
    })
    .sort((a, b) => a.id - b.id),
};
const version = createHash("sha256").update(JSON.stringify(exportBody)).digest("hex").slice(0, 12);
const generatedAt = new Date().toISOString();
const exportFile = {
  format: "bible-hymns-export",
  format_version: 1,
  version,
  generated_at: generatedAt,
  counts: { verses: verses.length, hymns: hymnRows.length },
  ...exportBody,
};
const exportJson = JSON.stringify(exportFile);
mkdirSync(join(root, "public/v1"), { recursive: true });
writeFileSync(join(root, "public/v1/export.json"), exportJson);
insertRows("meta", ["key", "value"], [
  ["export_version", version],
  ["export_generated_at", generatedAt],
  ["verse_count", String(verses.length)],
  ["hymn_count", String(hymnRows.length)],
]);

writeFileSync(join(root, "data/seed.sql"), out.join("\n") + "\n");
console.log(`Wrote data/seed.sql: ${verses.length} verses, ${hymnRows.length} hymns`);
console.log(`Wrote public/v1/export.json: version ${version}, ${(Buffer.byteLength(exportJson) / 1048576).toFixed(1)} MB`);
