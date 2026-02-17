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

describe("Gateway /projects", () => {
  it("creates a project", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Test Project" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.name).toBe("Test Project");
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it("rejects project creation without name", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("name is required");
  });

  it("rejects project creation with empty name", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "   " },
    });

    expect(response.statusCode).toBe(400);
  });

  it("lists projects", async () => {
    await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Project A" },
    });
    await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Project B" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.projects).toHaveLength(2);
  });

  it("gets a project by id", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Get Me" },
    });
    const created = createRes.json();

    const response = await app.inject({
      method: "GET",
      url: `/projects/${created.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe("Get Me");
  });

  it("returns 404 for non-existent project", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/projects/00000000-0000-0000-0000-000000000000",
    });

    expect(response.statusCode).toBe(404);
  });

  it("updates a project", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Original" },
    });
    const created = createRes.json();

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${created.id}`,
      payload: { name: "Renamed" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe("Renamed");
    expect(response.json().updatedAt).not.toBe(created.updatedAt);
  });

  it("returns 404 when updating non-existent project", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/projects/00000000-0000-0000-0000-000000000000",
      payload: { name: "Nope" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("deletes a project", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Delete Me" },
    });
    const created = createRes.json();

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/projects/${created.id}`,
    });

    expect(deleteRes.statusCode).toBe(204);

    const getRes = await app.inject({
      method: "GET",
      url: `/projects/${created.id}`,
    });

    expect(getRes.statusCode).toBe(404);
  });

  it("returns 404 when deleting non-existent project", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/projects/00000000-0000-0000-0000-000000000000",
    });

    expect(response.statusCode).toBe(404);
  });
});
