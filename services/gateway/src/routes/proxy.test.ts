import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { buildApp } from "../app.js";
import { closeDb, resetDb } from "../db/index.js";
import { resetProxyState } from "./proxy.js";
import { resetCACache } from "@0x0-gen/proxy";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";

let app: Awaited<ReturnType<typeof buildApp>>;
let tmpDir: string;

function createTargetServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, port });
    });
  });
}

beforeEach(async () => {
  await resetProxyState();
  resetCACache();
  closeDb();
  resetDb();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterEach(async () => {
  await resetProxyState();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Gateway /proxy", () => {
  describe("POST /proxy/start", () => {
    it("starts the proxy with default config", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.status).toBe("running");
      expect(body.port).toBeGreaterThan(0);
    });

    it("rejects starting when already running", async () => {
      await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });

      const response = await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("Proxy is already running");
    });

    it("accepts custom port and host", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0, host: "127.0.0.1" },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("POST /proxy/stop", () => {
    it("stops the running proxy", async () => {
      await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });

      const response = await app.inject({
        method: "POST",
        url: "/proxy/stop",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("stopped");
    });

    it("rejects stopping when not running", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/proxy/stop",
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("Proxy is not running");
    });
  });

  describe("GET /proxy/status", () => {
    it("returns stopped status when proxy is not running", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/proxy/status",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.running).toBe(false);
      expect(body.captureCount).toBe(0);
    });

    it("returns running status when proxy is active", async () => {
      await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });

      const response = await app.inject({
        method: "GET",
        url: "/proxy/status",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.running).toBe(true);
    });
  });

  describe("GET /proxy/history", () => {
    it("returns empty history", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/proxy/history",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.exchanges).toEqual([]);
    });

    it("returns captured exchanges after proxying", async () => {
      const { server: targetServer, port: targetPort } = await createTargetServer(
        (_req, res) => {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Hello from target");
        },
      );

      const startRes = await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });
      const proxyPort = startRes.json().port;

      await new Promise<void>((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: proxyPort,
            path: `http://127.0.0.1:${targetPort}/test`,
            method: "GET",
            headers: { host: `127.0.0.1:${targetPort}` },
          },
          (res) => {
            res.on("data", () => {});
            res.on("end", resolve);
          },
        );
        req.on("error", reject);
        req.end();
      });

      await new Promise((r) => setTimeout(r, 200));

      const response = await app.inject({
        method: "GET",
        url: "/proxy/history",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.exchanges.length).toBeGreaterThanOrEqual(1);

      const exchange = body.exchanges[0];
      expect(exchange.request).toBeDefined();
      expect(exchange.request.method).toBe("GET");
      expect(exchange.response).toBeDefined();
      expect(exchange.response.statusCode).toBe(200);

      targetServer.close();
    });
  });

  describe("GET /proxy/history/:id", () => {
    it("returns 404 for non-existent exchange", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/proxy/history/00000000-0000-0000-0000-000000000000",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /proxy/history", () => {
    it("clears history and returns deleted count", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/proxy/history",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.deleted).toBe(0);
    });
  });

  describe("request capture and storage", () => {
    it("captures request and response with full headers and body", async () => {
      const { server: targetServer, port: targetPort } = await createTargetServer(
        (req, res) => {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            res.writeHead(200, {
              "Content-Type": "application/json",
              "X-Custom": "test-value",
            });
            res.end(JSON.stringify({ received: body }));
          });
        },
      );

      const startRes = await app.inject({
        method: "POST",
        url: "/proxy/start",
        payload: { port: 0 },
      });
      const proxyPort = startRes.json().port;

      await new Promise<void>((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: proxyPort,
            path: `http://127.0.0.1:${targetPort}/api/data`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              host: `127.0.0.1:${targetPort}`,
            },
          },
          (res) => {
            res.on("data", () => {});
            res.on("end", resolve);
          },
        );
        req.on("error", reject);
        req.write(JSON.stringify({ key: "value" }));
        req.end();
      });

      await new Promise((r) => setTimeout(r, 200));

      const historyRes = await app.inject({
        method: "GET",
        url: "/proxy/history",
      });

      const body = historyRes.json();
      expect(body.exchanges.length).toBe(1);

      const exchange = body.exchanges[0];
      expect(exchange.request.method).toBe("POST");
      expect(exchange.request.body).toBe('{"key":"value"}');
      expect(exchange.request.headers["content-type"]).toBe("application/json");
      expect(exchange.response.statusCode).toBe(200);
      expect(exchange.response.headers["x-custom"]).toBe("test-value");

      const singleRes = await app.inject({
        method: "GET",
        url: `/proxy/history/${exchange.id}`,
      });
      expect(singleRes.statusCode).toBe(200);
      expect(singleRes.json().id).toBe(exchange.id);

      targetServer.close();
    });
  });

  describe("CA management routes", () => {
    describe("GET /proxy/ca/status", () => {
      it("returns not generated status initially", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/proxy/ca/status",
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.generated).toBe(false);
        expect(body.fingerprint).toBe("");
      });
    });

    describe("GET /proxy/ca/cert", () => {
      it("generates and returns CA certificate", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/proxy/ca/cert",
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("application/x-pem-file");
        expect(response.body).toContain("-----BEGIN CERTIFICATE-----");
        expect(response.body).toContain("-----END CERTIFICATE-----");
      });
    });

    describe("POST /proxy/ca/generate", () => {
      it("generates a new CA certificate", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/proxy/ca/generate",
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.generated).toBe(true);
        expect(body.fingerprint).toBeTruthy();
      });

      it("regenerating creates a different CA", async () => {
        const first = await app.inject({
          method: "POST",
          url: "/proxy/ca/generate",
        });
        const firstFingerprint = first.json().fingerprint;

        resetCACache();

        const second = await app.inject({
          method: "POST",
          url: "/proxy/ca/generate",
        });
        const secondFingerprint = second.json().fingerprint;

        expect(firstFingerprint).not.toBe(secondFingerprint);
      });
    });

    describe("MITM config in proxy start", () => {
      it("starts proxy with MITM enabled", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/proxy/start",
          payload: {
            port: 0,
            mitmEnabled: true,
            mitmHosts: ["example.com"],
          },
        });

        expect(response.statusCode).toBe(201);
        expect(response.json().status).toBe("running");
      });

      it("status reflects mitmEnabled", async () => {
        await app.inject({
          method: "POST",
          url: "/proxy/start",
          payload: { port: 0, mitmEnabled: true },
        });

        const status = await app.inject({
          method: "GET",
          url: "/proxy/status",
        });

        expect(status.json().mitmEnabled).toBe(true);
      });
    });
  });
});
