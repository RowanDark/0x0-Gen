import type { FastifyInstance } from "fastify";
import { ProjectSchema } from "@0x0-gen/contracts";
import { createLogger } from "@0x0-gen/logger";
import * as projectDb from "../db/projects.js";

const logger = createLogger("gateway:projects");

export async function projectRoutes(app: FastifyInstance) {
  app.post("/projects", async (request, reply) => {
    const body = request.body as { name?: string };

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return reply.status(400).send({ error: "name is required" });
    }

    const project = projectDb.createProject(body.name.trim());
    logger.info(`Project created: ${project.id}`);
    return reply.status(201).send(project);
  });

  app.get("/projects", async () => {
    const projects = projectDb.listProjects();
    logger.debug(`Listed ${projects.length} projects`);
    return { projects };
  });

  app.get<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const project = projectDb.getProject(request.params.id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return project;
  });

  app.put<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const body = request.body as { name?: string };

    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0)) {
      return reply.status(400).send({ error: "name must be a non-empty string" });
    }

    const data = body.name ? { name: body.name.trim() } : {};
    const project = projectDb.updateProject(request.params.id, data);

    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }

    logger.info(`Project updated: ${project.id}`);
    return project;
  });

  app.delete<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const deleted = projectDb.deleteProject(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: "Project not found" });
    }

    logger.info(`Project deleted: ${request.params.id}`);
    return reply.status(204).send();
  });
}
