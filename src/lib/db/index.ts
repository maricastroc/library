import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { migrate } from "./migrations";
import { SCHEMA_SQL } from "./schema";

type GlobalWithDb = typeof globalThis & { __subtextDb?: Database.Database };

function resolveDatabasePath(): string {
  const configured = process.env.SUBTEXT_DB;
  if (configured === ":memory:") return configured;
  if (configured && isAbsolute(configured)) return configured;
  return join(process.cwd(), "data", basename(configured ?? "subtext.db"));
}

function open(): Database.Database {
  const path = resolveDatabasePath();
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma("busy_timeout = 8000");
  database.pragma("journal_mode = TRUNCATE");
  database.pragma("foreign_keys = ON");
  database.exec(SCHEMA_SQL);
  migrate(database);
  return database;
}

export function db(): Database.Database {
  const scope = globalThis as GlobalWithDb;
  if (!scope.__subtextDb || !scope.__subtextDb.open) scope.__subtextDb = open();
  return scope.__subtextDb;
}

export function closeDb(): void {
  const scope = globalThis as GlobalWithDb;
  if (scope.__subtextDb?.open) scope.__subtextDb.close();
  scope.__subtextDb = undefined;
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
