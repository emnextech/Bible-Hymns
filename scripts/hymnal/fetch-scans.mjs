// Downloads the OCR text of two scans of "Gospel Hymns Nos. 1 to 6" (1895, words-only edition)
// from the Internet Archive into data/raw/gospel-hymns/. Public domain.
// Usage: node scripts/hymnal/fetch-scans.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../data/raw/gospel-hymns");
const SCANS = ["gospelhymnsnos1t00sank", "gospelhymnsnos1t00mcgr"];

mkdirSync(dir, { recursive: true });
for (const id of SCANS) {
  const url = `https://archive.org/download/${id}/${id}_djvu.txt`;
  process.stdout.write(`Downloading ${url} … `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  writeFileSync(join(dir, `${id}.txt`), text);
  console.log(`${(text.length / 1024).toFixed(0)} KB`);
}
