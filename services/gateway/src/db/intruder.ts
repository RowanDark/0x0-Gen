import { createLogger } from "@0x0-gen/logger";
import type {
  IntruderConfig,
  IntruderAttack,
  IntruderResult,
  IntruderPosition,
  IntruderPayloadSet,
  IntruderOptions,
  AttackType,
  AttackStatus,
  IntruderResponse,
} from "@0x0-gen/contracts";
import { getDb } from "./index.js";

const logger = createLogger("gateway:db:intruder");

// --- Schema initialization ---

export function initIntruderSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS intruder_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_id TEXT,
      base_request TEXT NOT NULL,
      positions TEXT NOT NULL,
      payload_sets TEXT NOT NULL,
      attack_type TEXT NOT NULL,
      options TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_intruder_configs_project_id ON intruder_configs(project_id);

    CREATE TABLE IF NOT EXISTS intruder_attacks (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      status TEXT NOT NULL,
      total_requests INTEGER NOT NULL,
      completed_requests INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_intruder_attacks_config_id ON intruder_attacks(config_id);

    CREATE TABLE IF NOT EXISTS intruder_results (
      id TEXT PRIMARY KEY,
      attack_id TEXT NOT NULL,
      request_index INTEGER NOT NULL,
      payloads TEXT NOT NULL,
      request TEXT NOT NULL,
      response_status INTEGER,
      response_status_message TEXT,
      response_headers TEXT,
      response_body TEXT,
      response_length INTEGER,
      duration INTEGER NOT NULL,
      error TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_intruder_results_attack_id ON intruder_results(attack_id);
    CREATE INDEX IF NOT EXISTS idx_intruder_results_timestamp ON intruder_results(timestamp);
  `);

  logger.info("Intruder schema initialized");
}

// --- Config row mapping ---

interface ConfigRow {
  id: string;
  name: string;
  project_id: string | null;
  base_request: string;
  positions: string;
  payload_sets: string;
  attack_type: string;
  options: string;
  created_at: number;
  updated_at: number;
}

function rowToConfig(row: ConfigRow): IntruderConfig & { createdAt: number; updatedAt: number } {
  return {
    id: row.id,
    name: row.name,
    projectId: row.project_id ?? undefined,
    baseRequest: row.base_request,
    positions: JSON.parse(row.positions) as IntruderPosition[],
    payloadSets: JSON.parse(row.payload_sets) as IntruderPayloadSet[],
    attackType: row.attack_type as AttackType,
    options: JSON.parse(row.options) as IntruderOptions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Config CRUD ---

export function createConfig(config: {
  id: string;
  name: string;
  projectId?: string;
  baseRequest: string;
  positions: IntruderPosition[];
  payloadSets: IntruderPayloadSet[];
  attackType: AttackType;
  options: IntruderOptions;
  now: number;
}): IntruderConfig & { createdAt: number; updatedAt: number } {
  const db = getDb();
  db.prepare(
    `INSERT INTO intruder_configs (id, name, project_id, base_request, positions, payload_sets, attack_type, options, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    config.id,
    config.name,
    config.projectId ?? null,
    config.baseRequest,
    JSON.stringify(config.positions),
    JSON.stringify(config.payloadSets),
    config.attackType,
    JSON.stringify(config.options),
    config.now,
    config.now,
  );

  logger.info(`Created intruder config ${config.id}: ${config.name}`);
  return getConfig(config.id)!;
}

export function listConfigs(
  projectId?: string,
): (IntruderConfig & { createdAt: number; updatedAt: number })[] {
  const db = getDb();
  let sql = "SELECT * FROM intruder_configs";
  const params: string[] = [];

  if (projectId) {
    sql += " WHERE project_id = ?";
    params.push(projectId);
  }

  sql += " ORDER BY updated_at DESC";
  const rows = db.prepare(sql).all(...params) as ConfigRow[];
  return rows.map(rowToConfig);
}

export function getConfig(
  id: string,
): (IntruderConfig & { createdAt: number; updatedAt: number }) | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM intruder_configs WHERE id = ?")
    .get(id) as ConfigRow | undefined;
  return row ? rowToConfig(row) : null;
}

