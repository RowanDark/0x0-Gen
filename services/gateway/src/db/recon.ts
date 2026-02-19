import { createLogger } from "@0x0-gen/logger";
import type {
  ReconProject,
  ReconEntity,
  ReconRelationship,
  ReconImport,
  ReconImportStats,
  ReconImportError,
  EntityCategory,
  EntityType,
} from "@0x0-gen/contracts";
import { getDb } from "./index.js";

const logger = createLogger("gateway:db:recon");

// --- Schema initialization ---

export function initReconSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS recon_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      targets TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recon_imports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source TEXT NOT NULL,
      format TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      imported_at INTEGER NOT NULL,
      stats TEXT NOT NULL DEFAULT '{}',
      errors TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (project_id) REFERENCES recon_projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recon_imports_project_id ON recon_imports(project_id);

    CREATE TABLE IF NOT EXISTS recon_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      import_id TEXT,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      normalized_value TEXT NOT NULL,
      attributes TEXT NOT NULL DEFAULT '{}',
      confidence INTEGER NOT NULL DEFAULT 50,
      sources TEXT NOT NULL DEFAULT '[]',
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES recon_projects(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_recon_entities_project_normalized
      ON recon_entities(project_id, type, normalized_value);
    CREATE INDEX IF NOT EXISTS idx_recon_entities_project_id ON recon_entities(project_id);
    CREATE INDEX IF NOT EXISTS idx_recon_entities_category ON recon_entities(project_id, category);
    CREATE INDEX IF NOT EXISTS idx_recon_entities_type ON recon_entities(project_id, type);

    CREATE TABLE IF NOT EXISTS recon_relationships (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      from_entity_id TEXT NOT NULL,
      to_entity_id TEXT NOT NULL,
      type TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 50,
      source TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES recon_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (from_entity_id) REFERENCES recon_entities(id) ON DELETE CASCADE,
      FOREIGN KEY (to_entity_id) REFERENCES recon_entities(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recon_relationships_project_id ON recon_relationships(project_id);
    CREATE INDEX IF NOT EXISTS idx_recon_relationships_from ON recon_relationships(from_entity_id);
    CREATE INDEX IF NOT EXISTS idx_recon_relationships_to ON recon_relationships(to_entity_id);
  `);

  logger.info("Recon schema initialized");
}

// --- Project row mapping ---

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  targets: string;
  created_at: number;
  updated_at: number;
}

function rowToProject(row: ProjectRow): ReconProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    targets: JSON.parse(row.targets) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Project CRUD ---

export function createProject(project: {
  id: string;
  name: string;
  description?: string;
  targets?: string[];
  now: number;
}): ReconProject {
  const db = getDb();
  db.prepare(
    `INSERT INTO recon_projects (id, name, description, targets, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    project.id,
    project.name,
    project.description ?? null,
    JSON.stringify(project.targets ?? []),
    project.now,
    project.now,
  );

  logger.info(`Created recon project ${project.id}: ${project.name}`);
  return getProject(project.id)!;
}

export function listProjects(): ReconProject[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM recon_projects ORDER BY updated_at DESC").all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): ReconProject | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM recon_projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function updateProject(
  id: string,
  data: { name?: string; description?: string; targets?: string[]; now: number },
): ReconProject | null {
  const db = getDb();
  const existing = getProject(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.targets !== undefined) {
    updates.push("targets = ?");
    params.push(JSON.stringify(data.targets));
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = ?");
  params.push(data.now);
  params.push(id);

  db.prepare(`UPDATE recon_projects SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  logger.info(`Updated recon project ${id}`);
  return getProject(id);
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM recon_projects WHERE id = ?").run(id);
  if (result.changes > 0) {
    logger.info(`Deleted recon project ${id}`);
    return true;
  }
  return false;
}

// --- Import row mapping ---

interface ImportRow {
  id: string;
  project_id: string;
  source: string;
  format: string;
  filename: string;
  file_size: number;
  imported_at: number;
  stats: string;
  errors: string;
}

function rowToImport(row: ImportRow): ReconImport {
  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source,
    format: row.format,
    filename: row.filename,
    fileSize: row.file_size,
    importedAt: row.imported_at,
    stats: JSON.parse(row.stats) as ReconImportStats,
    errors: JSON.parse(row.errors) as ReconImportError[],
  };
}

// --- Import CRUD ---

export function insertImport(imp: {
  id: string;
  projectId: string;
  source: string;
  format: string;
  filename: string;
  fileSize: number;
  importedAt: number;
  stats: ReconImportStats;
  errors: ReconImportError[];
}): ReconImport {
  const db = getDb();
  db.prepare(
    `INSERT INTO recon_imports (id, project_id, source, format, filename, file_size, imported_at, stats, errors)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    imp.id,
    imp.projectId,
    imp.source,
    imp.format,
    imp.filename,
    imp.fileSize,
    imp.importedAt,
    JSON.stringify(imp.stats),
    JSON.stringify(imp.errors),
  );

  return getImport(imp.id)!;
}

export function listImports(projectId: string): ReconImport[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM recon_imports WHERE project_id = ? ORDER BY imported_at DESC")
    .all(projectId) as ImportRow[];
  return rows.map(rowToImport);
}

export function getImport(id: string): ReconImport | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM recon_imports WHERE id = ?").get(id) as ImportRow | undefined;
  return row ? rowToImport(row) : null;
}

export function deleteImport(id: string): boolean {
  const db = getDb();
  // Delete associated entities first
  db.prepare("DELETE FROM recon_entities WHERE import_id = ?").run(id);
  const result = db.prepare("DELETE FROM recon_imports WHERE id = ?").run(id);
  if (result.changes > 0) {
    logger.info(`Deleted recon import ${id}`);
    return true;
  }
  return false;
}

// --- Entity row mapping ---

interface EntityRow {
  id: string;
  project_id: string;
  import_id: string | null;
  category: string;
  type: string;
  value: string;
  normalized_value: string;
  attributes: string;
  confidence: number;
  sources: string;
  first_seen: number;
  last_seen: number;
  tags: string;
  notes: string | null;
}

function rowToEntity(row: EntityRow): ReconEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    importId: row.import_id,
    category: row.category as EntityCategory,
    type: row.type as EntityType,
    value: row.value,
    normalizedValue: row.normalized_value,
    attributes: JSON.parse(row.attributes) as Record<string, unknown>,
    confidence: row.confidence,
    sources: JSON.parse(row.sources) as string[],
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    tags: JSON.parse(row.tags) as string[],
    notes: row.notes ?? undefined,
  };
}

