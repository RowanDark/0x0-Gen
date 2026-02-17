import type { FastifyInstance } from "fastify";
import { createLogger } from "@0x0-gen/logger";
import * as eventDb from "../db/events.js";

const logger = createLogger("gateway:events");

export async function eventRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { projectId?: string; limit?: string; type?: string };
  }>("/events", async (request) => {
    const { projectId, limit, type } = request.query;

    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const effectiveLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 100 : Math.min(parsedLimit, 1000);

    const events = eventDb.listEvents({
      projectId,
      limit: effectiveLimit,
      type,
    });

    logger.debug(`Listed ${events.length} events`);
    return { events };
  });
}
