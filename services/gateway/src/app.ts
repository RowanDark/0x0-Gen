import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { createLogger } from "@0x0-gen/logger";
import { healthRoutes } from "./routes/health.js";
import { wsRoutes } from "./routes/ws.js";
import { serviceRoutes } from "./routes/services.js";
import { projectRoutes } from "./routes/projects.js";
import { eventRoutes } from "./routes/events.js";
import { attachRoutes } from "./routes/attach.js";
import { proxyRoutes } from "./routes/proxy.js";
import { repeaterRoutes } from "./routes/repeater.js";
import { decoderRoutes } from "./routes/decoder.js";
import { intruderRoutes } from "./routes/intruder.js";
import { reconRoutes } from "./routes/recon.js";
import multipart from "@fastify/multipart";

const logger = createLogger("gateway");

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  await app.register(healthRoutes);
  await app.register(wsRoutes);
  await app.register(serviceRoutes);
  await app.register(projectRoutes);
  await app.register(eventRoutes);
  await app.register(attachRoutes);
  await app.register(proxyRoutes);
  await app.register(repeaterRoutes);
  await app.register(decoderRoutes);
  await app.register(intruderRoutes);
  await app.register(reconRoutes);

  logger.info("Gateway app built");

  return app;
}
