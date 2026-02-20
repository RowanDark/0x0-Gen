import type { FastifyInstance } from "fastify";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("gateway:services");

type ServiceStatus = "running" | "stopped" | "error" | "unknown";

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  port?: number;
  lastCheck?: number;
  error?: string;
}

const SERVICE_PORTS: Record<string, number> = {
  proxy: 8080,
};

async function checkServiceHealth(name: string): Promise<ServiceInfo> {
  const info: ServiceInfo = {
    name,
    status: "unknown",
    lastCheck: Date.now(),
  };

  // For services that run within the gateway process, they're always "running"
  // if the gateway is responding
  const inProcessServices = ["replay", "decoder", "intruder", "recon", "mapper"];

  if (inProcessServices.includes(name)) {
    info.status = "running";
    return info;
  }

  // For the proxy, check if it's actually listening
  if (name === "proxy") {
    try {
      const port = SERVICE_PORTS.proxy;
      info.port = port;

      const response = await fetch(`http://localhost:${port}/status`, {
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);

      info.status = response?.ok ? "running" : "stopped";
    } catch (error) {
      info.status = "error";
      info.error = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return info;
}

export async function serviceRoutes(app: FastifyInstance) {
  app.get("/services", async () => {
    const serviceNames = ["proxy", "replay", "decoder", "intruder", "recon", "mapper"];

    const services = await Promise.all(
      serviceNames.map((name) => checkServiceHealth(name)),
    );

    logger.debug("Service status requested", { services });

    return { services };
  });

  app.get<{ Params: { name: string } }>("/services/:name", async (request, reply) => {
    const { name } = request.params;
    const validServices = ["proxy", "replay", "decoder", "intruder", "recon", "mapper"];

    if (!validServices.includes(name)) {
      return reply.status(404).send({ error: "Unknown service" });
    }

    const info = await checkServiceHealth(name);
    return info;
  });
}
