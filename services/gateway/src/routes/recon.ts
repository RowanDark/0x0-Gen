import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import type {
  ImportSourceType,
  ReconEntity,
} from "@0x0-gen/contracts";
import {
  detectParser,
  getParser,
  listParsers as listAvailableParsers,
  normalizeEntities,
  deduplicate,
  inferRelationships,
} from "@0x0-gen/recon";
import * as reconDb from "../db/recon.js";
import { broadcast } from "../broadcaster.js";

const logger = createLogger("gateway:recon");

const MAX_IMPORT_SIZE = 100 * 1024 * 1024; // 100MB

export async function reconRoutes(app: FastifyInstance) {
  // Initialize recon DB schema
  reconDb.initReconSchema();

  // ========================
  // Project management
  // ========================

  // POST /recon/projects — Create project
  app.post<{
    Body: { name: string; description?: string; targets?: string[] };
  }>("/recon/projects", async (request, reply) => {
    const body = request.body as { name?: string; description?: string; targets?: string[] };
    if (!body.name) {
      return reply.status(400).send({ error: "name is required" });
    }

    const project = reconDb.createProject({
      id: randomUUID(),
      name: body.name,
      description: body.description,
      targets: body.targets,
      now: Date.now(),
    });

    logger.info(`Created recon project ${project.id}`);
    return reply.status(201).send(project);
  });

  // GET /recon/projects — List projects
  app.get("/recon/projects", async () => {
    const projects = reconDb.listProjects();
    return { projects };
  });

  // GET /recon/projects/:id — Get project with stats
  app.get<{ Params: { id: string } }>(
    "/recon/projects/:id",
    async (request, reply) => {
      const project = reconDb.getProject(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const stats = reconDb.getProjectStats(project.id);
      return { ...project, stats };
    },
  );

  // PUT /recon/projects/:id — Update project
  app.put<{
    Params: { id: string };
    Body: { name?: string; description?: string; targets?: string[] };
  }>("/recon/projects/:id", async (request, reply) => {
    const body = request.body as { name?: string; description?: string; targets?: string[] };
    const project = reconDb.updateProject(request.params.id, {
      name: body.name,
      description: body.description,
      targets: body.targets,
      now: Date.now(),
    });

    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return project;
  });

  // DELETE /recon/projects/:id — Delete project and all data
  app.delete<{ Params: { id: string } }>(
    "/recon/projects/:id",
    async (request, reply) => {
      const deleted = reconDb.deleteProject(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Project not found" });
      }
      logger.info(`Deleted recon project ${request.params.id}`);
      return reply.status(204).send();
    },
  );

  // ========================
  // Import
  // ========================

  // POST /recon/projects/:id/import/text — Import raw text/JSON body
  app.post<{
    Params: { id: string };
    Body: { content: string; source?: string; filename?: string };
  }>("/recon/projects/:id/import/text", async (request, reply) => {
    const project = reconDb.getProject(request.params.id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }

    const body = request.body as { content?: string; source?: string; filename?: string };
    if (!body.content) {
      return reply.status(400).send({ error: "content is required" });
    }

    if (body.content.length > MAX_IMPORT_SIZE) {
      return reply.status(413).send({ error: "Content too large, max 100MB" });
    }

    const result = processImport(
      project.id,
      body.content,
      body.source as ImportSourceType | undefined,
      body.filename || "import.txt",
    );

    return reply.status(201).send(result);
  });

  // POST /recon/projects/:id/import — Import file (multipart form)
  app.post<{ Params: { id: string } }>(
    "/recon/projects/:id/import",
    async (request, reply) => {
      const project = reconDb.getProject(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      // Handle multipart/form-data or raw body
      const contentType = request.headers["content-type"] || "";

      let content: string;
      let filename: string;
      let source: ImportSourceType | undefined;

      if (contentType.includes("multipart/form-data")) {
        try {
          const data = await (request as any).file();
          if (!data) {
            return reply.status(400).send({ error: "No file provided" });
          }
          const buf = await data.toBuffer();
          if (buf.length > MAX_IMPORT_SIZE) {
            return reply.status(413).send({ error: "File too large, max 100MB" });
          }
          content = buf.toString("utf-8");
          filename = data.filename || "import.txt";
          // Check for source field in multipart
          source = data.fields?.source?.value as ImportSourceType | undefined;
        } catch (err) {
          return reply.status(400).send({ error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` });
        }
      } else {
        // Raw body
        const rawBody = request.body;
        if (typeof rawBody === "string") {
          content = rawBody;
        } else if (rawBody && typeof rawBody === "object" && "content" in (rawBody as Record<string, unknown>)) {
          content = (rawBody as { content: string }).content;
          source = (rawBody as { source?: ImportSourceType }).source;
          filename = (rawBody as { filename?: string }).filename || "import.txt";
        } else {
          return reply.status(400).send({ error: "No content provided" });
        }
        filename = filename! || "import.txt";
      }

      const result = processImport(project.id, content, source, filename);
      return reply.status(201).send(result);
    },
  );

  // GET /recon/projects/:id/imports — List imports
  app.get<{ Params: { id: string } }>(
    "/recon/projects/:id/imports",
    async (request, reply) => {
      const project = reconDb.getProject(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const imports = reconDb.listImports(project.id);
      return { imports };
    },
  );

  // GET /recon/projects/:id/imports/:iid — Get import details
  app.get<{ Params: { id: string; iid: string } }>(
    "/recon/projects/:id/imports/:iid",
    async (request, reply) => {
      const imp = reconDb.getImport(request.params.iid);
      if (!imp || imp.projectId !== request.params.id) {
        return reply.status(404).send({ error: "Import not found" });
      }
      return imp;
    },
  );

  // DELETE /recon/projects/:id/imports/:iid — Delete import
  app.delete<{ Params: { id: string; iid: string } }>(
    "/recon/projects/:id/imports/:iid",
    async (request, reply) => {
      const imp = reconDb.getImport(request.params.iid);
      if (!imp || imp.projectId !== request.params.id) {
        return reply.status(404).send({ error: "Import not found" });
      }
      reconDb.deleteImport(imp.id);
      return reply.status(204).send();
    },
  );

  // ========================
  // Entities
  // ========================

  // GET /recon/projects/:id/entities — List entities with filters
  app.get<{
    Params: { id: string };
    Querystring: {
      category?: string;
      type?: string;
      source?: string;
      tag?: string;
      search?: string;
      limit?: string;
      offset?: string;
      sort?: string;
    };
  }>("/recon/projects/:id/entities", async (request, reply) => {
    const project = reconDb.getProject(request.params.id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }

    const { category, type, source, tag, search, limit: limitStr, offset: offsetStr, sort } = request.query;
    const result = reconDb.listEntities(project.id, {
      category,
      type,
      source,
      tag,
      search,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
      offset: offsetStr ? parseInt(offsetStr, 10) : undefined,
      sort,
    });

    return result;
  });

  // GET /recon/projects/:id/entities/:eid — Get entity with relationships
  app.get<{ Params: { id: string; eid: string } }>(
    "/recon/projects/:id/entities/:eid",
    async (request, reply) => {
      const entity = reconDb.getEntity(request.params.eid);
      if (!entity || entity.projectId !== request.params.id) {
        return reply.status(404).send({ error: "Entity not found" });
      }
      const relationships = reconDb.listRelationships(entity.projectId, entity.id);
      return { ...entity, relationships };
    },
  );

  // PUT /recon/projects/:id/entities/:eid — Update entity (tags, notes)
  app.put<{
    Params: { id: string; eid: string };
    Body: { tags?: string[]; notes?: string };
  }>("/recon/projects/:id/entities/:eid", async (request, reply) => {
    const existing = reconDb.getEntity(request.params.eid);
    if (!existing || existing.projectId !== request.params.id) {
      return reply.status(404).send({ error: "Entity not found" });
    }

    const body = request.body as { tags?: string[]; notes?: string };
    const updated = reconDb.updateEntity(request.params.eid, {
      tags: body.tags,
      notes: body.notes,
    });

    if (updated) {
      broadcast({
        id: randomUUID(),
        type: "recon:entity:updated",
        source: "recon",
        payload: { entityId: updated.id, projectId: updated.projectId },
        timestamp: new Date().toISOString(),
      }, false);
    }

    return updated;
  });

  // DELETE /recon/projects/:id/entities/:eid — Delete entity
  app.delete<{ Params: { id: string; eid: string } }>(
    "/recon/projects/:id/entities/:eid",
    async (request, reply) => {
      const existing = reconDb.getEntity(request.params.eid);
      if (!existing || existing.projectId !== request.params.id) {
        return reply.status(404).send({ error: "Entity not found" });
      }
      reconDb.deleteEntity(request.params.eid);
      return reply.status(204).send();
    },
  );

  // ========================
  // Bulk operations
  // ========================

  // POST /recon/projects/:id/entities/bulk/tag — Add tag to multiple entities
  app.post<{
    Params: { id: string };
    Body: { entityIds: string[]; tag: string };
  }>("/recon/projects/:id/entities/bulk/tag", async (request, reply) => {
    const body = request.body as { entityIds?: string[]; tag?: string };
    if (!body.entityIds?.length || !body.tag) {
      return reply.status(400).send({ error: "entityIds and tag are required" });
    }
    reconDb.bulkTagEntities(body.entityIds, body.tag);
    return { success: true, count: body.entityIds.length };
  });

  // POST /recon/projects/:id/entities/bulk/delete — Delete multiple entities
  app.post<{
    Params: { id: string };
    Body: { entityIds: string[] };
  }>("/recon/projects/:id/entities/bulk/delete", async (request, reply) => {
    const body = request.body as { entityIds?: string[] };
    if (!body.entityIds?.length) {
      return reply.status(400).send({ error: "entityIds is required" });
    }
    reconDb.bulkDeleteEntities(body.entityIds);
    return { success: true, count: body.entityIds.length };
  });

  // POST /recon/projects/:id/entities/bulk/export — Export entities as JSON/CSV
  app.post<{
    Params: { id: string };
    Body: { entityIds?: string[]; format?: string };
  }>("/recon/projects/:id/entities/bulk/export", async (request, reply) => {
    const body = request.body as { entityIds?: string[]; format?: string };
    const format = body.format || "json";

    let entities: ReconEntity[];
    if (body.entityIds?.length) {
      entities = body.entityIds.map((id) => reconDb.getEntity(id)).filter(Boolean) as ReconEntity[];
    } else {
      const result = reconDb.listEntities(request.params.id, { limit: 10000 });
      entities = result.entities;
    }

    if (format === "csv") {
      const headers = ["id", "category", "type", "value", "confidence", "sources", "firstSeen", "lastSeen", "tags"];
      const rows = entities.map((e) =>
        [
          e.id,
          e.category,
          e.type,
          `"${e.value.replace(/"/g, '""')}"`,
          String(e.confidence),
          `"${e.sources.join(", ")}"`,
          new Date(e.firstSeen).toISOString(),
          new Date(e.lastSeen).toISOString(),
          `"${e.tags.join(", ")}"`,
        ].join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");
      reply.header("Content-Type", "text/csv");
      return csv;
    }

    return { entities };
  });

  // ========================
  // Relationships
  // ========================

  // GET /recon/projects/:id/relationships — List relationships
  app.get<{
    Params: { id: string };
    Querystring: { entityId?: string };
  }>("/recon/projects/:id/relationships", async (request, reply) => {
    const project = reconDb.getProject(request.params.id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    const relationships = reconDb.listRelationships(project.id, request.query.entityId);
    return { relationships };
  });

  // POST /recon/projects/:id/relationships — Create manual relationship
  app.post<{
    Params: { id: string };
    Body: { fromEntityId: string; toEntityId: string; type: string };
  }>("/recon/projects/:id/relationships", async (request, reply) => {
    const body = request.body as { fromEntityId?: string; toEntityId?: string; type?: string };
    if (!body.fromEntityId || !body.toEntityId || !body.type) {
      return reply.status(400).send({ error: "fromEntityId, toEntityId, and type are required" });
    }

    const fromEntity = reconDb.getEntity(body.fromEntityId);
    const toEntity = reconDb.getEntity(body.toEntityId);
    if (!fromEntity || !toEntity) {
      return reply.status(404).send({ error: "One or both entities not found" });
    }
    if (fromEntity.projectId !== request.params.id || toEntity.projectId !== request.params.id) {
      return reply.status(400).send({ error: "Entities must belong to the same project" });
    }

    const relationship = reconDb.insertRelationship({
      id: randomUUID(),
      projectId: request.params.id,
      fromEntityId: body.fromEntityId,
      toEntityId: body.toEntityId,
      type: body.type,
      confidence: 100,
      source: "manual",
      createdAt: Date.now(),
    });

    return reply.status(201).send(relationship);
  });

  // DELETE /recon/projects/:id/relationships/:rid — Delete relationship
  app.delete<{ Params: { id: string; rid: string } }>(
    "/recon/projects/:id/relationships/:rid",
    async (request, reply) => {
      const rel = reconDb.getRelationship(request.params.rid);
      if (!rel || rel.projectId !== request.params.id) {
        return reply.status(404).send({ error: "Relationship not found" });
      }
      reconDb.deleteRelationship(request.params.rid);
      return reply.status(204).send();
    },
  );

  // ========================
  // Stats and analysis
  // ========================

  // GET /recon/projects/:id/stats — Category/type breakdown
  app.get<{ Params: { id: string } }>(
    "/recon/projects/:id/stats",
    async (request, reply) => {
      const project = reconDb.getProject(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      return reconDb.getProjectStats(project.id);
    },
  );

  // GET /recon/projects/:id/timeline — Discovery timeline data
  app.get<{ Params: { id: string } }>(
    "/recon/projects/:id/timeline",
    async (request, reply) => {
      const project = reconDb.getProject(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const timeline = reconDb.getTimeline(project.id);
      return { timeline };
    },
  );

  // GET /recon/projects/:id/graph — Graph data for Visual Mapper
  app.get<{ Params: { id: string } }>(
    "/recon/projects/:id/graph",
    async (request, reply) => {
      const project = reconDb.getProject(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      return reconDb.getGraphData(project.id);
    },
  );

  // ========================
  // Utility
  // ========================

  // GET /recon/parsers — List available parsers
  app.get("/recon/parsers", async () => {
    return { parsers: listAvailableParsers() };
  });

  // POST /recon/detect — Auto-detect format from content
  app.post<{ Body: { content: string; filename?: string } }>(
    "/recon/detect",
    async (request, reply) => {
      const body = request.body as { content?: string; filename?: string };
      if (!body.content) {
        return reply.status(400).send({ error: "content is required" });
      }

      const parser = detectParser(body.content, body.filename);
      if (!parser) {
        return { source: null, confidence: 0 };
      }

      return {
        source: parser.source,
        confidence: 80,
        name: parser.name,
        formats: parser.supportedFormats,
      };
    },
  );
}

// ========================
// Import processing helper
// ========================

function processImport(
  projectId: string,
  content: string,
  source: ImportSourceType | undefined,
  filename: string,
) {
  const importId = randomUUID();

  // Detect or use specified parser
  let parser;
  if (source) {
    parser = getParser(source);
  }
  if (!parser) {
    parser = detectParser(content, filename);
  }
  if (!parser) {
    return {
      error: "Could not detect file format. Please specify a source type.",
    };
  }

  // Broadcast import started
  broadcast({
    id: randomUUID(),
    type: "recon:import:started",
    source: "recon",
    payload: { importId, projectId, parser: parser.name },
    timestamp: new Date().toISOString(),
  }, false);

  // Parse content
  const parseResult = parser.parse(content);

  // Normalize entities
  const normalized = normalizeEntities(parseResult.entities, projectId, importId);

  // Get existing entities for dedup
  const existing = reconDb.getEntitiesByProject(projectId);

  // Deduplicate
  const dedupeResult = deduplicate(normalized, existing);

  // Insert new entities
  if (dedupeResult.new.length > 0) {
    reconDb.insertEntitiesBulk(dedupeResult.new);
  }

  // Update merged entities
  if (dedupeResult.updated.length > 0) {
    reconDb.updateEntitiesMergeBulk(dedupeResult.updated);
  }

  // Infer relationships from all entities in the project
  const allEntities = [...dedupeResult.new, ...dedupeResult.updated, ...existing.filter((e) => {
    const key = `${e.type}:${e.normalizedValue}`;
    return !dedupeResult.updated.some((u) => `${u.type}:${u.normalizedValue}` === key);
  })];

  const relationships = inferRelationships(allEntities, projectId, parser.source);
  if (relationships.length > 0) {
    // Filter out relationships where entities don't exist yet
    const entityIds = new Set(allEntities.map((e) => e.id));
    const validRelationships = relationships.filter(
      (r) => entityIds.has(r.fromEntityId) && entityIds.has(r.toEntityId),
    );
    if (validRelationships.length > 0) {
      try {
        reconDb.insertRelationshipsBulk(validRelationships);
      } catch {
        // Ignore duplicate relationship errors
      }
    }
  }

  // Determine format from parser
  const format = parser.supportedFormats[0] || "unknown";

  // Create import record
  const importRecord = reconDb.insertImport({
    id: importId,
    projectId,
    source: parser.source,
    format,
    filename,
    fileSize: content.length,
    importedAt: Date.now(),
    stats: {
      total: parseResult.stats.total,
      new: dedupeResult.new.length,
      updated: dedupeResult.updated.length,
      duplicates: dedupeResult.duplicates,
      errors: parseResult.stats.errors,
    },
    errors: parseResult.errors,
  });

  // Broadcast entity created events for new entities
  for (const entity of dedupeResult.new) {
    broadcast({
      id: randomUUID(),
      type: "recon:entity:created",
      source: "recon",
      payload: { entityId: entity.id, projectId, type: entity.type, value: entity.value },
      timestamp: new Date().toISOString(),
    }, false);
  }

  // Broadcast import completed
  broadcast({
    id: randomUUID(),
    type: "recon:import:completed",
    source: "recon",
    payload: {
      importId,
      projectId,
      stats: importRecord.stats,
    },
    timestamp: new Date().toISOString(),
  }, false);

  logger.info(`Import ${importId} completed: ${dedupeResult.new.length} new, ${dedupeResult.updated.length} updated, ${dedupeResult.duplicates} duplicates`);

  return importRecord;
}
