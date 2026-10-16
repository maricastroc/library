export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  isbn TEXT UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  synopsis TEXT,
  synopsis_source TEXT,
  synopsis_url TEXT,
  publisher TEXT,
  year INTEGER,
  pages INTEGER,
  language TEXT,
  cover_url TEXT,
  cover_source TEXT,
  source_url TEXT,
  subjects TEXT NOT NULL DEFAULT '[]',
  price_cents INTEGER,
  price_is_demo INTEGER NOT NULL DEFAULT 0,
  stock INTEGER,
  stock_is_demo INTEGER NOT NULL DEFAULT 0,
  staff_note TEXT,
  staff_note_origin TEXT,
  dedupe_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS books_dedupe_idx ON books(dedupe_key);

CREATE TABLE IF NOT EXISTS book_semantics (
  book_id INTEGER PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  atmospheres TEXT NOT NULL DEFAULT '[]',
  pace INTEGER,
  density INTEGER,
  styles TEXT NOT NULL DEFAULT '[]',
  experiences TEXT NOT NULL DEFAULT '[]',
  themes TEXT NOT NULL DEFAULT '[]',
  portrait TEXT,
  evidence TEXT NOT NULL DEFAULT '[]',
  confidence TEXT,
  model TEXT,
  origin TEXT NOT NULL DEFAULT 'ai',
  input_hash TEXT,
  error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS book_vectors (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  model TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  vector BLOB NOT NULL,
  PRIMARY KEY (book_id, kind)
);

CREATE TABLE IF NOT EXISTS book_sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  vector BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS book_sentences_book_idx ON book_sentences(book_id);

CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
  title, author, genre, synopsis, staff_note,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE IF NOT EXISTS text_vectors (
  hash TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  text TEXT NOT NULL,
  vector BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS query_interpretations (
  hash TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  model TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS explanations (
  hash TEXT PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  model TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS showcases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  intro TEXT,
  palette TEXT NOT NULL DEFAULT 'ink',
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS showcase_books (
  showcase_id INTEGER NOT NULL REFERENCES showcases(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  caption TEXT,
  PRIMARY KEY (showcase_id, book_id)
);

CREATE TABLE IF NOT EXISTS interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT,
  search_query TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS interests_status_idx ON interests(status, created_at);

CREATE TABLE IF NOT EXISTS search_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  folded TEXT NOT NULL,
  confidence TEXT NOT NULL,
  fallback INTEGER NOT NULL DEFAULT 0,
  results INTEGER NOT NULL DEFAULT 0,
  shown_ids TEXT NOT NULL DEFAULT '[]',
  atmospheres TEXT NOT NULL DEFAULT '[]',
  inferred TEXT NOT NULL DEFAULT '[]',
  opened_ids TEXT NOT NULL DEFAULT '[]',
  reserved_ids TEXT NOT NULL DEFAULT '[]',
  sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS search_log_created_idx ON search_log(created_at);

CREATE TABLE IF NOT EXISTS shop_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  total INTEGER NOT NULL,
  inserted INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  skipped INTEGER NOT NULL,
  issues TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
