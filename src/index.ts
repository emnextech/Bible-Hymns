import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { BOOKS, findBook } from "./books";
import { parseReference, parseReferences, ReferenceError, type Passage } from "./reference";

type Env = { Bindings: { DB: D1Database } };

interface VerseRow {
  vid: number;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

interface HymnRow {
  id: number;
  title: string;
  first_line: string;
  author: string | null;
  year: number | null;
  copyright: string;
  scripture: string | null;
  source: string | null;
  source_number: number | null;
}

interface HymnPartRow {
  position: number;
  kind: "verse" | "chorus";
  number: number | null;
  text: string;
}

const app = new Hono<Env>();

app.use("*", cors());
app.use("/v1/*", async (c, next) => {
  await next();
  if (c.res.ok && c.req.method === "GET" && !c.req.path.includes("random")) {
    c.res.headers.set("Cache-Control", "public, max-age=86400");
  }
});

app.onError((err, c) => {
  if (err instanceof ReferenceError) return c.json({ error: err.message }, 400);
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});
app.notFound((c) => c.json({ error: `No route for ${c.req.path}` }, 404));

// --- helpers -----------------------------------------------------------------

function paging(c: Context<Env>, defaultLimit = 20) {
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? defaultLimit) || defaultLimit, 1), 100);
  const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0);
  return { limit, offset };
}

