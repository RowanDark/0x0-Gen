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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-services-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Services Status", () => {
  it("returns status for all services", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/services",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.services).toBeInstanceOf(Array);
    expect(body.services.length).toBeGreaterThan(0);
    expect(body.services).toHaveLength(6);

    expect(body.services.map((s: { name: string }) => s.name)).toEqual([
      "proxy",
      "replay",
      "decoder",
      "intruder",
      "recon",
      "mapper",
    ]);

    for (const service of body.services) {
      expect(service).toHaveProperty("name");
      expect(service).toHaveProperty("status");
      expect(["running", "stopped", "error", "unknown"]).toContain(service.status);
    }
  });

  it("returns in-process services as running", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/services",
    });

    const body = res.json();
    const inProcessServices = body.services.filter(
      (s: { name: string }) => ["replay", "decoder", "intruder", "recon", "mapper"].includes(s.name),
    );

    for (const service of inProcessServices) {
      expect(service.status).toBe("running");
    }
  });

  it("returns status for individual service", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/services/replay",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("replay");
    expect(body.status).toBe("running");
  });

  it("returns 404 for unknown service", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/services/nonexistent",
    });

    expect(res.statusCode).toBe(404);
  });

  it("includes lastCheck timestamp in response", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/services/decoder",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.lastCheck).toBeDefined();
    expect(typeof body.lastCheck).toBe("number");
  });
});
