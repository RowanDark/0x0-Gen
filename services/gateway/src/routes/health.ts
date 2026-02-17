import type { FastifyInstance } from "fastify";

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => {
    return {
      status: "ok" as const,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  });
}