export function updateConfig(
  id: string,
  data: {
    name?: string;
    baseRequest?: string;
    positions?: IntruderPosition[];
    payloadSets?: IntruderPayloadSet[];
    attackType?: AttackType;
    options?: IntruderOptions;
    now: number;
  },
): (IntruderConfig & { createdAt: number; updatedAt: number }) | null {
  const db = getDb();
  const existing = getConfig(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.baseRequest !== undefined) {
    updates.push("base_request = ?");
    params.push(data.baseRequest);
  }
  if (data.positions !== undefined) {
    updates.push("positions = ?");
    params.push(JSON.stringify(data.positions));
  }
  if (data.payloadSets !== undefined) {
    updates.push("payload_sets = ?");
    params.push(JSON.stringify(data.payloadSets));
  }
  if (data.attackType !== undefined) {
    updates.push("attack_type = ?");
    params.push(data.attackType);
  }
  if (data.options !== undefined) {
    updates.push("options = ?");
    params.push(JSON.stringify(data.options));
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = ?");
  params.push(data.now);
  params.push(id);

  db.prepare(
    `UPDATE intruder_configs SET ${updates.join(", ")} WHERE id = ?`,
  ).run(...params);

  logger.info(`Updated intruder config ${id}`);
  return getConfig(id);
}

export function deleteConfig(id: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM intruder_configs WHERE id = ?")
    .run(id);

  if (result.changes > 0) {
    logger.info(`Deleted intruder config ${id}`);
    return true;
  }
  return false;
}

// --- Attack row mapping ---

interface AttackRow {
  id: string;
  config_id: string;
  status: string;
  total_requests: number;
  completed_requests: number;
  started_at: number | null;
  completed_at: number | null;
}

function rowToAttack(row: AttackRow): IntruderAttack {
  return {
    id: row.id,
    configId: row.config_id,
    status: row.status as AttackStatus,
    totalRequests: row.total_requests,
    completedRequests: row.completed_requests,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    results: [],
  };
}

// --- Attack persistence ---

export function insertAttack(attack: IntruderAttack): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO intruder_attacks (id, config_id, status, total_requests, completed_requests, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    attack.id,
    attack.configId,
    attack.status,
    attack.totalRequests,
    attack.completedRequests,
    attack.startedAt,
    attack.completedAt,
  );
}

export function updateAttack(attack: IntruderAttack): void {
  const db = getDb();
  db.prepare(
    `UPDATE intruder_attacks SET status = ?, completed_requests = ?, started_at = ?, completed_at = ? WHERE id = ?`,
  ).run(
    attack.status,
    attack.completedRequests,
    attack.startedAt,
    attack.completedAt,
    attack.id,
  );
}

export function getAttack(id: string): IntruderAttack | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM intruder_attacks WHERE id = ?")
    .get(id) as AttackRow | undefined;
  return row ? rowToAttack(row) : null;
}

// --- Result persistence ---

interface ResultRow {
  id: string;
  attack_id: string;
  request_index: number;
  payloads: string;
  request: string;
  response_status: number | null;
  response_status_message: string | null;
  response_headers: string | null;
  response_body: string | null;
  response_length: number | null;
  duration: number;
  error: string | null;
  timestamp: number;
}

function rowToResult(row: ResultRow, configId: string): IntruderResult {
  let response: IntruderResponse | null = null;
  if (row.response_status !== null) {
    response = {
      statusCode: row.response_status,
      statusMessage: row.response_status_message ?? "",
      headers: row.response_headers ? (JSON.parse(row.response_headers) as Record<string, string>) : {},
      body: row.response_body,
      contentLength: row.response_length ?? 0,
    };
  }

  return {
    id: row.id,
    configId,
    requestIndex: row.request_index,
    payloads: JSON.parse(row.payloads) as Record<string, string>,
    request: row.request,
    response,
    duration: row.duration,
    error: row.error,
    timestamp: row.timestamp,
  };
}

export function insertResult(attackId: string, result: IntruderResult): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO intruder_results (id, attack_id, request_index, payloads, request, response_status, response_status_message, response_headers, response_body, response_length, duration, error, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    result.id,
    attackId,
    result.requestIndex,
    JSON.stringify(result.payloads),
    result.request,
    result.response?.statusCode ?? null,
    result.response?.statusMessage ?? null,
    result.response?.headers ? JSON.stringify(result.response.headers) : null,
    result.response?.body ?? null,
    result.response?.contentLength ?? null,
    result.duration,
    result.error,
    result.timestamp,
  );
}

export function getResults(
  attackId: string,
  configId: string,
  options?: { limit?: number; offset?: number },
): IntruderResult[] {
  const db = getDb();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const rows = db
    .prepare(
      "SELECT * FROM intruder_results WHERE attack_id = ? ORDER BY request_index ASC LIMIT ? OFFSET ?",
    )
    .all(attackId, limit, offset) as ResultRow[];

  return rows.map((row) => rowToResult(row, configId));
}
