import { createLogger } from "@0x0-gen/logger";
import { buildApp } from "./app.js";

const logger = createLogger("gateway");

const PORT = parseInt(process.env.GATEWAY_PORT ?? "3100", 10);
const HOST = process.env.GATEWAY_HOST ?? "0.0.0.0";

async function main() {
  const app = await buildApp();

  await app.listen({ port: PORT, host: HOST });
  logger.info(`Gateway listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  logger.error("Failed to start gateway", err);
  process.exit(1);
});
