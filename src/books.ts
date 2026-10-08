// Canonical book list (Protestant 66-book order). `id` is the 1-based canonical position
// and is used inside verse ids: BBCCCVVV (book * 1_000_000 + chapter * 1_000 + verse).
export interface Book {
  id: number;
  osis: string;
  name: string;
  testament: "OT" | "NT";
  chapters: number;
  aliases: string[];
}

export const BOOKS: Book[] = [
  { id: 1, osis: "Gen", name: "Genesis", testament: "OT", chapters: 50, aliases: ["ge", "gn"] },
  { id: 2, osis: "Exod", name: "Exodus", testament: "OT", chapters: 40, aliases: ["ex", "exo"] },
  { id: 3, osis: "Lev", name: "Leviticus", testament: "OT", chapters: 27, aliases: ["le", "lv"] },
  { id: 4, osis: "Num", name: "Numbers", testament: "OT", chapters: 36, aliases: ["nu", "nm", "nb"] },
  { id: 5, osis: "Deut", name: "Deuteronomy", testament: "OT", chapters: 34, aliases: ["dt", "de"] },
  { id: 6, osis: "Josh", name: "Joshua", testament: "OT", chapters: 24, aliases: ["jos", "jsh"] },
  { id: 7, osis: "Judg", name: "Judges", testament: "OT", chapters: 21, aliases: ["jdg", "jg", "jdgs"] },
  { id: 8, osis: "Ruth", name: "Ruth", testament: "OT", chapters: 4, aliases: ["rth", "ru"] },
  { id: 9, osis: "1Sam", name: "1 Samuel", testament: "OT", chapters: 31, aliases: ["1sa", "1sm"] },
  { id: 10, osis: "2Sam", name: "2 Samuel", testament: "OT", chapters: 24, aliases: ["2sa", "2sm"] },
  { id: 11, osis: "1Kgs", name: "1 Kings", testament: "OT", chapters: 22, aliases: ["1ki", "1kin", "1kg"] },
  { id: 12, osis: "2Kgs", name: "2 Kings", testament: "OT", chapters: 25, aliases: ["2ki", "2kin", "2kg"] },
  { id: 13, osis: "1Chr", name: "1 Chronicles", testament: "OT", chapters: 29, aliases: ["1ch", "1chron"] },
  { id: 14, osis: "2Chr", name: "2 Chronicles", testament: "OT", chapters: 36, aliases: ["2ch", "2chron"] },
  { id: 15, osis: "Ezra", name: "Ezra", testament: "OT", chapters: 10, aliases: ["ezr"] },
  { id: 16, osis: "Neh", name: "Nehemiah", testament: "OT", chapters: 13, aliases: ["ne"] },
  { id: 17, osis: "Esth", name: "Esther", testament: "OT", chapters: 10, aliases: ["est", "es"] },
  { id: 18, osis: "Job", name: "Job", testament: "OT", chapters: 42, aliases: ["jb"] },
  { id: 19, osis: "Ps", name: "Psalms", testament: "OT", chapters: 150, aliases: ["psalm", "psa", "psm", "pss"] },
  { id: 20, osis: "Prov", name: "Proverbs", testament: "OT", chapters: 31, aliases: ["pr", "prv"] },
  { id: 21, osis: "Eccl", name: "Ecclesiastes", testament: "OT", chapters: 12, aliases: ["ec", "ecc", "qoh"] },
  { id: 22, osis: "Song", name: "Song of Solomon", testament: "OT", chapters: 8, aliases: ["so", "sos", "songofsongs", "canticles", "song"] },
  { id: 23, osis: "Isa", name: "Isaiah", testament: "OT", chapters: 66, aliases: ["is"] },
  { id: 24, osis: "Jer", name: "Jeremiah", testament: "OT", chapters: 52, aliases: ["je", "jr"] },
  { id: 25, osis: "Lam", name: "Lamentations", testament: "OT", chapters: 5, aliases: ["la"] },
  { id: 26, osis: "Ezek", name: "Ezekiel", testament: "OT", chapters: 48, aliases: ["eze", "ezk"] },
  { id: 27, osis: "Dan", name: "Daniel", testament: "OT", chapters: 12, aliases: ["da", "dn"] },
  { id: 28, osis: "Hos", name: "Hosea", testament: "OT", chapters: 14, aliases: ["ho"] },
  { id: 29, osis: "Joel", name: "Joel", testament: "OT", chapters: 3, aliases: ["jl"] },
  { id: 30, osis: "Amos", name: "Amos", testament: "OT", chapters: 9, aliases: ["am"] },
  { id: 31, osis: "Obad", name: "Obadiah", testament: "OT", chapters: 1, aliases: ["ob"] },
  { id: 32, osis: "Jonah", name: "Jonah", testament: "OT", chapters: 4, aliases: ["jnh", "jon"] },
  { id: 33, osis: "Mic", name: "Micah", testament: "OT", chapters: 7, aliases: ["mc"] },
  { id: 34, osis: "Nah", name: "Nahum", testament: "OT", chapters: 3, aliases: ["na"] },
  { id: 35, osis: "Hab", name: "Habakkuk", testament: "OT", chapters: 3, aliases: ["hb"] },
  { id: 36, osis: "Zeph", name: "Zephaniah", testament: "OT", chapters: 3, aliases: ["zep", "zp"] },
  { id: 37, osis: "Hag", name: "Haggai", testament: "OT", chapters: 2, aliases: ["hg"] },
  { id: 38, osis: "Zech", name: "Zechariah", testament: "OT", chapters: 14, aliases: ["zec", "zc"] },
  { id: 39, osis: "Mal", name: "Malachi", testament: "OT", chapters: 4, aliases: ["ml"] },
  { id: 40, osis: "Matt", name: "Matthew", testament: "NT", chapters: 28, aliases: ["mt"] },
  { id: 41, osis: "Mark", name: "Mark", testament: "NT", chapters: 16, aliases: ["mk", "mrk", "mr"] },
  { id: 42, osis: "Luke", name: "Luke", testament: "NT", chapters: 24, aliases: ["lk", "luk"] },
  { id: 43, osis: "John", name: "John", testament: "NT", chapters: 21, aliases: ["jn", "jhn", "joh"] },
  { id: 44, osis: "Acts", name: "Acts", testament: "NT", chapters: 28, aliases: ["ac", "act"] },
  { id: 45, osis: "Rom", name: "Romans", testament: "NT", chapters: 16, aliases: ["ro", "rm"] },
  { id: 46, osis: "1Cor", name: "1 Corinthians", testament: "NT", chapters: 16, aliases: ["1co"] },
  { id: 47, osis: "2Cor", name: "2 Corinthians", testament: "NT", chapters: 13, aliases: ["2co"] },
  { id: 48, osis: "Gal", name: "Galatians", testament: "NT", chapters: 6, aliases: ["ga"] },
  { id: 49, osis: "Eph", name: "Ephesians", testament: "NT", chapters: 6, aliases: ["ephes"] },
  { id: 50, osis: "Phil", name: "Philippians", testament: "NT", chapters: 4, aliases: ["php", "pp"] },
  { id: 51, osis: "Col", name: "Colossians", testament: "NT", chapters: 4, aliases: ["co"] },
  { id: 52, osis: "1Thess", name: "1 Thessalonians", testament: "NT", chapters: 5, aliases: ["1th", "1thes"] },
  { id: 53, osis: "2Thess", name: "2 Thessalonians", testament: "NT", chapters: 3, aliases: ["2th", "2thes"] },
  { id: 54, osis: "1Tim", name: "1 Timothy", testament: "NT", chapters: 6, aliases: ["1ti", "1tm"] },
  { id: 55, osis: "2Tim", name: "2 Timothy", testament: "NT", chapters: 4, aliases: ["2ti", "2tm"] },
  { id: 56, osis: "Titus", name: "Titus", testament: "NT", chapters: 3, aliases: ["tit", "ti"] },
  { id: 57, osis: "Phlm", name: "Philemon", testament: "NT", chapters: 1, aliases: ["philem", "phm", "pm"] },
  { id: 58, osis: "Heb", name: "Hebrews", testament: "NT", chapters: 13, aliases: [] },
  { id: 59, osis: "Jas", name: "James", testament: "NT", chapters: 5, aliases: ["jm", "jam"] },
  { id: 60, osis: "1Pet", name: "1 Peter", testament: "NT", chapters: 5, aliases: ["1pe", "1pt", "1p"] },
  { id: 61, osis: "2Pet", name: "2 Peter", testament: "NT", chapters: 3, aliases: ["2pe", "2pt", "2p"] },
  { id: 62, osis: "1John", name: "1 John", testament: "NT", chapters: 5, aliases: ["1jn", "1jo", "1j"] },
  { id: 63, osis: "2John", name: "2 John", testament: "NT", chapters: 1, aliases: ["2jn", "2jo", "2j"] },
  { id: 64, osis: "3John", name: "3 John", testament: "NT", chapters: 1, aliases: ["3jn", "3jo", "3j"] },
  { id: 65, osis: "Jude", name: "Jude", testament: "NT", chapters: 1, aliases: ["jud", "jd"] },
  { id: 66, osis: "Rev", name: "Revelation", testament: "NT", chapters: 22, aliases: ["re", "rv", "revelations", "apocalypse"] },
];

