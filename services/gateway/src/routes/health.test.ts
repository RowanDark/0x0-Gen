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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-health-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Gateway /healthz", () => {
  it("returns status ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/healthz",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });
});
