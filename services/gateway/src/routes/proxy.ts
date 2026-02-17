import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import { createProxyServer, type ProxyServer } from "@0x0-gen/proxy";
import type { ProxyConfig, CapturedExchange } from "@0x0-gen/contracts";
import { ProxyConfigSchema } from "@0x0-gen/contracts";
import * as captureDb from "../db/captures.js";
import { broadcast } from "../broadcaster.js";

const logger = createLogger("gateway:proxy");

let proxyServer: ProxyServer | null = null;
let activeConfig: ProxyConfig | null = null;

export function getProxyServer(): ProxyServer | null {
  return proxyServer;
}

export async function resetProxyState(): Promise<void> {
  if (proxyServer?.isRunning()) {
    await proxyServer.stop();
  }
  proxyServer = null;
  activeConfig = null;
}

export async function proxyRoutes(app: FastifyInstance) {
  app.post("/proxy/start", async (request, reply) => {
    if (proxyServer?.isRunning()) {
      return reply.status(409).send({ error: "Proxy is already running" });
    }

    const body = request.body as Partial<ProxyConfig> | undefined;
    const parsed = ProxyConfigSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const config = parsed.data;
    activeConfig = config;

    proxyServer = createProxyServer(config, {
      onRequest(proxyReq) {
        broadcast(
          {
            id: randomUUID(),
            type: "proxy:request",
            source: "proxy",
            payload: { requestId: proxyReq.id, method: proxyReq.method, url: proxyReq.url },
            projectId: config.projectId,
            timestamp: new Date().toISOString(),
          },
          false,
        );
      },
      onResponse(requestId, proxyRes) {
        broadcast(
          {
            id: randomUUID(),
            type: "proxy:response",
            source: "proxy",
            payload: { requestId, statusCode: proxyRes.statusCode },
            projectId: config.projectId,
            timestamp: new Date().toISOString(),
          },
          false,
        );
      },
      onExchange(exchange: CapturedExchange) {
        try {
          captureDb.insertCapture(exchange);
        } catch (err) {
          logger.error("Failed to store capture", { error: (err as Error).message });
        }
      },
    });

    try {
      const result = await proxyServer.start();
      logger.info(`Proxy started on port ${result.port}`);
      return reply.status(201).send({ port: result.port, status: "running" });
    } catch (err) {
      proxyServer = null;
      activeConfig = null;
      logger.error("Failed to start proxy", { error: (err as Error).message });
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  app.post("/proxy/stop", async (_request, reply) => {
    if (!proxyServer?.isRunning()) {
      return reply.status(409).send({ error: "Proxy is not running" });
    }

    try {
      await proxyServer.stop();
      proxyServer = null;
      activeConfig = null;
      logger.info("Proxy stopped");
      return reply.status(200).send({ status: "stopped" });
    } catch (err) {
      logger.error("Failed to stop proxy", { error: (err as Error).message });
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  app.get("/proxy/status", async () => {
    const running = proxyServer?.isRunning() ?? false;
    return {
      running,
      port: activeConfig?.port ?? 8080,
      captureCount: proxyServer?.getCaptureCount() ?? 0,
    };
  });

  app.get<{
    Querystring: { projectId?: string; limit?: string; offset?: string };
  }>("/proxy/history", async (request) => {
    const { projectId, limit, offset } = request.query;

    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const effectiveLimit =
      isNaN(parsedLimit) || parsedLimit < 1 ? 100 : Math.min(parsedLimit, 1000);

    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const effectiveOffset = isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

    const exchanges = captureDb.listCaptures({
      projectId,
      limit: effectiveLimit,
      offset: effectiveOffset,
    });

    return { exchanges };
  });

  app.get<{ Params: { id: string } }>("/proxy/history/:id", async (request, reply) => {
    const exchange = captureDb.getCapture(request.params.id);
    if (!exchange) {
      return reply.status(404).send({ error: "Exchange not found" });
    }
    return exchange;
  });

  app.delete<{
    Querystring: { projectId?: string };
  }>("/proxy/history", async (request) => {
    const { projectId } = request.query;
    const deleted = captureDb.clearCaptures(projectId);
    logger.info(`Cleared ${deleted} captures`);
    return { deleted };
  });
}
