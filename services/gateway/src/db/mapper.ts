import { createLogger } from "@0x0-gen/logger";
import type {
  MapperCanvas,
  MapperNode,
  MapperEdge,
  MapperViewport,
  MapperNodeStyle,
  MapperEdgeStyle,
  EntityType,
} from "@0x0-gen/contracts";
import { getDb } from "./index.js";

const logger = createLogger("gateway:db:mapper");

// --- Schema initialization ---

export function initMapperSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS mapper_canvases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      viewport TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mapper_canvases_project_id ON mapper_canvases(project_id);

    CREATE TABLE IF NOT EXISTS mapper_nodes (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL,
      entity_id TEXT,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      style TEXT NOT NULL DEFAULT '{}',
      data TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (canvas_id) REFERENCES mapper_canvases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_mapper_nodes_canvas_id ON mapper_nodes(canvas_id);
    CREATE INDEX IF NOT EXISTS idx_mapper_nodes_entity_id ON mapper_nodes(entity_id);

    CREATE TABLE IF NOT EXISTS mapper_edges (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL,
      relationship_id TEXT,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT,
      style TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (canvas_id) REFERENCES mapper_canvases(id) ON DELETE CASCADE,
      FOREIGN KEY (from_node_id) REFERENCES mapper_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (to_node_id) REFERENCES mapper_nodes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_mapper_edges_canvas_id ON mapper_edges(canvas_id);
    CREATE INDEX IF NOT EXISTS idx_mapper_edges_from_node ON mapper_edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_mapper_edges_to_node ON mapper_edges(to_node_id);
  `);

  logger.info("Mapper schema initialized");
}

// --- Canvas row mapping ---

interface CanvasRow {
  id: string;
  project_id: string;
  name: string;
  viewport: string;
  created_at: number;
  updated_at: number;
}

function rowToCanvas(row: CanvasRow, nodes: MapperNode[], edges: MapperEdge[]): MapperCanvas {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    nodes,
    edges,
    viewport: JSON.parse(row.viewport) as MapperViewport,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCanvasSummary(row: CanvasRow): MapperCanvas {
  return rowToCanvas(row, [], []);
}

// --- Node row mapping ---

interface NodeRow {
  id: string;
  canvas_id: string;
  entity_id: string | null;
  type: string;
  label: string;
  x: number;
  y: number;
  pinned: number;
  style: string;
  data: string;
}

function rowToNode(row: NodeRow): MapperNode {
  return {
    id: row.id,
    entityId: row.entity_id,
    type: row.type as EntityType,
    label: row.label,
    x: row.x,
    y: row.y,
    pinned: row.pinned === 1,
    style: JSON.parse(row.style) as MapperNodeStyle,
    data: JSON.parse(row.data) as Record<string, unknown>,
  };
}

// --- Edge row mapping ---

interface EdgeRow {
  id: string;
  canvas_id: string;
  relationship_id: string | null;
  from_node_id: string;
  to_node_id: string;
  type: string;
  label: string | null;
  style: string;
}

function rowToEdge(row: EdgeRow): MapperEdge {
  return {
    id: row.id,
    relationshipId: row.relationship_id,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    type: row.type,
    label: row.label ?? undefined,
    style: JSON.parse(row.style) as MapperEdgeStyle,
  };
}

// --- Canvas CRUD ---

export function createCanvas(canvas: {
  id: string;
  projectId: string;
  name: string;
  now: number;
}): MapperCanvas {
  const db = getDb();
  db.prepare(
    `INSERT INTO mapper_canvases (id, project_id, name, viewport, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    canvas.id,
    canvas.projectId,
    canvas.name,
    JSON.stringify({ x: 0, y: 0, zoom: 1 }),
    canvas.now,
    canvas.now,
  );

  logger.info(`Created mapper canvas ${canvas.id}: ${canvas.name}`);
  return getCanvas(canvas.id)!;
}

export function listCanvases(projectId: string): MapperCanvas[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM mapper_canvases WHERE project_id = ? ORDER BY updated_at DESC")
    .all(projectId) as CanvasRow[];
  return rows.map(rowToCanvasSummary);
}

export function getCanvas(id: string): MapperCanvas | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM mapper_canvases WHERE id = ?").get(id) as CanvasRow | undefined;
  if (!row) return null;

  const nodeRows = db
    .prepare("SELECT * FROM mapper_nodes WHERE canvas_id = ?")
    .all(id) as NodeRow[];
  const edgeRows = db
    .prepare("SELECT * FROM mapper_edges WHERE canvas_id = ?")
    .all(id) as EdgeRow[];

  return rowToCanvas(row, nodeRows.map(rowToNode), edgeRows.map(rowToEdge));
}

export function updateCanvas(
  id: string,
  data: { name?: string; viewport?: MapperViewport; now: number },
): MapperCanvas | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM mapper_canvases WHERE id = ?").get(id) as CanvasRow | undefined;
  if (!row) return null;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.viewport !== undefined) {
    updates.push("viewport = ?");
    params.push(JSON.stringify(data.viewport));
  }

  if (updates.length === 0) return getCanvas(id);

  updates.push("updated_at = ?");
  params.push(data.now);
  params.push(id);

  db.prepare(`UPDATE mapper_canvases SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  logger.info(`Updated mapper canvas ${id}`);
  return getCanvas(id);
}

export function deleteCanvas(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM mapper_canvases WHERE id = ?").run(id);
  if (result.changes > 0) {
    logger.info(`Deleted mapper canvas ${id}`);
    return true;
  }
  return false;
}

// --- Node CRUD ---

export function addNode(canvasId: string, node: {
  id: string;
  entityId?: string | null;
  type: string;
  label: string;
  x: number;
  y: number;
  pinned?: boolean;
  style?: MapperNodeStyle;
  data?: Record<string, unknown>;
}): MapperNode {
  const db = getDb();
  db.prepare(
    `INSERT INTO mapper_nodes (id, canvas_id, entity_id, type, label, x, y, pinned, style, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    node.id,
    canvasId,
    node.entityId ?? null,
    node.type,
    node.label,
    node.x,
    node.y,
    node.pinned ? 1 : 0,
    JSON.stringify(node.style ?? {}),
    JSON.stringify(node.data ?? {}),
  );

  touchCanvas(canvasId);
  return getNode(node.id)!;
}

