import { createLogger } from "@0x0-gen/logger";
import type { DecoderPreset, TransformStep } from "@0x0-gen/contracts";
import { getDb } from "./index.js";

const logger = createLogger("gateway:db:decoder");

interface PresetRow {
  id: string;
  name: string;
  steps: string;
  project_id: string | null;
  is_builtin: number;
  created_at: number;
  updated_at: number;
}

function rowToPreset(row: PresetRow): DecoderPreset & { isBuiltin: boolean } {
  return {
    id: row.id,
    name: row.name,
    steps: JSON.parse(row.steps) as TransformStep[],
    projectId: row.project_id ?? undefined,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedBuiltinPresets(
  presets: DecoderPreset[],
): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM decoder_presets WHERE is_builtin = 1")
    .get() as { count: number };

  if (existing.count > 0) {
    logger.debug("Built-in presets already seeded");
    return;
  }

  const insert = db.prepare(
    `INSERT INTO decoder_presets (id, name, steps, project_id, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 1, 0, 0)`,
  );

  const tx = db.transaction(() => {
    for (const preset of presets) {
      insert.run(preset.id, preset.name, JSON.stringify(preset.steps));
    }
  });

  tx();
  logger.info(`Seeded ${presets.length} built-in presets`);
}

export function listPresets(
  projectId?: string,
): (DecoderPreset & { isBuiltin: boolean })[] {
  const db = getDb();
  let sql = "SELECT * FROM decoder_presets WHERE 1=1";
  const params: (string | number)[] = [];

  if (projectId) {
    sql += " AND (project_id = ? OR project_id IS NULL)";
    params.push(projectId);
  }

  sql += " ORDER BY is_builtin DESC, name ASC";
  const rows = db.prepare(sql).all(...params) as PresetRow[];
  return rows.map(rowToPreset);
}

export function getPreset(
  id: string,
): (DecoderPreset & { isBuiltin: boolean }) | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM decoder_presets WHERE id = ?")
    .get(id) as PresetRow | undefined;
  return row ? rowToPreset(row) : null;
}

export function createPreset(preset: {
  id: string;
  name: string;
  steps: TransformStep[];
  projectId?: string;
  now: number;
}): DecoderPreset & { isBuiltin: boolean } {
  const db = getDb();
  db.prepare(
    `INSERT INTO decoder_presets (id, name, steps, project_id, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    preset.id,
    preset.name,
    JSON.stringify(preset.steps),
    preset.projectId ?? null,
    preset.now,
    preset.now,
  );

  logger.info(`Created custom preset ${preset.id}: ${preset.name}`);
  return getPreset(preset.id)!;
}

export function updatePreset(
  id: string,
  data: { name?: string; steps?: TransformStep[]; now: number },
): (DecoderPreset & { isBuiltin: boolean }) | null {
  const db = getDb();
  const existing = getPreset(id);
  if (!existing || existing.isBuiltin) return null;

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.steps !== undefined) {
    updates.push("steps = ?");
    params.push(JSON.stringify(data.steps));
  }

  updates.push("updated_at = ?");
  params.push(data.now);
  params.push(id);

  db.prepare(
    `UPDATE decoder_presets SET ${updates.join(", ")} WHERE id = ? AND is_builtin = 0`,
  ).run(...params);

  logger.info(`Updated preset ${id}`);
  return getPreset(id);
}

export function deletePreset(id: string): boolean {
  const db = getDb();
  const existing = getPreset(id);
  if (!existing || existing.isBuiltin) return false;

  const result = db
    .prepare("DELETE FROM decoder_presets WHERE id = ? AND is_builtin = 0")
    .run(id);

  if (result.changes > 0) {
    logger.info(`Deleted preset ${id}`);
    return true;
  }
  return false;
}
