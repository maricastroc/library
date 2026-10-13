import type Database from "better-sqlite3";

const LEGACY_SEMANTIC_STATUS: Record<string, string> = {
  pendente: "pending",
  processando: "processing",
  pronto: "ready",
  insuficiente: "insufficient",
  erro: "error",
};
const LEGACY_ORIGIN: Record<string, string> = { ia: "ai", livreira: "bookseller" };
const LEGACY_NOTE_ORIGIN: Record<string, string> = { livreira: "bookseller", exemplo: "example" };
const LEGACY_CONFIDENCE: Record<string, string> = { alta: "high", media: "medium", baixa: "low" };
const LEGACY_INTEREST_KIND: Record<string, string> = { reserva: "reservation", aviso: "notice" };
const LEGACY_INTEREST_STATUS: Record<string, string> = { novo: "new", atendido: "fulfilled", cancelado: "cancelled" };
const LEGACY_PALETTE: Record<string, string> = {
  tinta: "ink",
  papel: "paper",
  ardosia: "slate",
  vinho: "wine",
  salvia: "sage",
  ocre: "ochre",
};
const LEGACY_ATMOSPHERE: Record<string, string> = {
  melancolica: "melancholic",
  acolhedora: "comforting",
  sombria: "dark",
  luminosa: "luminous",
  inquietante: "unsettling",
  ironica: "ironic",
  contemplativa: "contemplative",
  intensa: "intense",
  onirica: "dreamlike",
  nostalgica: "nostalgic",
  tensa: "tense",
  crua: "raw",
};
const LEGACY_STYLE: Record<string, string> = {
  lirico: "lyrical",
  seco: "spare",
  ironico: "wry",
  coloquial: "colloquial",
  classico: "classical",
  introspectivo: "introspective",
  ensaistico: "essayistic",
  documental: "documentary",
  fabular: "fable",
};
const LEGACY_EXPERIENCE: Record<string, string> = {
  sentada: "one_sitting",
  devagar: "slow_read",
  pensar: "lingering",
  emocionar: "moving",
  rir: "funny",
  sono: "gripping",
  viajar: "transporting",
  reconhecer: "relatable",
  desafiar: "challenging",
  consolar: "consoling",
};

function remapColumn(database: Database.Database, table: string, column: string, mapping: Record<string, string>): void {
  const statement = database.prepare(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`);
  for (const [legacy, current] of Object.entries(mapping)) statement.run(current, legacy);
}

function remapJsonIds(database: Database.Database, column: string, mapping: Record<string, string>): void {
  const statement = database.prepare(`UPDATE book_semantics SET ${column} = REPLACE(${column}, ?, ?)`);
  for (const [legacy, current] of Object.entries(mapping)) statement.run(`"${legacy}"`, `"${current}"`);
}

function translateStoredValues(database: Database.Database): void {
  remapColumn(database, "book_semantics", "status", LEGACY_SEMANTIC_STATUS);
  remapColumn(database, "book_semantics", "origin", LEGACY_ORIGIN);
  remapColumn(database, "book_semantics", "confidence", LEGACY_CONFIDENCE);
  remapColumn(database, "books", "staff_note_origin", LEGACY_NOTE_ORIGIN);
  remapColumn(database, "interests", "kind", LEGACY_INTEREST_KIND);
  remapColumn(database, "interests", "status", LEGACY_INTEREST_STATUS);
  remapColumn(database, "showcases", "palette", LEGACY_PALETTE);
  remapJsonIds(database, "atmospheres", LEGACY_ATMOSPHERE);
  remapJsonIds(database, "styles", LEGACY_STYLE);
  remapJsonIds(database, "experiences", LEGACY_EXPERIENCE);
  const evidence = database.prepare("UPDATE book_semantics SET evidence = REPLACE(evidence, ?, ?)");
  for (const mapping of [LEGACY_ATMOSPHERE, LEGACY_STYLE, LEGACY_EXPERIENCE]) {
    for (const [legacy, current] of Object.entries(mapping)) {
      evidence.run(`"attribute":"${legacy}"`, `"attribute":"${current}"`);
    }
  }
}

const MIGRATIONS: { version: number; run: (database: Database.Database) => void }[] = [
  { version: 2, run: translateStoredValues },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export function migrate(database: Database.Database): void {
  const current = database.pragma("user_version", { simple: true }) as number;
  for (const migration of MIGRATIONS) {
    if (current >= migration.version) continue;
    database.transaction(() => migration.run(database))();
    database.pragma(`user_version = ${migration.version}`);
  }
}
