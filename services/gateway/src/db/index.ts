import Database from "better-sqlite3";
import { createLogger } from "@0x0-gen/logger";
import path from "node:path";
import fs from "node:fs";

const logger = createLogger("gateway:db");

let db: Database.Database | null = null;

function getDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir) return envDir;
  return process.cwd();
}

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "0x0gen.db");
  logger.info(`Opening database: ${dbPath}`);

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);

  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      payload TEXT,
      project_id TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  `);

  logger.info("Database schema initialized");
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info("Database closed");
  }
}

export function resetDb(): void {
  db = null;
}