// --- Entity CRUD ---

export function insertEntity(entity: ReconEntity): ReconEntity {
  const db = getDb();
  db.prepare(
    `INSERT INTO recon_entities (id, project_id, import_id, category, type, value, normalized_value, attributes, confidence, sources, first_seen, last_seen, tags, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entity.id,
    entity.projectId,
    entity.importId,
    entity.category,
    entity.type,
    entity.value,
    entity.normalizedValue,
    JSON.stringify(entity.attributes),
    entity.confidence,
    JSON.stringify(entity.sources),
    entity.firstSeen,
    entity.lastSeen,
    JSON.stringify(entity.tags),
    entity.notes ?? null,
  );

  return entity;
}

export function insertEntitiesBulk(entities: ReconEntity[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO recon_entities (id, project_id, import_id, category, type, value, normalized_value, attributes, confidence, sources, first_seen, last_seen, tags, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction((ents: ReconEntity[]) => {
    for (const e of ents) {
      stmt.run(
        e.id,
        e.projectId,
        e.importId,
        e.category,
        e.type,
        e.value,
        e.normalizedValue,
        JSON.stringify(e.attributes),
        e.confidence,
        JSON.stringify(e.sources),
        e.firstSeen,
        e.lastSeen,
        JSON.stringify(e.tags),
        e.notes ?? null,
      );
    }
  });

  tx(entities);
}

export function updateEntityMerge(entity: ReconEntity): void {
  const db = getDb();
  db.prepare(
    `UPDATE recon_entities SET last_seen = ?, sources = ?, attributes = ?, confidence = ? WHERE id = ?`,
  ).run(
    entity.lastSeen,
    JSON.stringify(entity.sources),
    JSON.stringify(entity.attributes),
    entity.confidence,
    entity.id,
  );
}

export function updateEntitiesMergeBulk(entities: ReconEntity[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `UPDATE recon_entities SET last_seen = ?, sources = ?, attributes = ?, confidence = ? WHERE id = ?`,
  );

  const tx = db.transaction((ents: ReconEntity[]) => {
    for (const e of ents) {
      stmt.run(e.lastSeen, JSON.stringify(e.sources), JSON.stringify(e.attributes), e.confidence, e.id);
    }
  });

  tx(entities);
}

export function listEntities(
  projectId: string,
  options?: {
    category?: string;
    type?: string;
    source?: string;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  },
): { entities: ReconEntity[]; total: number } {
  const db = getDb();
  const conditions: string[] = ["project_id = ?"];
  const params: (string | number)[] = [projectId];

  if (options?.category) {
    conditions.push("category = ?");
    params.push(options.category);
  }
  if (options?.type) {
    conditions.push("type = ?");
    params.push(options.type);
  }
  if (options?.source) {
    conditions.push("sources LIKE ?");
    params.push(`%"${options.source}"%`);
  }
  if (options?.tag) {
    conditions.push("tags LIKE ?");
    params.push(`%"${options.tag}"%`);
  }
  if (options?.search) {
    conditions.push("(value LIKE ? OR normalized_value LIKE ?)");
    params.push(`%${options.search}%`, `%${options.search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM recon_entities ${where}`).get(...params) as { count: number };
  const total = countRow.count;

  // Get paginated results
  let orderBy = "last_seen DESC";
  if (options?.sort === "value") orderBy = "value ASC";
  else if (options?.sort === "confidence") orderBy = "confidence DESC";
  else if (options?.sort === "type") orderBy = "type ASC";
  else if (options?.sort === "first_seen") orderBy = "first_seen DESC";

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const rows = db
    .prepare(`SELECT * FROM recon_entities ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as EntityRow[];

  return { entities: rows.map(rowToEntity), total };
}

export function getEntity(id: string): ReconEntity | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM recon_entities WHERE id = ?").get(id) as EntityRow | undefined;
  return row ? rowToEntity(row) : null;
}

export function getEntitiesByProject(projectId: string): ReconEntity[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM recon_entities WHERE project_id = ?")
    .all(projectId) as EntityRow[];
  return rows.map(rowToEntity);
}

export function updateEntity(
  id: string,
  data: { tags?: string[]; notes?: string },
): ReconEntity | null {
  const db = getDb();
  const existing = getEntity(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.tags !== undefined) {
    updates.push("tags = ?");
    params.push(JSON.stringify(data.tags));
  }
  if (data.notes !== undefined) {
    updates.push("notes = ?");
    params.push(data.notes);
  }

  if (updates.length === 0) return existing;

  params.push(id);
  db.prepare(`UPDATE recon_entities SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  return getEntity(id);
}

export function deleteEntity(id: string): boolean {
  const db = getDb();
  // Delete relationships involving this entity
  db.prepare("DELETE FROM recon_relationships WHERE from_entity_id = ? OR to_entity_id = ?").run(id, id);
  const result = db.prepare("DELETE FROM recon_entities WHERE id = ?").run(id);
  return result.changes > 0;
}

export function bulkTagEntities(entityIds: string[], tag: string): void {
  const db = getDb();
  const tx = db.transaction((ids: string[]) => {
    for (const id of ids) {
      const entity = getEntity(id);
      if (entity) {
        const tags = entity.tags.includes(tag) ? entity.tags : [...entity.tags, tag];
        db.prepare("UPDATE recon_entities SET tags = ? WHERE id = ?").run(JSON.stringify(tags), id);
      }
    }
  });
  tx(entityIds);
}

export function bulkDeleteEntities(entityIds: string[]): void {
  const db = getDb();
  const tx = db.transaction((ids: string[]) => {
    for (const id of ids) {
      db.prepare("DELETE FROM recon_relationships WHERE from_entity_id = ? OR to_entity_id = ?").run(id, id);
      db.prepare("DELETE FROM recon_entities WHERE id = ?").run(id);
    }
  });
  tx(entityIds);
}

// --- Relationship row mapping ---

interface RelationshipRow {
  id: string;
  project_id: string;
  from_entity_id: string;
  to_entity_id: string;
  type: string;
  confidence: number;
  source: string;
  created_at: number;
}

function rowToRelationship(row: RelationshipRow): ReconRelationship {
  return {
    id: row.id,
    projectId: row.project_id,
    fromEntityId: row.from_entity_id,
    toEntityId: row.to_entity_id,
    type: row.type,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
  };
}

// --- Relationship CRUD ---

export function insertRelationship(rel: ReconRelationship): ReconRelationship {
  const db = getDb();
  db.prepare(
    `INSERT INTO recon_relationships (id, project_id, from_entity_id, to_entity_id, type, confidence, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(rel.id, rel.projectId, rel.fromEntityId, rel.toEntityId, rel.type, rel.confidence, rel.source, rel.createdAt);
  return rel;
}

export function insertRelationshipsBulk(rels: ReconRelationship[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO recon_relationships (id, project_id, from_entity_id, to_entity_id, type, confidence, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction((relationships: ReconRelationship[]) => {
    for (const r of relationships) {
      stmt.run(r.id, r.projectId, r.fromEntityId, r.toEntityId, r.type, r.confidence, r.source, r.createdAt);
    }
  });

  tx(rels);
}

export function listRelationships(projectId: string, entityId?: string): ReconRelationship[] {
  const db = getDb();
  if (entityId) {
    const rows = db
      .prepare("SELECT * FROM recon_relationships WHERE project_id = ? AND (from_entity_id = ? OR to_entity_id = ?) ORDER BY created_at DESC")
      .all(projectId, entityId, entityId) as RelationshipRow[];
    return rows.map(rowToRelationship);
  }

  const rows = db
    .prepare("SELECT * FROM recon_relationships WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as RelationshipRow[];
  return rows.map(rowToRelationship);
}

export function getRelationship(id: string): ReconRelationship | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM recon_relationships WHERE id = ?").get(id) as RelationshipRow | undefined;
  return row ? rowToRelationship(row) : null;
}

export function deleteRelationship(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM recon_relationships WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Stats ---

export interface ProjectStats {
  totalEntities: number;
  totalRelationships: number;
  totalImports: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  bySources: Record<string, number>;
}

export function getProjectStats(projectId: string): ProjectStats {
  const db = getDb();

  const totalEntities = (db.prepare("SELECT COUNT(*) as count FROM recon_entities WHERE project_id = ?").get(projectId) as { count: number }).count;
  const totalRelationships = (db.prepare("SELECT COUNT(*) as count FROM recon_relationships WHERE project_id = ?").get(projectId) as { count: number }).count;
  const totalImports = (db.prepare("SELECT COUNT(*) as count FROM recon_imports WHERE project_id = ?").get(projectId) as { count: number }).count;

  const categoryRows = db
    .prepare("SELECT category, COUNT(*) as count FROM recon_entities WHERE project_id = ? GROUP BY category")
    .all(projectId) as Array<{ category: string; count: number }>;

  const typeRows = db
    .prepare("SELECT type, COUNT(*) as count FROM recon_entities WHERE project_id = ? GROUP BY type")
    .all(projectId) as Array<{ type: string; count: number }>;

  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) byCategory[row.category] = row.count;

  const byType: Record<string, number> = {};
  for (const row of typeRows) byType[row.type] = row.count;

  // Get source breakdown from imports table
  const sourceRows = db
    .prepare("SELECT source, COUNT(*) as count FROM recon_imports WHERE project_id = ? GROUP BY source")
    .all(projectId) as Array<{ source: string; count: number }>;

  const bySources: Record<string, number> = {};
  for (const row of sourceRows) bySources[row.source] = row.count;

  return { totalEntities, totalRelationships, totalImports, byCategory, byType, bySources };
}

export interface TimelineEntry {
  date: string;
  count: number;
  category: string;
}

export function getTimeline(projectId: string): TimelineEntry[] {
  const db = getDb();
  // Group by day and category
  const rows = db
    .prepare(
      `SELECT
        date(first_seen / 1000, 'unixepoch') as date,
        category,
        COUNT(*) as count
      FROM recon_entities
      WHERE project_id = ?
      GROUP BY date, category
      ORDER BY date ASC`,
    )
    .all(projectId) as Array<{ date: string; category: string; count: number }>;

  return rows.map((row) => ({
    date: row.date,
    count: row.count,
    category: row.category,
  }));
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  confidence: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getGraphData(projectId: string): GraphData {
  const db = getDb();

  const entityRows = db
    .prepare("SELECT id, value, type, category, confidence FROM recon_entities WHERE project_id = ?")
    .all(projectId) as Array<{ id: string; value: string; type: string; category: string; confidence: number }>;

  const relRows = db
    .prepare("SELECT id, from_entity_id, to_entity_id, type, confidence FROM recon_relationships WHERE project_id = ?")
    .all(projectId) as Array<{ id: string; from_entity_id: string; to_entity_id: string; type: string; confidence: number }>;

  const nodes: GraphNode[] = entityRows.map((r) => ({
    id: r.id,
    label: r.value,
    type: r.type,
    category: r.category,
    confidence: r.confidence,
  }));

  const edges: GraphEdge[] = relRows.map((r) => ({
    id: r.id,
    source: r.from_entity_id,
    target: r.to_entity_id,
    type: r.type,
    confidence: r.confidence,
  }));

  return { nodes, edges };
}
