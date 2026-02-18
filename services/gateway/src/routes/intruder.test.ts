import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { buildApp } from "../app.js";
import { closeDb, resetDb } from "../db/index.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let app: Awaited<ReturnType<typeof buildApp>>;
let tmpDir: string;

beforeEach(async () => {
  closeDb();
  resetDb();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-intruder-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

const sampleConfig = {
  name: "Test Attack",
  baseRequest:
    "GET /search?q=\u00A7test\u00A7 HTTP/1.1\r\nHost: example.com\r\n\r\n",
  positions: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      start: 14,
      end: 20,
      name: "pos1",
    },
  ],
  payloadSets: [
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "test payloads",
      payloads: ["hello", "world"],
      source: "manual" as const,
    },
  ],
  attackType: "sniper" as const,
  options: {
    concurrency: 1,
    delayMs: 0,
    followRedirects: false,
    timeout: 30000,
    stopOnError: false,
  },
};

describe("Gateway /intruder", () => {
  describe("Config CRUD", () => {
    it("creates a config", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: sampleConfig,
      });
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.name).toBe("Test Attack");
      expect(body.id).toBeTruthy();
      expect(body.attackType).toBe("sniper");
      expect(body.positions).toHaveLength(1);
      expect(body.payloadSets).toHaveLength(1);
    });

    it("lists configs", async () => {
      await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: sampleConfig,
      });
      await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: { ...sampleConfig, name: "Second Attack" },
      });

      const response = await app.inject({
        method: "GET",
        url: "/intruder/configs",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.configs).toHaveLength(2);
    });

    it("gets config by id", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: sampleConfig,
      });
      const config = createRes.json();

      const response = await app.inject({
        method: "GET",
        url: `/intruder/configs/${config.id}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe("Test Attack");
    });

    it("returns 404 for non-existent config", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/intruder/configs/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });

    it("updates a config", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: sampleConfig,
      });
      const config = createRes.json();

      const response = await app.inject({
        method: "PUT",
        url: `/intruder/configs/${config.id}`,
        payload: { name: "Updated Attack", attackType: "battering_ram" },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe("Updated Attack");
      expect(response.json().attackType).toBe("battering_ram");
    });

    it("deletes a config", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: sampleConfig,
      });
      const config = createRes.json();

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/intruder/configs/${config.id}`,
      });
      expect(deleteRes.statusCode).toBe(204);

      const getRes = await app.inject({
        method: "GET",
        url: `/intruder/configs/${config.id}`,
      });
      expect(getRes.statusCode).toBe(404);
    });

    it("rejects config without name", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: { ...sampleConfig, name: undefined },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects config without baseRequest", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: { ...sampleConfig, baseRequest: undefined },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects config without attackType", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: { ...sampleConfig, attackType: undefined },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Attack execution", () => {
    it("rejects start with no positions", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: { ...sampleConfig, positions: [] },
      });
      const config = createRes.json();

      const response = await app.inject({
        method: "POST",
        url: `/intruder/configs/${config.id}/start`,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("No positions");
    });

    it("rejects start with no payload sets", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/intruder/configs",
        payload: { ...sampleConfig, payloadSets: [] },
      });
      const config = createRes.json();

      const response = await app.inject({
        method: "POST",
        url: `/intruder/configs/${config.id}/start`,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("No payload sets");
    });

    it("returns 404 for non-existent config start", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/configs/00000000-0000-0000-0000-000000000000/start",
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 404 for non-existent attack status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/intruder/attacks/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Utility routes", () => {
    it("parses positions from request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/parse-positions",
        payload: {
          request:
            "GET /search?q=\u00A7test\u00A7&lang=\u00A7en\u00A7 HTTP/1.1",
        },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.positions).toHaveLength(2);
      expect(body.positions[0].name).toBe("pos1");
      expect(body.positions[1].name).toBe("pos2");
    });

    it("rejects parse-positions without request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/intruder/parse-positions",
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it("lists payload types", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/intruder/payload-types",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.types.length).toBeGreaterThanOrEqual(5);
      const ids = body.types.map((t: { id: string }) => t.id);
      expect(ids).toContain("passwords");
      expect(ids).toContain("sqli");
      expect(ids).toContain("xss");
    });
  });
});
