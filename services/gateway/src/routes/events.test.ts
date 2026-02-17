import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { buildApp } from "../app.js";
import { closeDb, resetDb } from "../db/index.js";
import { insertEvent } from "../db/events.js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let app: Awaited<ReturnType<typeof buildApp>>;
let tmpDir: string;

beforeEach(async () => {
  closeDb();
  resetDb();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Gateway /events", () => {
  it("returns empty events list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/events",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.events).toHaveLength(0);
  });

  it("returns persisted events", async () => {
    // Create project first (FK constraint)
    await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Test" },
    });
    const projectRes = await app.inject({ method: "GET", url: "/projects" });
    const project = projectRes.json().projects[0];

    insertEvent({
      id: randomUUID(),
      type: "gateway:ready",
      source: "test",
      payload: { message: "hello" },
      projectId: project.id,
      timestamp: new Date().toISOString(),
    });

    insertEvent({
      id: randomUUID(),
      type: "capture:created",
      source: "test",
      payload: null,
      projectId: project.id,
      timestamp: new Date().toISOString(),
    });

    const response = await app.inject({
      method: "GET",
      url: `/events?projectId=${project.id}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.events).toHaveLength(2);
  });

  it("filters events by type", async () => {
    await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Test" },
    });
    const projectRes = await app.inject({ method: "GET", url: "/projects" });
    const project = projectRes.json().projects[0];

    insertEvent({
      id: randomUUID(),
      type: "gateway:ready",
      source: "test",
      payload: null,
      projectId: project.id,
      timestamp: new Date().toISOString(),
    });

    insertEvent({
      id: randomUUID(),
      type: "capture:created",
      source: "test",
      payload: null,
      projectId: project.id,
      timestamp: new Date().toISOString(),
    });

    const response = await app.inject({
      method: "GET",
      url: `/events?projectId=${project.id}&type=gateway:ready`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("gateway:ready");
  });

  it("respects limit parameter", async () => {
    await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Test" },
    });
    const projectRes = await app.inject({ method: "GET", url: "/projects" });
    const project = projectRes.json().projects[0];

    for (let i = 0; i < 5; i++) {
      insertEvent({
        id: randomUUID(),
        type: "gateway:ready",
        source: "test",
        payload: null,
        projectId: project.id,
        timestamp: new Date(Date.now() + i).toISOString(),
      });
    }

    const response = await app.inject({
      method: "GET",
      url: `/events?projectId=${project.id}&limit=3`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.events).toHaveLength(3);
  });

  it("persists events via broadcast", async () => {
    const { broadcast } = await import("../broadcaster.js");

    await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Test" },
    });
    const projectRes = await app.inject({ method: "GET", url: "/projects" });
    const project = projectRes.json().projects[0];

    broadcast({
      id: randomUUID(),
      type: "capture:created",
      source: "test",
      payload: { data: "test" },
      projectId: project.id,
      timestamp: new Date().toISOString(),
    });

    const response = await app.inject({
      method: "GET",
      url: `/events?projectId=${project.id}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("capture:created");
  });
});
