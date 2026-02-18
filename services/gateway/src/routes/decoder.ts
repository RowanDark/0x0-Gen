import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import {
  executePipeline,
  getTransformTypes,
  builtinPresets,
} from "@0x0-gen/decoder";
import type { TransformStep, TransformType, TransformDirection } from "@0x0-gen/contracts";
import * as decoderDb from "../db/decoder.js";
import { broadcast } from "../broadcaster.js";

const logger = createLogger("gateway:decoder");

export async function decoderRoutes(app: FastifyInstance) {
  // Seed built-in presets on startup
  decoderDb.seedBuiltinPresets(builtinPresets);

  // POST /decoder/transform — Execute transform pipeline
  app.post<{ Body: { input: string; steps: TransformStep[] } }>(
    "/decoder/transform",
    async (request, reply) => {
      const body = request.body as { input?: string; steps?: TransformStep[] };
      if (body.input === undefined || body.input === null) {
        return reply.status(400).send({ error: "input is required" });
      }
      if (!Array.isArray(body.steps) || body.steps.length === 0) {
        return reply.status(400).send({ error: "steps array is required and must not be empty" });
      }

      const result = executePipeline(body.input, body.steps);

      broadcast(
        {
          id: randomUUID(),
          type: "decoder:transform",
          source: "decoder",
          payload: {
            stepsCount: body.steps.length,
            success: result.success,
            inputLength: body.input.length,
            outputLength: result.output.length,
          },
          timestamp: new Date().toISOString(),
        },
        false,
      );

      logger.info(
        `Transform pipeline executed: ${body.steps.length} steps, success=${result.success}`,
      );
      return result;
    },
  );

  // POST /decoder/:type/:direction — Single transform shorthand
  app.post<{
    Params: { type: string; direction: string };
    Body: { input: string; options?: Record<string, unknown> };
  }>("/decoder/:type/:direction", async (request, reply) => {
    const { type, direction } = request.params;
    const body = request.body as {
      input?: string;
      options?: Record<string, unknown>;
    };

    if (body.input === undefined || body.input === null) {
      return reply.status(400).send({ error: "input is required" });
    }

    const validTypes = getTransformTypes().map((t) => t.type);
    if (!validTypes.includes(type as TransformType)) {
      return reply.status(400).send({ error: `Invalid transform type: ${type}` });
    }
    if (direction !== "encode" && direction !== "decode") {
      return reply.status(400).send({ error: `Invalid direction: ${direction}` });
    }

    const step: TransformStep = {
      type: type as TransformType,
      direction: direction as TransformDirection,
      options: body.options,
    };

    const result = executePipeline(body.input, [step]);

    broadcast(
      {
        id: randomUUID(),
        type: "decoder:transform",
        source: "decoder",
        payload: {
          transformType: type,
          direction,
          success: result.success,
        },
        timestamp: new Date().toISOString(),
      },
      false,
    );

    return result;
  });

  // GET /decoder/types — List available transform types with metadata
  app.get("/decoder/types", async () => {
    return { types: getTransformTypes() };
  });

  // GET /decoder/presets — List all presets (built-in + custom)
  app.get<{ Querystring: { projectId?: string } }>(
    "/decoder/presets",
    async (request) => {
      const { projectId } = request.query;
      const presets = decoderDb.listPresets(projectId);
      return { presets };
    },
  );

  // POST /decoder/presets — Create custom preset
  app.post<{
    Body: { name: string; steps: TransformStep[]; projectId?: string };
  }>("/decoder/presets", async (request, reply) => {
    const body = request.body as {
      name?: string;
      steps?: TransformStep[];
      projectId?: string;
    };

    if (!body.name) {
      return reply.status(400).send({ error: "name is required" });
    }
    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      return reply.status(400).send({ error: "steps array is required and must not be empty" });
    }

    const preset = decoderDb.createPreset({
      id: randomUUID(),
      name: body.name,
      steps: body.steps,
      projectId: body.projectId,
      now: Date.now(),
    });

    logger.info(`Created custom preset: ${preset.name}`);
    return reply.status(201).send(preset);
  });

  // GET /decoder/presets/:id — Get preset by ID
  app.get<{ Params: { id: string } }>(
    "/decoder/presets/:id",
    async (request, reply) => {
      const preset = decoderDb.getPreset(request.params.id);
      if (!preset) {
        return reply.status(404).send({ error: "Preset not found" });
      }
      return preset;
    },
  );

  // PUT /decoder/presets/:id — Update custom preset
  app.put<{
    Params: { id: string };
    Body: { name?: string; steps?: TransformStep[] };
  }>("/decoder/presets/:id", async (request, reply) => {
    const body = request.body as {
      name?: string;
      steps?: TransformStep[];
    };

    const preset = decoderDb.updatePreset(request.params.id, {
      name: body.name,
      steps: body.steps,
      now: Date.now(),
    });

    if (!preset) {
      return reply.status(404).send({ error: "Preset not found or is built-in" });
    }

    return preset;
  });

  // DELETE /decoder/presets/:id — Delete custom preset
  app.delete<{ Params: { id: string } }>(
    "/decoder/presets/:id",
    async (request, reply) => {
      const deleted = decoderDb.deletePreset(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Preset not found or is built-in" });
      }
      logger.info(`Deleted preset ${request.params.id}`);
      return reply.status(204).send();
    },
  );

  // POST /decoder/presets/:id/run — Execute preset on input
  app.post<{
    Params: { id: string };
    Body: { input: string };
  }>("/decoder/presets/:id/run", async (request, reply) => {
    const body = request.body as { input?: string };
    if (body.input === undefined || body.input === null) {
      return reply.status(400).send({ error: "input is required" });
    }

    const preset = decoderDb.getPreset(request.params.id);
    if (!preset) {
      return reply.status(404).send({ error: "Preset not found" });
    }

    const result = executePipeline(body.input, preset.steps);

    broadcast(
      {
        id: randomUUID(),
        type: "decoder:transform",
        source: "decoder",
        payload: {
          presetId: preset.id,
          presetName: preset.name,
          success: result.success,
        },
        timestamp: new Date().toISOString(),
      },
      false,
    );

    logger.info(`Executed preset ${preset.name}: success=${result.success}`);
    return result;
  });
}
