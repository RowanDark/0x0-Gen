import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { buildApp } from "../app.js";
import { closeDb, resetDb } from "../db/index.js";
import { clearConnectedTools } from "./attach.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let app: Awaited<ReturnType<typeof buildApp>>;
let tmpDir: string;

beforeEach(async () => {
  closeDb();
  resetDb();
  clearConnectedTools();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  clearConnectedTools();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Gateway /hub attach", () => {
  it("generates an attach token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/hub/token",
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");
    expect(body.expires).toBeDefined();
    expect(body.expires).toBeGreaterThan(Date.now());
  });

  it("attaches a tool with valid token", async () => {
    const tokenRes = await app.inject({
      method: "POST",
      url: "/hub/token",
    });
    const { token } = tokenRes.json();

    const attachRes = await app.inject({
      method: "GET",
      url: `/hub/attach?token=${token}&name=proxy`,
    });

    expect(attachRes.statusCode).toBe(200);
    const body = attachRes.json();
    expect(body.status).toBe("attached");
    expect(body.name).toBe("proxy");
  });

  it("rejects attach without token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/hub/attach?name=proxy",
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects attach without name", async () => {
    const tokenRes = await app.inject({
      method: "POST",
      url: "/hub/token",
    });
    const { token } = tokenRes.json();

    const response = await app.inject({
      method: "GET",
      url: `/hub/attach?token=${token}`,
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/hub/attach?token=invalid-token&name=proxy",
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects already-used token", async () => {
    const tokenRes = await app.inject({
      method: "POST",
      url: "/hub/token",
    });
    const { token } = tokenRes.json();

    await app.inject({
      method: "GET",
      url: `/hub/attach?token=${token}&name=proxy`,
    });

    const secondRes = await app.inject({
      method: "GET",
      url: `/hub/attach?token=${token}&name=repeater`,
    });

    expect(secondRes.statusCode).toBe(401);
    expect(secondRes.json().error).toBe("Token already used");
  });

  it("lists connected tools", async () => {
    const tokenRes = await app.inject({
      method: "POST",
      url: "/hub/token",
    });
    const { token } = tokenRes.json();

    await app.inject({
      method: "GET",
      url: `/hub/attach?token=${token}&name=proxy`,
    });

    const response = await app.inject({
      method: "GET",
      url: "/hub/tools",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tools).toHaveLength(1);
    expect(body.tools[0].name).toBe("proxy");
    expect(body.tools[0].status).toBe("attached");
  });

  it("detaches a tool", async () => {
    const tokenRes = await app.inject({
      method: "POST",
      url: "/hub/token",
    });
    const { token } = tokenRes.json();

    await app.inject({
      method: "GET",
      url: `/hub/attach?token=${token}&name=proxy`,
    });

    const deleteRes = await app.inject({
      method: "DELETE",
      url: "/hub/tools/proxy",
    });

    expect(deleteRes.statusCode).toBe(204);

    const listRes = await app.inject({
      method: "GET",
      url: "/hub/tools",
    });

    expect(listRes.json().tools).toHaveLength(0);
  });

  it("returns 404 when detaching non-existent tool", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/hub/tools/nonexistent",
    });

    expect(response.statusCode).toBe(404);
  });
});
