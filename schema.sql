-- Bible + Hymns API schema (Cloudflare D1 / SQLite)

DROP TABLE IF EXISTS verses_fts;
DROP TABLE IF EXISTS hymns_fts;
DROP TABLE IF EXISTS hymn_parts;
DROP TABLE IF EXISTS hymns;
DROP TABLE IF EXISTS verses;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS translations;
DROP TABLE IF EXISTS meta;

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,               -- e.g. 'export_version'
  value TEXT NOT NULL
);

CREATE TABLE translations (
  id        TEXT PRIMARY KEY,          -- e.g. 'kjv'
  name      TEXT NOT NULL,
  language  TEXT NOT NULL,
  license   TEXT NOT NULL
);

CREATE TABLE books (
  id        INTEGER PRIMARY KEY,       -- canonical order 1..66
  osis      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  chapters  INTEGER NOT NULL
);

CREATE TABLE verses (
  rowid       INTEGER PRIMARY KEY,
  translation TEXT    NOT NULL REFERENCES translations(id),
  vid         INTEGER NOT NULL,        -- BBCCCVVV
  book        INTEGER NOT NULL REFERENCES books(id),
  chapter     INTEGER NOT NULL,
  verse       INTEGER NOT NULL,
  text        TEXT    NOT NULL,
  UNIQUE (translation, vid)
);

CREATE VIRTUAL TABLE verses_fts USING fts5(
  text,
  content = 'verses',
  content_rowid = 'rowid',
  tokenize = 'porter unicode61'
);

CREATE TABLE hymns (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  first_line TEXT NOT NULL,
  author     TEXT,
  year       INTEGER,
  copyright  TEXT NOT NULL,
  scripture  TEXT,                     -- optional related reference, e.g. 'Mark 5:36'
  source     TEXT,                     -- hymnal the text was taken from, e.g. 'Gospel Hymns Nos. 1 to 6 (1895)'
  source_number INTEGER                -- the hymn's number in that hymnal
);

CREATE TABLE hymn_parts (
  hymn_id  INTEGER NOT NULL REFERENCES hymns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind     TEXT    NOT NULL CHECK (kind IN ('verse', 'chorus')),
  number   INTEGER,                    -- verse number; NULL for chorus
  text     TEXT    NOT NULL,
  PRIMARY KEY (hymn_id, position)
);

-- Standalone FTS table; rowid = hymns.id
CREATE VIRTUAL TABLE hymns_fts USING fts5(
  title,
  author,
  lyrics,
  tokenize = 'porter unicode61'
);
