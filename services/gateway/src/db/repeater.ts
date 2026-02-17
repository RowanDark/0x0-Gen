import type {
  RepeaterTab,
  RepeaterRequest,
  RepeaterHistoryEntry,
  RepeaterResponse,
} from "@0x0-gen/contracts";
import { getDb } from "./index.js";

const HISTORY_LIMIT = 100;

interface TabRow {
  id: string;
  name: string;
  project_id: string | null;
  request_method: string;
  request_url: string;
  request_headers: string;
  request_body: string | null;
  created_at: number;
  updated_at: number;
}

interface HistoryRow {
  id: string;
  tab_id: string;
  timestamp: number;
  request_method: string;
  request_url: string;
  request_headers: string;
  request_body: string | null;
  response_status_code: number | null;
  response_status_message: string | null;
  response_headers: string | null;
  response_body: string | null;
  response_content_length: number | null;
  duration: number;
  error: string | null;
}

function rowToRequest(row: TabRow): RepeaterRequest {
  return {
    method: row.request_method as RepeaterRequest["method"],
    url: row.request_url,
    headers: JSON.parse(row.request_headers) as Record<string, string>,
    body: row.request_body,
  };
}

function rowToTab(row: TabRow, history: RepeaterHistoryEntry[]): RepeaterTab {
  return {
    id: row.id,
    name: row.name,
    projectId: row.project_id ?? undefined,
    request: rowToRequest(row),
    history,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function historyRowToEntry(row: HistoryRow): RepeaterHistoryEntry {
  const request: RepeaterRequest = {
    method: row.request_method as RepeaterRequest["method"],
    url: row.request_url,
    headers: JSON.parse(row.request_headers) as Record<string, string>,
    body: row.request_body,
  };

  let response: RepeaterResponse | null = null;
  if (row.response_status_code !== null) {
    response = {
      statusCode: row.response_status_code,
      statusMessage: row.response_status_message ?? "",
      headers: row.response_headers
        ? (JSON.parse(row.response_headers) as Record<string, string>)
        : {},
      body: row.response_body,
      contentLength: row.response_content_length ?? 0,
    };
  }

  return {
    id: row.id,
    timestamp: row.timestamp,
    request,
    response,
    duration: row.duration,
    error: row.error,
  };
}

export function createTab(data: {
  id: string;
  name: string;
  projectId?: string;
  request: RepeaterRequest;
  now: number;
}): RepeaterTab {
  const db = getDb();
  db.prepare(`
    INSERT INTO repeater_tabs (id, name, project_id, request_method, request_url, request_headers, request_body, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.name,
    data.projectId ?? null,
    data.request.method,
    data.request.url,
    JSON.stringify(data.request.headers),
    data.request.body,
    data.now,
    data.now,
  );

  const row = db.prepare("SELECT * FROM repeater_tabs WHERE id = ?").get(data.id) as TabRow;
  return rowToTab(row, []);
}

export function listTabs(projectId?: string): RepeaterTab[] {
  const db = getDb();
  let sql = "SELECT * FROM repeater_tabs WHERE 1=1";
  const params: (string | number)[] = [];
  if (projectId) {
    sql += " AND project_id = ?";
    params.push(projectId);
  }
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params) as TabRow[];
  return rows.map((row) => rowToTab(row, getTabHistory(row.id)));
}

export function getTab(id: string): RepeaterTab | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM repeater_tabs WHERE id = ?").get(id) as
    | TabRow
    | undefined;
  if (!row) return null;
  return rowToTab(row, getTabHistory(id));
}

export function updateTab(
  id: string,
  data: { name?: string; request?: RepeaterRequest; now: number },
): RepeaterTab | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM repeater_tabs WHERE id = ?").get(id) as
    | TabRow
    | undefined;
  if (!row) return null;

  const name = data.name ?? row.name;
  const request = data.request ?? rowToRequest(row);

  db.prepare(`
    UPDATE repeater_tabs
    SET name = ?, request_method = ?, request_url = ?, request_headers = ?, request_body = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name,
    request.method,
    request.url,
    JSON.stringify(request.headers),
    request.body,
    data.now,
    id,
  );

  const updated = db.prepare("SELECT * FROM repeater_tabs WHERE id = ?").get(id) as TabRow;
  return rowToTab(updated, getTabHistory(id));
}

export function deleteTab(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM repeater_tabs WHERE id = ?").run(id);
  return result.changes > 0;
}

export function insertHistoryEntry(
  tabId: string,
  entry: RepeaterHistoryEntry,
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO repeater_history (
      id, tab_id, timestamp,
      request_method, request_url, request_headers, request_body,
      response_status_code, response_status_message, response_headers, response_body, response_content_length,
      duration, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id,
    tabId,
    entry.timestamp,
    entry.request.method,
    entry.request.url,
    JSON.stringify(entry.request.headers),
    entry.request.body,
    entry.response?.statusCode ?? null,
    entry.response?.statusMessage ?? null,
    entry.response ? JSON.stringify(entry.response.headers) : null,
    entry.response?.body ?? null,
    entry.response?.contentLength ?? null,
    entry.duration,
    entry.error,
  );

  // Enforce max 100 history entries per tab — delete oldest beyond limit
  db.prepare(`
    DELETE FROM repeater_history
    WHERE tab_id = ?
      AND id NOT IN (
        SELECT id FROM repeater_history
        WHERE tab_id = ?
        ORDER BY timestamp DESC
        LIMIT ${HISTORY_LIMIT}
      )
  `).run(tabId, tabId);
}

export function getTabHistory(tabId: string): RepeaterHistoryEntry[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM repeater_history WHERE tab_id = ? ORDER BY timestamp DESC")
    .all(tabId) as HistoryRow[];
  return rows.map(historyRowToEntry);
}

export function clearTabHistory(tabId: string): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM repeater_history WHERE tab_id = ?").run(tabId);
  return result.changes;
}
