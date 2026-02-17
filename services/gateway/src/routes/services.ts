import type { FastifyInstance } from "fastify";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("gateway:services");

const SERVICE_NAMES = ["proxy", "replay", "decoder", "intruder"] as const;

interface ServiceStatus {
  name: string;
  status: "stub";
}

export async function serviceRoutes(app: FastifyInstance) {
  app.get("/services", async () => {
    const services: ServiceStatus[] = SERVICE_NAMES.map((name) => ({
      name,
      status: "stub" as const,
    }));

    logger.debug("Service status requested");

    return { services };
  });
}
