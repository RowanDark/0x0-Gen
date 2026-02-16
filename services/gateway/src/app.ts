import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { createLogger } from "@0x0-gen/logger";
import { healthRoutes } from "./routes/health.js";
import { wsRoutes } from "./routes/ws.js";
import { serviceRoutes } from "./routes/services.js";

const logger = createLogger("gateway");

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  await app.register(healthRoutes);
  await app.register(wsRoutes);
  await app.register(serviceRoutes);

  logger.info("Gateway app built");

  return app;
}
