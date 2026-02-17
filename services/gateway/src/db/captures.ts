import type { CapturedExchange, ProxyRequest, ProxyResponse } from "@0x0-gen/contracts";
import { getDb } from "./index.js";

interface CaptureRow {
  id: string;
  project_id: string | null;
  tags: string;
  req_id: string;
  req_timestamp: number;
  req_method: string;
  req_url: string;
  req_host: string;
  req_path: string;
  req_headers: string;
  req_body: string | null;
  req_content_length: number;
  res_id: string | null;
  res_timestamp: number | null;
  res_status_code: number | null;
  res_status_message: string | null;
  res_headers: string | null;
  res_body: string | null;
  res_content_length: number | null;
  res_duration: number | null;
}

function rowToExchange(row: CaptureRow): CapturedExchange {
  const request: ProxyRequest = {
    id: row.req_id,
    timestamp: row.req_timestamp,
    projectId: row.project_id ?? undefined,
    method: row.req_method,
    url: row.req_url,
    host: row.req_host,
    path: row.req_path,
    headers: JSON.parse(row.req_headers),
    body: row.req_body,
    contentLength: row.req_content_length,
  };

  let response: ProxyResponse | null = null;
  if (row.res_id) {
    response = {
      id: row.res_id,
      requestId: row.req_id,
      timestamp: row.res_timestamp!,
      statusCode: row.res_status_code!,
      statusMessage: row.res_status_message!,
      headers: JSON.parse(row.res_headers!),
      body: row.res_body,
      contentLength: row.res_content_length!,
      duration: row.res_duration!,
    };
  }

  return {
    id: row.id,
    request,
    response,
    projectId: row.project_id ?? undefined,
    tags: JSON.parse(row.tags),
  };
}

export function insertCapture(exchange: CapturedExchange): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO captures (
      id, project_id, tags,
      req_id, req_timestamp, req_method, req_url, req_host, req_path,
      req_headers, req_body, req_content_length,
      res_id, res_timestamp, res_status_code, res_status_message,
      res_headers, res_body, res_content_length, res_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    exchange.id,
    exchange.projectId ?? null,
    JSON.stringify(exchange.tags),
    exchange.request.id,
    exchange.request.timestamp,
    exchange.request.method,
    exchange.request.url,
    exchange.request.host,
    exchange.request.path,
    JSON.stringify(exchange.request.headers),
    exchange.request.body,
    exchange.request.contentLength,
    exchange.response?.id ?? null,
    exchange.response?.timestamp ?? null,
    exchange.response?.statusCode ?? null,
    exchange.response?.statusMessage ?? null,
    exchange.response ? JSON.stringify(exchange.response.headers) : null,
    exchange.response?.body ?? null,
    exchange.response?.contentLength ?? null,
    exchange.response?.duration ?? null,
  );
}

export function listCaptures(options: {
  projectId?: string;
  limit?: number;
  offset?: number;
}): CapturedExchange[] {
  const db = getDb();
  const { projectId, limit = 100, offset = 0 } = options;

  let sql = "SELECT * FROM captures WHERE 1=1";
  const params: (string | number)[] = [];

  if (projectId) {
    sql += " AND project_id = ?";
    params.push(projectId);
  }

  sql += " ORDER BY req_timestamp DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as CaptureRow[];
  return rows.map(rowToExchange);
}

export function getCapture(id: string): CapturedExchange | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM captures WHERE id = ?")
    .get(id) as CaptureRow | undefined;
  return row ? rowToExchange(row) : null;
}

export function clearCaptures(projectId?: string): number {
  const db = getDb();
  if (projectId) {
    const result = db.prepare("DELETE FROM captures WHERE project_id = ?").run(projectId);
    return result.changes;
  }
  const result = db.prepare("DELETE FROM captures").run();
  return result.changes;
}

export function getCaptureCount(projectId?: string): number {
  const db = getDb();
  if (projectId) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM captures WHERE project_id = ?")
      .get(projectId) as { count: number };
    return row.count;
  }
  const row = db.prepare("SELECT COUNT(*) as count FROM captures").get() as { count: number };
  return row.count;
}
