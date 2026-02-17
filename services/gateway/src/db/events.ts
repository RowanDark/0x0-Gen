import type { EventMessage } from "@0x0-gen/contracts";
import { getDb } from "./index.js";

interface EventRow {
  id: string;
  type: string;
  source: string;
  payload: string | null;
  project_id: string | null;
  timestamp: string;
}

function rowToEvent(row: EventRow): EventMessage {
  return {
    id: row.id,
    type: row.type as EventMessage["type"],
    source: row.source,
    payload: row.payload ? JSON.parse(row.payload) : null,
    projectId: row.project_id ?? undefined,
    timestamp: row.timestamp,
  };
}

export function insertEvent(event: EventMessage): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO events (id, type, source, payload, project_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    event.id,
    event.type,
    event.source,
    event.payload !== undefined && event.payload !== null ? JSON.stringify(event.payload) : null,
    event.projectId ?? null,
    event.timestamp,
  );

  // Keep only the last 1000 events per project
  if (event.projectId) {
    db.prepare(`
      DELETE FROM events WHERE id IN (
        SELECT id FROM events WHERE project_id = ?
        ORDER BY timestamp DESC
        LIMIT -1 OFFSET 1000
      )
    `).run(event.projectId);
  } else {
    db.prepare(`
      DELETE FROM events WHERE id IN (
        SELECT id FROM events WHERE project_id IS NULL
        ORDER BY timestamp DESC
        LIMIT -1 OFFSET 1000
      )
    `).run();
  }
}

export function listEvents(options: {
  projectId?: string;
  limit?: number;
  type?: string;
}): EventMessage[] {
  const db = getDb();
  const { projectId, limit = 100, type } = options;

  let sql = "SELECT * FROM events WHERE 1=1";
  const params: (string | number)[] = [];

  if (projectId) {
    sql += " AND project_id = ?";
    params.push(projectId);
  }

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }

  sql += " ORDER BY timestamp DESC LIMIT ?";
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as EventRow[];
  return rows.map(rowToEvent);
}
