import { randomUUID } from "node:crypto";
import type { Project } from "@0x0-gen/contracts";
import { getDb } from "./index.js";

interface ProjectRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProject(name: string): Project {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
    id,
    name,
    now,
    now,
  );

  return { id, name, createdAt: now, updatedAt: now };
}

export function listProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function updateProject(id: string, data: { name?: string }): Project | null {
  const db = getDb();
  const existing = getProject(id);
  if (!existing) return null;

  const name = data.name ?? existing.name;
  const now = new Date().toISOString();

  db.prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?").run(name, now, id);

  return { ...existing, name, updatedAt: now };
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}
