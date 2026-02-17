import type { WebSocket } from "@fastify/websocket";
import type { EventMessage } from "@0x0-gen/contracts";
import { createLogger } from "@0x0-gen/logger";
import { insertEvent } from "./db/events.js";

const logger = createLogger("gateway:broadcaster");

const clients = new Set<WebSocket>();

type EventChannelHandler = (event: EventMessage) => void;

const channelHandlers = new Map<string, Set<EventChannelHandler>>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
  logger.info(`Client connected (total: ${clients.size})`);

  ws.on("close", () => {
    clients.delete(ws);
    logger.info(`Client disconnected (total: ${clients.size})`);
  });
}

export function broadcast(event: EventMessage, persist = true): void {
  if (persist) {
    try {
      insertEvent(event);
    } catch (err) {
      logger.error("Failed to persist event", err);
    }
  }

  const data = JSON.stringify(event);
  let sent = 0;

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
      sent++;
    }
  }

  // Notify channel handlers
  const handlers = channelHandlers.get(event.type);
  if (handlers) {
    for (const handler of handlers) {
      handler(event);
    }
  }

  logger.debug(`Broadcast event ${event.type} to ${sent} clients`);
}

export function onChannel(type: string, handler: EventChannelHandler): () => void {
  if (!channelHandlers.has(type)) {
    channelHandlers.set(type, new Set());
  }
  channelHandlers.get(type)!.add(handler);

  return () => {
    const handlers = channelHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        channelHandlers.delete(type);
      }
    }
  };
}

export function getClientCount(): number {
  return clients.size;
}
