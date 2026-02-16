import type { WebSocket } from "@fastify/websocket";
import type { EventMessage } from "@0x0-gen/contracts";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("gateway:broadcaster");

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
  logger.info(`Client connected (total: ${clients.size})`);

  ws.on("close", () => {
    clients.delete(ws);
    logger.info(`Client disconnected (total: ${clients.size})`);
  });
}

export function broadcast(event: EventMessage): void {
  const data = JSON.stringify(event);
  let sent = 0;

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
      sent++;
    }
  }

  logger.debug(`Broadcast event ${event.type} to ${sent} clients`);
}

export function getClientCount(): number {
  return clients.size;
}