/** Lowercase, drop punctuation/whitespace, and turn leading roman numerals / ordinals into digits. */
export function normalizeBookKey(raw: string): string {
  let s = raw.toLowerCase().trim().replace(/[.]/g, "");
  s = s.replace(/^(iii|third|3rd)\s*/, "3").replace(/^(ii|second|2nd)\s*/, "2").replace(/^(i|first|1st)\s+/, "1");
  // "I John" without a space after the numeral, e.g. "IJohn", is rare enough to ignore.
  return s.replace(/[\s_-]+/g, "");
}

const lookup = new Map<string, Book>();
for (const b of BOOKS) {
  for (const key of [b.name, b.osis, ...b.aliases]) lookup.set(normalizeBookKey(key), b);
}

/** Resolve a book name, abbreviation, OSIS id or numeric id to a Book. Falls back to a unique prefix match. */
export function findBook(raw: string): Book | undefined {
  if (/^\d+$/.test(raw.trim())) return BOOKS[Number(raw) - 1];
  const key = normalizeBookKey(raw);
  if (!key) return undefined;
  const exact = lookup.get(key);
  if (exact) return exact;
  const matches = BOOKS.filter((b) => normalizeBookKey(b.name).startsWith(key));
  return matches.length === 1 ? matches[0] : undefined;
}
