import type { FastifyInstance } from "fastify";
import { createLogger } from "@0x0-gen/logger";
import { randomUUID } from "node:crypto";

const logger = createLogger("gateway:attach");

interface AttachToken {
  token: string;
  expires: number;
  used: boolean;
}

export interface ConnectedTool {
  name: string;
  status: "attached";
  attachedAt: string;
}

const tokens = new Map<string, AttachToken>();
const connectedTools = new Map<string, ConnectedTool>();

// Expose for SDK/tests
export function getConnectedTools(): ConnectedTool[] {
  return Array.from(connectedTools.values());
}

export function clearConnectedTools(): void {
  connectedTools.clear();
  tokens.clear();
}

export async function attachRoutes(app: FastifyInstance) {
  app.post("/hub/token", async (_request, reply) => {
    const token = randomUUID();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    tokens.set(token, { token, expires, used: false });

    logger.info(`Attach token generated: ${token.substring(0, 8)}...`);

    return reply.status(201).send({ token, expires });
  });

  app.get<{ Querystring: { token?: string; name?: string } }>("/hub/attach", async (request, reply) => {
    const { token, name } = request.query;

    if (!token) {
      return reply.status(400).send({ error: "token is required" });
    }

    if (!name) {
      return reply.status(400).send({ error: "name is required" });
    }

    const stored = tokens.get(token);
    if (!stored) {
      return reply.status(401).send({ error: "Invalid token" });
    }

    if (stored.used) {
      return reply.status(401).send({ error: "Token already used" });
    }

    if (stored.expires < Date.now()) {
      tokens.delete(token);
      return reply.status(401).send({ error: "Token expired" });
    }

    stored.used = true;

    connectedTools.set(name, {
      name,
      status: "attached",
      attachedAt: new Date().toISOString(),
    });

    logger.info(`Tool attached: ${name}`);

    return { status: "attached", name };
  });

  app.delete<{ Params: { name: string } }>("/hub/tools/:name", async (request, reply) => {
    const { name } = request.params;

    if (!connectedTools.has(name)) {
      return reply.status(404).send({ error: "Tool not found" });
    }

    connectedTools.delete(name);
    logger.info(`Tool detached: ${name}`);

    return reply.status(204).send();
  });

  app.get("/hub/tools", async () => {
    const tools = getConnectedTools();
    return { tools };
  });
}
