import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import {
  IntruderEngine,
  parsePositions,
} from "@0x0-gen/intruder";
import type {
  IntruderConfig,
  IntruderPosition,
  IntruderPayloadSet,
  IntruderOptions,
  AttackType,
  IntruderResult,
  IntruderAttack,
} from "@0x0-gen/contracts";
import * as intruderDb from "../db/intruder.js";
import { broadcast } from "../broadcaster.js";

const logger = createLogger("gateway:intruder");

const engine = new IntruderEngine();

// Wire up engine events to WebSocket broadcasts
engine.on("started", (attack: IntruderAttack) => {
  intruderDb.insertAttack(attack);
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:started",
      source: "intruder",
      payload: { attackId: attack.id, configId: attack.configId, totalRequests: attack.totalRequests },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("progress", (attack: IntruderAttack) => {
  intruderDb.updateAttack(attack);
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:progress",
      source: "intruder",
      payload: {
        attackId: attack.id,
        completedRequests: attack.completedRequests,
        totalRequests: attack.totalRequests,
      },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("result", (result: IntruderResult) => {
  const attackId = findAttackIdByConfigId(result.configId);
  if (attackId) {
    intruderDb.insertResult(attackId, result);
  }

  broadcast(
    {
      id: randomUUID(),
      type: "intruder:result",
      source: "intruder",
      payload: {
        resultId: result.id,
        configId: result.configId,
        requestIndex: result.requestIndex,
        statusCode: result.response?.statusCode ?? null,
        duration: result.duration,
        error: result.error,
      },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("paused", (attack: IntruderAttack) => {
  intruderDb.updateAttack(attack);
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:paused",
      source: "intruder",
      payload: { attackId: attack.id },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("resumed", (attack: IntruderAttack) => {
  intruderDb.updateAttack(attack);
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:resumed",
      source: "intruder",
      payload: { attackId: attack.id },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("completed", (attack: IntruderAttack) => {
  intruderDb.updateAttack(attack);
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:completed",
      source: "intruder",
      payload: {
        attackId: attack.id,
        completedRequests: attack.completedRequests,
        totalRequests: attack.totalRequests,
      },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("cancelled", (attack: IntruderAttack) => {
  intruderDb.updateAttack(attack);
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:cancelled",
      source: "intruder",
      payload: { attackId: attack.id },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

engine.on("error", (attackId: string, error: string) => {
  broadcast(
    {
      id: randomUUID(),
      type: "intruder:error",
      source: "intruder",
      payload: { attackId, error },
      timestamp: new Date().toISOString(),
    },
    false,
  );
});

// Track active configId -> attackId mapping
const activeAttacks = new Map<string, string>();

function findAttackIdByConfigId(configId: string): string | undefined {
  return activeAttacks.get(configId);
}

const BUILTIN_PAYLOAD_TYPES = [
  { id: "passwords", name: "Common Passwords", description: "Top 100 common passwords", count: 100 },
  { id: "sqli", name: "SQL Injection", description: "Basic SQL injection payloads", count: 30 },
  { id: "xss", name: "XSS Payloads", description: "Basic XSS payloads", count: 25 },
  { id: "traversal", name: "Path Traversal", description: "Path traversal sequences", count: 28 },
  { id: "directories", name: "Common Directories", description: "Common directory names", count: 45 },
];

export async function intruderRoutes(app: FastifyInstance) {
  // Initialize intruder DB schema
  intruderDb.initIntruderSchema();

  // --- Config management ---

  // POST /intruder/configs — Create attack config
  app.post<{
    Body: {
      name: string;
      projectId?: string;
      baseRequest: string;
      positions: IntruderPosition[];
      payloadSets: IntruderPayloadSet[];
      attackType: AttackType;
      options?: Partial<IntruderOptions>;
    };
  }>("/intruder/configs", async (request, reply) => {
    const body = request.body as {
      name?: string;
      projectId?: string;
      baseRequest?: string;
      positions?: IntruderPosition[];
      payloadSets?: IntruderPayloadSet[];
      attackType?: AttackType;
      options?: Partial<IntruderOptions>;
    };

    if (!body.name) {
      return reply.status(400).send({ error: "name is required" });
    }
    if (!body.baseRequest) {
      return reply.status(400).send({ error: "baseRequest is required" });
    }
    if (!body.attackType) {
      return reply.status(400).send({ error: "attackType is required" });
    }

    const options: IntruderOptions = {
      concurrency: body.options?.concurrency ?? 1,
      delayMs: body.options?.delayMs ?? 0,
      followRedirects: body.options?.followRedirects ?? false,
      timeout: body.options?.timeout ?? 30000,
      stopOnError: body.options?.stopOnError ?? false,
    };

    const config = intruderDb.createConfig({
      id: randomUUID(),
      name: body.name,
      projectId: body.projectId,
      baseRequest: body.baseRequest,
      positions: body.positions ?? [],
      payloadSets: body.payloadSets ?? [],
      attackType: body.attackType,
      options,
      now: Date.now(),
    });

    logger.info(`Created intruder config ${config.id}`);
    return reply.status(201).send(config);
  });

  // GET /intruder/configs — List configs
  app.get<{ Querystring: { projectId?: string } }>(
    "/intruder/configs",
    async (request) => {
      const { projectId } = request.query;
      const configs = intruderDb.listConfigs(projectId);
      return { configs };
    },
  );

  // GET /intruder/configs/:id — Get config by ID
  app.get<{ Params: { id: string } }>(
    "/intruder/configs/:id",
    async (request, reply) => {
      const config = intruderDb.getConfig(request.params.id);
      if (!config) {
        return reply.status(404).send({ error: "Config not found" });
      }
      return config;
    },
  );

  // PUT /intruder/configs/:id — Update config
  app.put<{
    Params: { id: string };
    Body: Partial<IntruderConfig>;
  }>("/intruder/configs/:id", async (request, reply) => {
    const body = request.body as Partial<IntruderConfig>;

    const config = intruderDb.updateConfig(request.params.id, {
      name: body.name,
      baseRequest: body.baseRequest,
      positions: body.positions,
      payloadSets: body.payloadSets,
      attackType: body.attackType,
      options: body.options,
      now: Date.now(),
    });

    if (!config) {
      return reply.status(404).send({ error: "Config not found" });
    }

    return config;
  });

  // DELETE /intruder/configs/:id — Delete config
  app.delete<{ Params: { id: string } }>(
    "/intruder/configs/:id",
    async (request, reply) => {
      const deleted = intruderDb.deleteConfig(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Config not found" });
      }
      logger.info(`Deleted intruder config ${request.params.id}`);
      return reply.status(204).send();
    },
  );

  // --- Attack execution ---

  // POST /intruder/configs/:id/start — Start attack
  app.post<{ Params: { id: string } }>(
    "/intruder/configs/:id/start",
    async (request, reply) => {
      const config = intruderDb.getConfig(request.params.id);
      if (!config) {
        return reply.status(404).send({ error: "Config not found" });
      }

      if (config.positions.length === 0) {
        return reply.status(400).send({ error: "No positions defined" });
      }
      if (config.payloadSets.length === 0) {
        return reply.status(400).send({ error: "No payload sets defined" });
      }

      try {
        const attackId = await engine.start(config);
        activeAttacks.set(config.id, attackId);

        logger.info(`Started attack ${attackId} for config ${config.id}`);
        const attack = engine.getStatus(attackId);
        return reply.status(201).send(attack);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error });
      }
    },
  );

  // POST /intruder/attacks/:id/pause — Pause running attack
  app.post<{ Params: { id: string } }>(
    "/intruder/attacks/:id/pause",
    async (request, reply) => {
      try {
        await engine.pause(request.params.id);
        return { status: "paused" };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ error });
      }
    },
  );

  // POST /intruder/attacks/:id/resume — Resume paused attack
  app.post<{ Params: { id: string } }>(
    "/intruder/attacks/:id/resume",
    async (request, reply) => {
      try {
        await engine.resume(request.params.id);
        return { status: "running" };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ error });
      }
    },
  );

  // POST /intruder/attacks/:id/cancel — Cancel attack
  app.post<{ Params: { id: string } }>(
    "/intruder/attacks/:id/cancel",
    async (request, reply) => {
      try {
        await engine.cancel(request.params.id);
        return { status: "cancelled" };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ error });
      }
    },
  );

  // GET /intruder/attacks/:id — Get attack status and results
  app.get<{ Params: { id: string } }>(
    "/intruder/attacks/:id",
    async (request, reply) => {
      const attack = engine.getStatus(request.params.id);
      if (attack) return attack;

      // Fallback to DB
      const dbAttack = intruderDb.getAttack(request.params.id);
      if (!dbAttack) {
        return reply.status(404).send({ error: "Attack not found" });
      }
      return dbAttack;
    },
  );

  // GET /intruder/attacks/:id/results — Get paginated results
  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>("/intruder/attacks/:id/results", async (request, reply) => {
    const { limit: limitStr, offset: offsetStr } = request.query;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    // Try engine first for in-memory results
    const engineResults = engine.getResults(request.params.id, { limit, offset });
    if (engineResults.length > 0) {
      return { results: engineResults };
    }

    // Fallback to DB
    const attack = intruderDb.getAttack(request.params.id);
    if (!attack) {
      return reply.status(404).send({ error: "Attack not found" });
    }

    const results = intruderDb.getResults(request.params.id, attack.configId, { limit, offset });
    return { results };
  });

  // --- Utility ---

  // POST /intruder/parse-positions — Parse positions from request
  app.post<{ Body: { request: string } }>(
    "/intruder/parse-positions",
    async (request, reply) => {
      const body = request.body as { request?: string };
      if (!body.request) {
        return reply.status(400).send({ error: "request is required" });
      }

      const positions = parsePositions(body.request);
      return { positions };
    },
  );

  // GET /intruder/payload-types — List built-in payload generators
  app.get("/intruder/payload-types", async () => {
    return { types: BUILTIN_PAYLOAD_TYPES };
  });
}