export function addNodesBulk(canvasId: string, nodes: Array<{
  id: string;
  entityId?: string | null;
  type: string;
  label: string;
  x: number;
  y: number;
  pinned?: boolean;
  style?: MapperNodeStyle;
  data?: Record<string, unknown>;
}>): MapperNode[] {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO mapper_nodes (id, canvas_id, entity_id, type, label, x, y, pinned, style, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const node of nodes) {
      stmt.run(
        node.id,
        canvasId,
        node.entityId ?? null,
        node.type,
        node.label,
        node.x,
        node.y,
        node.pinned ? 1 : 0,
        JSON.stringify(node.style ?? {}),
        JSON.stringify(node.data ?? {}),
      );
    }
  });

  tx();
  touchCanvas(canvasId);

  return nodes.map((n) => getNode(n.id)!).filter(Boolean);
}

export function getNode(id: string): MapperNode | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM mapper_nodes WHERE id = ?").get(id) as NodeRow | undefined;
  return row ? rowToNode(row) : null;
}

export function updateNode(
  id: string,
  canvasId: string,
  data: { x?: number; y?: number; pinned?: boolean; label?: string; style?: MapperNodeStyle },
): MapperNode | null {
  const db = getDb();
  const existing = getNode(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.x !== undefined) {
    updates.push("x = ?");
    params.push(data.x);
  }
  if (data.y !== undefined) {
    updates.push("y = ?");
    params.push(data.y);
  }
  if (data.pinned !== undefined) {
    updates.push("pinned = ?");
    params.push(data.pinned ? 1 : 0);
  }
  if (data.label !== undefined) {
    updates.push("label = ?");
    params.push(data.label);
  }
  if (data.style !== undefined) {
    updates.push("style = ?");
    params.push(JSON.stringify(data.style));
  }

  if (updates.length === 0) return existing;

  params.push(id);
  db.prepare(`UPDATE mapper_nodes SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  touchCanvas(canvasId);

  return getNode(id);
}

export function deleteNode(id: string, canvasId: string): boolean {
  const db = getDb();
  // Delete edges connected to this node
  db.prepare("DELETE FROM mapper_edges WHERE from_node_id = ? OR to_node_id = ?").run(id, id);
  const result = db.prepare("DELETE FROM mapper_nodes WHERE id = ?").run(id);
  if (result.changes > 0) {
    touchCanvas(canvasId);
    return true;
  }
  return false;
}

// --- Edge CRUD ---

export function addEdge(canvasId: string, edge: {
  id: string;
  relationshipId?: string | null;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  label?: string;
  style?: MapperEdgeStyle;
}): MapperEdge {
  const db = getDb();
  db.prepare(
    `INSERT INTO mapper_edges (id, canvas_id, relationship_id, from_node_id, to_node_id, type, label, style)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    edge.id,
    canvasId,
    edge.relationshipId ?? null,
    edge.fromNodeId,
    edge.toNodeId,
    edge.type,
    edge.label ?? null,
    JSON.stringify(edge.style ?? {}),
  );

  touchCanvas(canvasId);
  return getEdge(edge.id)!;
}

export function addEdgesBulk(canvasId: string, edges: Array<{
  id: string;
  relationshipId?: string | null;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  label?: string;
  style?: MapperEdgeStyle;
}>): MapperEdge[] {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO mapper_edges (id, canvas_id, relationship_id, from_node_id, to_node_id, type, label, style)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const edge of edges) {
      stmt.run(
        edge.id,
        canvasId,
        edge.relationshipId ?? null,
        edge.fromNodeId,
        edge.toNodeId,
        edge.type,
        edge.label ?? null,
        JSON.stringify(edge.style ?? {}),
      );
    }
  });

  tx();
  touchCanvas(canvasId);

  return edges.map((e) => getEdge(e.id)!).filter(Boolean);
}

export function getEdge(id: string): MapperEdge | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM mapper_edges WHERE id = ?").get(id) as EdgeRow | undefined;
  return row ? rowToEdge(row) : null;
}

export function deleteEdge(id: string, canvasId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM mapper_edges WHERE id = ?").run(id);
  if (result.changes > 0) {
    touchCanvas(canvasId);
    return true;
  }
  return false;
}

// --- Helpers ---

function touchCanvas(canvasId: string): void {
  const db = getDb();
  db.prepare("UPDATE mapper_canvases SET updated_at = ? WHERE id = ?").run(Date.now(), canvasId);
}

export function getNodesByEntity(canvasId: string, entityId: string): MapperNode[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM mapper_nodes WHERE canvas_id = ? AND entity_id = ?")
    .all(canvasId, entityId) as NodeRow[];
  return rows.map(rowToNode);
}

export function getCanvasNodes(canvasId: string): MapperNode[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM mapper_nodes WHERE canvas_id = ?")
    .all(canvasId) as NodeRow[];
  return rows.map(rowToNode);
}

export function getCanvasEdges(canvasId: string): MapperEdge[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM mapper_edges WHERE canvas_id = ?")
    .all(canvasId) as EdgeRow[];
  return rows.map(rowToEdge);
}