/** Turn free text into a safe FTS5 query: every word becomes a quoted prefix term, all required. */
function ftsQuery(raw: string): string {
  const words = raw.match(/[\p{L}\p{N}']+/gu) ?? [];
  return words.map((w) => `"${w.replace(/"/g, "")}"*`).join(" ");
}

async function requireTranslation(c: Context<Env>): Promise<string> {
  const id = c.req.param("translation")!.toLowerCase();
  const row = await c.env.DB.prepare("SELECT id FROM translations WHERE id = ?").bind(id).first<{ id: string }>();
  if (!row) throw new ReferenceError(`Unknown translation "${id}". See /v1/translations`);
  return row.id;
}

function formatVerses(rows: VerseRow[]) {
  return rows.map((r) => ({
    book: BOOKS[r.book - 1].name,
    chapter: r.chapter,
    verse: r.verse,
    reference: `${BOOKS[r.book - 1].name} ${r.chapter}:${r.verse}`,
    text: r.text,
  }));
}

async function fetchPassage(db: D1Database, translation: string, p: Passage) {
  const { results } = await db
    .prepare("SELECT vid, book, chapter, verse, text FROM verses WHERE translation = ? AND vid BETWEEN ? AND ? ORDER BY vid")
    .bind(translation, p.start, p.end)
    .all<VerseRow>();
  if (results.length === 0) throw new ReferenceError(`No verses found for ${p.label}`);
  return {
    reference: p.label,
    translation,
    verses: formatVerses(results),
    text: results.map((r) => r.text).join(" "),
  };
}

async function loadHymn(db: D1Database, id: number) {
  const hymn = await db.prepare("SELECT * FROM hymns WHERE id = ?").bind(id).first<HymnRow>();
  if (!hymn) return null;
  const { results } = await db
    .prepare("SELECT position, kind, number, text FROM hymn_parts WHERE hymn_id = ? ORDER BY position")
    .bind(id)
    .all<HymnPartRow>();
  return { ...hymn, parts: results.map((p) => ({ kind: p.kind, number: p.number, lines: p.text.split("\n") })) };
}

// --- index -------------------------------------------------------------------

app.get("/v1", (c) =>
  c.json({
    name: "Bible & Hymns API",
    version: "1.0.0",
    endpoints: {
      translations: "/v1/translations",
      books: "/v1/books",
      chapter: "/v1/bible/kjv/john/3",
      verse: "/v1/bible/kjv/john/3/16",
      verseRange: "/v1/bible/kjv/john/3/16-18",
      passage: "/v1/bible/kjv/passage?ref=Gen 1:1-2:3; Ps 23",
      search: "/v1/bible/kjv/search?q=only believe",
      randomVerse: "/v1/bible/kjv/random",
      hymns: "/v1/hymns",
      hymnSearch: "/v1/hymns?q=blood",
      hymn: "/v1/hymns/1",
      randomHymn: "/v1/hymns/random",
      searchAll: "/v1/search?q=grace",
    },
  }),
);

// --- bible -------------------------------------------------------------------

app.get("/v1/translations", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, name, language, license FROM translations ORDER BY id").all();
  return c.json({ translations: results });
});

app.get("/v1/books", (c) =>
  c.json({ books: BOOKS.map(({ id, osis, name, testament, chapters }) => ({ id, osis, name, testament, chapters })) }),
);

app.get("/v1/bible/:translation/passage", async (c) => {
  const translation = await requireTranslation(c);
  const ref = c.req.query("ref");
  if (!ref) throw new ReferenceError('Missing "ref" query parameter, e.g. ?ref=John 3:16');
  const passages = parseReferences(ref);
  if (passages.length > 10) throw new ReferenceError("At most 10 references per request");
  const results = await Promise.all(passages.map((p) => fetchPassage(c.env.DB, translation, p)));
  return c.json({ translation, passages: results });
});

app.get("/v1/bible/:translation/search", async (c) => {
  const translation = await requireTranslation(c);
  const q = ftsQuery(c.req.query("q") ?? "");
  if (!q) throw new ReferenceError('Missing "q" query parameter');
  const { limit, offset } = paging(c);
  const bookParam = c.req.query("book");
  const book = bookParam ? findBook(bookParam) : undefined;
  if (bookParam && !book) throw new ReferenceError(`Unknown book "${bookParam}"`);

  const filter = book ? " AND v.book = ?" : "";
  const binds: unknown[] = book ? [q, translation, book.id] : [q, translation];
  const { results } = await c.env.DB.prepare(
    `SELECT v.vid, v.book, v.chapter, v.verse, v.text
       FROM verses_fts f JOIN verses v ON v.rowid = f.rowid
      WHERE verses_fts MATCH ? AND v.translation = ?${filter}
      ORDER BY f.rank LIMIT ? OFFSET ?`,
  )
    .bind(...binds, limit, offset)
    .all<VerseRow>();
  const total = await c.env.DB.prepare(
    `SELECT count(*) AS n FROM verses_fts f JOIN verses v ON v.rowid = f.rowid
      WHERE verses_fts MATCH ? AND v.translation = ?${filter}`,
  )
    .bind(...binds)
    .first<number>("n");
  return c.json({ query: c.req.query("q"), translation, total, limit, offset, results: formatVerses(results) });
});

app.get("/v1/bible/:translation/random", async (c) => {
  const translation = await requireTranslation(c);
  const row = await c.env.DB.prepare(
    "SELECT vid, book, chapter, verse, text FROM verses WHERE translation = ? ORDER BY random() LIMIT 1",
  )
    .bind(translation)
    .first<VerseRow>();
  const [verse] = formatVerses([row!]);
  return c.json({ translation, ...verse });
});

app.get("/v1/bible/:translation/:book/:chapter/:verse?", async (c) => {
  const translation = await requireTranslation(c);
  const book = findBook(decodeURIComponent(c.req.param("book")));
  if (!book) throw new ReferenceError(`Unknown book "${c.req.param("book")}". See /v1/books`);
  const chapter = c.req.param("chapter");
  const verse = c.req.param("verse");
  const passage = parseReference(`${book.name} ${chapter}${verse ? `:${verse}` : ""}`);
  const result = await fetchPassage(c.env.DB, translation, passage);

  if (!verse) {
    const ch = Number(chapter);
    const nav = (n: number) => (n >= 1 && n <= book.chapters ? `/v1/bible/${translation}/${book.osis.toLowerCase()}/${n}` : null);
    return c.json({ ...result, book: book.name, chapter: ch, previous: nav(ch - 1), next: nav(ch + 1) });
  }
  return c.json(result);
});

// --- hymns -------------------------------------------------------------------

app.get("/v1/hymns", async (c) => {
  const { limit, offset } = paging(c, 50);
  const raw = c.req.query("q");
  if (raw) {
    const q = ftsQuery(raw);
    if (!q) throw new ReferenceError('Empty "q" query parameter');
    const { results } = await c.env.DB.prepare(
      `SELECT h.id, h.title, h.first_line, h.author, h.year, h.copyright, h.scripture, h.source, h.source_number,
              snippet(hymns_fts, 2, '[', ']', '…', 12) AS match
         FROM hymns_fts f JOIN hymns h ON h.id = f.rowid
        WHERE hymns_fts MATCH ? ORDER BY f.rank LIMIT ? OFFSET ?`,
    )
      .bind(q, limit, offset)
      .all();
    return c.json({ query: raw, limit, offset, results });
  }
  const { results } = await c.env.DB.prepare(
    "SELECT id, title, first_line, author, year, copyright, scripture, source, source_number FROM hymns ORDER BY id LIMIT ? OFFSET ?",
  )
    .bind(limit, offset)
    .all();
  const total = await c.env.DB.prepare("SELECT count(*) AS n FROM hymns").first<number>("n");
  return c.json({ total, limit, offset, hymns: results });
});

app.get("/v1/hymns/random", async (c) => {
  const row = await c.env.DB.prepare("SELECT id FROM hymns ORDER BY random() LIMIT 1").first<{ id: number }>();
  return c.json(await loadHymn(c.env.DB, row!.id));
});

app.get("/v1/hymns/:id{[0-9]+}", async (c) => {
  const hymn = await loadHymn(c.env.DB, Number(c.req.param("id")));
  return hymn ? c.json(hymn) : c.json({ error: "Hymn not found" }, 404);
});

// --- combined search -----------------------------------------------------------

app.get("/v1/search", async (c) => {
  const raw = c.req.query("q") ?? "";
  const q = ftsQuery(raw);
  if (!q) throw new ReferenceError('Missing "q" query parameter');
  const translation = (c.req.query("translation") ?? "kjv").toLowerCase();

  // If the query is itself a Bible reference, include that passage too.
  let reference = null;
  try {
    reference = await fetchPassage(c.env.DB, translation, parseReference(raw));
  } catch {
    /* not a reference */
  }

  const [verses, hymns] = await Promise.all([
    c.env.DB.prepare(
      `SELECT v.vid, v.book, v.chapter, v.verse, v.text FROM verses_fts f JOIN verses v ON v.rowid = f.rowid
        WHERE verses_fts MATCH ? AND v.translation = ? ORDER BY f.rank LIMIT 10`,
    )
      .bind(q, translation)
      .all<VerseRow>(),
    c.env.DB.prepare(
      `SELECT h.id, h.title, h.author, h.source, h.source_number, snippet(hymns_fts, 2, '[', ']', '…', 12) AS match
         FROM hymns_fts f JOIN hymns h ON h.id = f.rowid WHERE hymns_fts MATCH ? ORDER BY f.rank LIMIT 10`,
    )
      .bind(q)
      .all(),
  ]);
  return c.json({ query: raw, reference, verses: formatVerses(verses.results), hymns: hymns.results });
});

export default app;
