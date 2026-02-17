import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { buildApp } from "../app.js";
import { closeDb, resetDb } from "../db/index.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";

let app: Awaited<ReturnType<typeof buildApp>>;
let tmpDir: string;

// Minimal HTTP target for send tests
let targetServer: http.Server;
let targetPort: number;

beforeEach(async () => {
  closeDb();
  resetDb();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-repeater-test-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  if (targetServer) targetServer.close();
});

async function startTargetServer(): Promise<number> {
  return new Promise((resolve) => {
    targetServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json", "x-echo": "true" });
        res.end(
          JSON.stringify({ method: req.method, url: req.url, body: body || null }),
        );
      });
    });
    targetServer.listen(0, "127.0.0.1", () => {
      const addr = targetServer.address();
      targetPort = typeof addr === "object" && addr ? addr.port : 0;
      resolve(targetPort);
    });
  });
}

describe("Gateway /repeater", () => {
  describe("POST /repeater/tabs", () => {
    it("creates a new tab with default values", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      const tab = response.json();
      expect(tab.id).toBeDefined();
      expect(tab.name).toBe("Tab 1");
      expect(tab.request.method).toBe("GET");
      expect(tab.history).toEqual([]);
      expect(tab.createdAt).toBeGreaterThan(0);
    });

    it("creates a tab with custom name and projectId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: { name: "My Request", projectId: undefined },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().name).toBe("My Request");
    });
  });

  describe("GET /repeater/tabs", () => {
    it("returns empty list initially", async () => {
      const response = await app.inject({ method: "GET", url: "/repeater/tabs" });
      expect(response.statusCode).toBe(200);
      expect(response.json().tabs).toEqual([]);
    });

    it("lists created tabs", async () => {
      await app.inject({ method: "POST", url: "/repeater/tabs", payload: {} });
      await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: { name: "Second Tab" },
      });

      const response = await app.inject({ method: "GET", url: "/repeater/tabs" });
      expect(response.json().tabs).toHaveLength(2);
    });
  });

  describe("GET /repeater/tabs/:id", () => {
    it("returns tab by id", async () => {
      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: { name: "Test Tab" },
      });
      const tabId = created.json().id;

      const response = await app.inject({
        method: "GET",
        url: `/repeater/tabs/${tabId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(tabId);
      expect(response.json().name).toBe("Test Tab");
    });

    it("returns 404 for non-existent tab", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/repeater/tabs/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("PUT /repeater/tabs/:id", () => {
    it("updates tab name", async () => {
      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });
      const tabId = created.json().id;

      const response = await app.inject({
        method: "PUT",
        url: `/repeater/tabs/${tabId}`,
        payload: { name: "Updated Name" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe("Updated Name");
    });

    it("updates tab request", async () => {
      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });
      const tabId = created.json().id;

      const response = await app.inject({
        method: "PUT",
        url: `/repeater/tabs/${tabId}`,
        payload: {
          request: {
            method: "POST",
            url: "http://example.com/api",
            headers: { "content-type": "application/json" },
            body: '{"key":"value"}',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const tab = response.json();
      expect(tab.request.method).toBe("POST");
      expect(tab.request.url).toBe("http://example.com/api");
    });

    it("returns 404 for non-existent tab", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/repeater/tabs/00000000-0000-0000-0000-000000000000",
        payload: { name: "x" },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /repeater/tabs/:id", () => {
    it("deletes a tab", async () => {
      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });
      const tabId = created.json().id;

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/repeater/tabs/${tabId}`,
      });
      expect(deleteRes.statusCode).toBe(204);

      const getRes = await app.inject({
        method: "GET",
        url: `/repeater/tabs/${tabId}`,
      });
      expect(getRes.statusCode).toBe(404);
    });

    it("returns 404 for non-existent tab", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/repeater/tabs/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /repeater/tabs/:id/send", () => {
    it("sends a request and stores history", async () => {
      await startTargetServer();

      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });
      const tabId = created.json().id;

      await app.inject({
        method: "PUT",
        url: `/repeater/tabs/${tabId}`,
        payload: {
          request: {
            method: "GET",
            url: `http://127.0.0.1:${targetPort}/test`,
            headers: {},
            body: null,
          },
        },
      });

      const sendRes = await app.inject({
        method: "POST",
        url: `/repeater/tabs/${tabId}/send`,
      });

      expect(sendRes.statusCode).toBe(200);
      const entry = sendRes.json();
      expect(entry.response.statusCode).toBe(200);
      expect(entry.error).toBeNull();
      expect(entry.duration).toBeGreaterThan(0);

      // Verify stored in history
      const tabRes = await app.inject({
        method: "GET",
        url: `/repeater/tabs/${tabId}`,
      });
      expect(tabRes.json().history).toHaveLength(1);
    });

    it("returns 404 for non-existent tab", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/tabs/00000000-0000-0000-0000-000000000000/send",
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when URL is empty", async () => {
      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });
      const tabId = created.json().id;

      const response = await app.inject({
        method: "POST",
        url: `/repeater/tabs/${tabId}/send`,
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("DELETE /repeater/tabs/:id/history", () => {
    it("clears history for a tab", async () => {
      await startTargetServer();

      const created = await app.inject({
        method: "POST",
        url: "/repeater/tabs",
        payload: {},
      });
      const tabId = created.json().id;

      await app.inject({
        method: "PUT",
        url: `/repeater/tabs/${tabId}`,
        payload: {
          request: {
            method: "GET",
            url: `http://127.0.0.1:${targetPort}/`,
            headers: {},
            body: null,
          },
        },
      });

      await app.inject({ method: "POST", url: `/repeater/tabs/${tabId}/send` });

      const clearRes = await app.inject({
        method: "DELETE",
        url: `/repeater/tabs/${tabId}/history`,
      });
      expect(clearRes.statusCode).toBe(200);
      expect(clearRes.json().deleted).toBeGreaterThan(0);

      const tabRes = await app.inject({
        method: "GET",
        url: `/repeater/tabs/${tabId}`,
      });
      expect(tabRes.json().history).toHaveLength(0);
    });
  });

  describe("POST /repeater/parse", () => {
    it("parses raw HTTP into structured request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/parse",
        payload: { raw: "GET /api HTTP/1.1\r\nHost: example.com\r\n\r\n" },
      });

      expect(response.statusCode).toBe(200);
      const req = response.json();
      expect(req.method).toBe("GET");
      expect(req.url).toBe("http://example.com/api");
    });

    it("returns 400 for invalid raw HTTP", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/parse",
        payload: { raw: "" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when raw field missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/parse",
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /repeater/serialize", () => {
    it("serializes structured request to raw HTTP", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/serialize",
        payload: {
          method: "POST",
          url: "http://example.com/submit",
          headers: { "content-type": "application/json" },
          body: '{"hello":"world"}',
        },
      });

      expect(response.statusCode).toBe(200);
      const { raw } = response.json();
      expect(raw).toContain("POST /submit HTTP/1.1");
      expect(raw).toContain("content-type: application/json");
      expect(raw).toContain('{"hello":"world"}');
    });

    it("returns 400 when method missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/repeater/serialize",
        payload: { url: "http://example.com" },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
