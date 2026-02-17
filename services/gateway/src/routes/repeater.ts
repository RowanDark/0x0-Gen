import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import { sendRequest, parseRawRequest, serializeRequest } from "@0x0-gen/replay";
import type { RepeaterRequest } from "@0x0-gen/contracts";
import * as repeaterDb from "../db/repeater.js";
import { broadcast } from "../broadcaster.js";

const logger = createLogger("gateway:repeater");

export async function repeaterRoutes(app: FastifyInstance) {
  // POST /repeater/tabs — Create new tab
  app.post<{ Body: { name?: string; projectId?: string } }>(
    "/repeater/tabs",
    async (request, reply) => {
      const body = (request.body as { name?: string; projectId?: string }) ?? {};
      const id = randomUUID();
      const now = Date.now();
      const name = body.name ?? `Tab 1`;

      const tab = repeaterDb.createTab({
        id,
        name,
        projectId: body.projectId,
        request: {
          method: "GET",
          url: "",
          headers: {},
          body: null,
        },
        now,
      });

      logger.info(`Created repeater tab ${id}`);
      return reply.status(201).send(tab);
    },
  );

  // GET /repeater/tabs — List all tabs
  app.get<{ Querystring: { projectId?: string } }>(
    "/repeater/tabs",
    async (request) => {
      const { projectId } = request.query;
      const tabs = repeaterDb.listTabs(projectId);
      return { tabs };
    },
  );

  // GET /repeater/tabs/:id — Get single tab with history
  app.get<{ Params: { id: string } }>(
    "/repeater/tabs/:id",
    async (request, reply) => {
      const tab = repeaterDb.getTab(request.params.id);
      if (!tab) {
        return reply.status(404).send({ error: "Tab not found" });
      }
      return tab;
    },
  );

  // PUT /repeater/tabs/:id — Update tab (name, request)
  app.put<{
    Params: { id: string };
    Body: { name?: string; request?: RepeaterRequest };
  }>("/repeater/tabs/:id", async (request, reply) => {
    const body = (request.body as { name?: string; request?: RepeaterRequest }) ?? {};
    const tab = repeaterDb.updateTab(request.params.id, {
      name: body.name,
      request: body.request,
      now: Date.now(),
    });
    if (!tab) {
      return reply.status(404).send({ error: "Tab not found" });
    }
    return tab;
  });

  // DELETE /repeater/tabs/:id — Delete tab
  app.delete<{ Params: { id: string } }>(
    "/repeater/tabs/:id",
    async (request, reply) => {
      const deleted = repeaterDb.deleteTab(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Tab not found" });
      }
      logger.info(`Deleted repeater tab ${request.params.id}`);
      return reply.status(204).send();
    },
  );

  // POST /repeater/tabs/:id/send — Send current request, add to history
  app.post<{ Params: { id: string } }>(
    "/repeater/tabs/:id/send",
    async (request, reply) => {
      const tab = repeaterDb.getTab(request.params.id);
      if (!tab) {
        return reply.status(404).send({ error: "Tab not found" });
      }

      if (!tab.request.url) {
        return reply.status(400).send({ error: "Request URL is required" });
      }

      broadcast(
        {
          id: randomUUID(),
          type: "repeater:sent",
          source: "repeater",
          payload: { tabId: tab.id, url: tab.request.url, method: tab.request.method },
          projectId: tab.projectId,
          timestamp: new Date().toISOString(),
        },
        false,
      );

      logger.info(`Sending repeater request for tab ${tab.id}: ${tab.request.method} ${tab.request.url}`);

      const entry = await sendRequest(tab.request);
      repeaterDb.insertHistoryEntry(tab.id, entry);

      const eventType = entry.error ? "repeater:error" : "repeater:response";
      broadcast(
        {
          id: randomUUID(),
          type: eventType,
          source: "repeater",
          payload: {
            tabId: tab.id,
            historyEntryId: entry.id,
            statusCode: entry.response?.statusCode ?? null,
            error: entry.error,
          },
          projectId: tab.projectId,
          timestamp: new Date().toISOString(),
        },
        false,
      );

      return reply.status(200).send(entry);
    },
  );

  // DELETE /repeater/tabs/:id/history — Clear tab history
  app.delete<{ Params: { id: string } }>(
    "/repeater/tabs/:id/history",
    async (request, reply) => {
      const tab = repeaterDb.getTab(request.params.id);
      if (!tab) {
        return reply.status(404).send({ error: "Tab not found" });
      }
      const deleted = repeaterDb.clearTabHistory(request.params.id);
      logger.info(`Cleared ${deleted} history entries for tab ${request.params.id}`);
      return { deleted };
    },
  );

  // POST /repeater/parse — Parse raw HTTP into structured request
  app.post<{ Body: { raw: string } }>(
    "/repeater/parse",
    async (request, reply) => {
      const body = request.body as { raw?: string };
      if (!body.raw) {
        return reply.status(400).send({ error: "raw field is required" });
      }
      try {
        const parsed = parseRawRequest(body.raw);
        return parsed;
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }
    },
  );

  // POST /repeater/serialize — Serialize structured request to raw HTTP
  app.post<{ Body: RepeaterRequest }>(
    "/repeater/serialize",
    async (request, reply) => {
      const body = request.body as RepeaterRequest | null;
      if (!body?.method || !body?.url) {
        return reply.status(400).send({ error: "method and url are required" });
      }
      try {
        const raw = serializeRequest(body);
        return { raw };
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }
    },
  );

  // POST /repeater/tabs/from-capture/:captureId — Create tab from proxy capture
  app.post<{ Params: { captureId: string } }>(
    "/repeater/tabs/from-capture/:captureId",
    async (request, reply) => {
      const { getCapture } = await import("../db/captures.js");
      const exchange = getCapture(request.params.captureId);
      if (!exchange) {
        return reply.status(404).send({ error: "Capture not found" });
      }

      const id = randomUUID();
      const now = Date.now();

      // Map proxy request headers (may have multi-value arrays from Node http)
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(exchange.request.headers)) {
        headers[k] = Array.isArray(v) ? (v as string[]).join(", ") : v;
      }

      const method = exchange.request.method as RepeaterRequest["method"];
      const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
      const safeMethod = validMethods.includes(method) ? method : "GET";

      const tab = repeaterDb.createTab({
        id,
        name: `${safeMethod} ${exchange.request.url}`.slice(0, 50),
        projectId: exchange.projectId,
        request: {
          method: safeMethod,
          url: exchange.request.url,
          headers,
          body: exchange.request.body,
        },
        now,
      });

      logger.info(`Created repeater tab from capture ${request.params.captureId}`);
      return reply.status(201).send(tab);
    },
  );
}
