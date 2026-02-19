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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-mapper-test-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function createReconProject(name = "Test Project") {
  const res = await app.inject({
    method: "POST",
    url: "/recon/projects",
    payload: { name, targets: ["example.com"] },
  });
  return res.json();
}

async function createCanvas(projectId: string, name = "Test Canvas") {
  const res = await app.inject({
    method: "POST",
    url: "/mapper/canvases",
    payload: { projectId, name },
  });
  return res.json();
}

describe("Mapper Canvases", () => {
  it("creates a canvas", async () => {
    const project = await createReconProject();
    const res = await app.inject({
      method: "POST",
      url: "/mapper/canvases",
      payload: { projectId: project.id, name: "My Canvas" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("My Canvas");
    expect(body.projectId).toBe(project.id);
    expect(body.nodes).toEqual([]);
    expect(body.edges).toEqual([]);
    expect(body.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("rejects canvas without required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/mapper/canvases",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("lists canvases for project", async () => {
    const project = await createReconProject();
    await createCanvas(project.id, "Canvas 1");
    await createCanvas(project.id, "Canvas 2");

    const res = await app.inject({
      method: "GET",
      url: `/mapper/canvases?projectId=${project.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().canvases).toHaveLength(2);
  });

  it("gets canvas with nodes and edges", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const res = await app.inject({
      method: "GET",
      url: `/mapper/canvases/${canvas.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(canvas.id);
    expect(body.nodes).toEqual([]);
    expect(body.edges).toEqual([]);
  });

  it("updates canvas name and viewport", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const res = await app.inject({
      method: "PUT",
      url: `/mapper/canvases/${canvas.id}`,
      payload: { name: "Renamed", viewport: { x: 100, y: 200, zoom: 1.5 } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Renamed");
    expect(body.viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
  });

  it("deletes canvas", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const res = await app.inject({
      method: "DELETE",
      url: `/mapper/canvases/${canvas.id}`,
    });
    expect(res.statusCode).toBe(200);

    const getRes = await app.inject({
      method: "GET",
      url: `/mapper/canvases/${canvas.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});

describe("Mapper Nodes", () => {
  it("adds nodes to canvas", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const res = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/nodes`,
      payload: {
        nodes: [
          { type: "domain", label: "example.com", x: 100, y: 200 },
          { type: "ip", label: "1.2.3.4", x: 300, y: 200 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.nodes).toHaveLength(2);
    expect(body.nodes[0].label).toBe("example.com");
    expect(body.nodes[0].type).toBe("domain");
    expect(body.nodes[1].label).toBe("1.2.3.4");
  });

  it("updates node position", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const addRes = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/nodes`,
      payload: { nodes: [{ type: "domain", label: "test.com", x: 0, y: 0 }] },
    });
    const nodeId = addRes.json().nodes[0].id;

    const res = await app.inject({
      method: "PUT",
      url: `/mapper/canvases/${canvas.id}/nodes/${nodeId}`,
      payload: { x: 500, y: 300, pinned: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.x).toBe(500);
    expect(body.y).toBe(300);
    expect(body.pinned).toBe(true);
  });

  it("deletes node and its edges", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    // Add two nodes
    const addRes = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/nodes`,
      payload: {
        nodes: [
          { type: "domain", label: "a.com", x: 0, y: 0 },
          { type: "ip", label: "1.1.1.1", x: 100, y: 0 },
        ],
      },
    });
    const nodes = addRes.json().nodes;

    // Add edge between them
    await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/edges`,
      payload: { fromNodeId: nodes[0].id, toNodeId: nodes[1].id, type: "resolves_to" },
    });

    // Delete first node
    const delRes = await app.inject({
      method: "DELETE",
      url: `/mapper/canvases/${canvas.id}/nodes/${nodes[0].id}`,
    });
    expect(delRes.statusCode).toBe(200);

    // Verify canvas state
    const getRes = await app.inject({
      method: "GET",
      url: `/mapper/canvases/${canvas.id}`,
    });
    const body = getRes.json();
    expect(body.nodes).toHaveLength(1);
    expect(body.edges).toHaveLength(0); // Edge should be removed
  });
});

describe("Mapper Edges", () => {
  it("adds edge between nodes", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const addRes = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/nodes`,
      payload: {
        nodes: [
          { type: "domain", label: "a.com", x: 0, y: 0 },
          { type: "ip", label: "1.1.1.1", x: 100, y: 0 },
        ],
      },
    });
    const nodes = addRes.json().nodes;

    const res = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/edges`,
      payload: {
        fromNodeId: nodes[0].id,
        toNodeId: nodes[1].id,
        type: "resolves_to",
        label: "resolves to",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe("resolves_to");
    expect(body.fromNodeId).toBe(nodes[0].id);
    expect(body.toNodeId).toBe(nodes[1].id);
  });

  it("deletes edge", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    const addRes = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/nodes`,
      payload: {
        nodes: [
          { type: "domain", label: "a.com", x: 0, y: 0 },
          { type: "ip", label: "1.1.1.1", x: 100, y: 0 },
        ],
      },
    });
    const nodes = addRes.json().nodes;

    const edgeRes = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/edges`,
      payload: { fromNodeId: nodes[0].id, toNodeId: nodes[1].id, type: "resolves_to" },
    });
    const edgeId = edgeRes.json().id;

    const delRes = await app.inject({
      method: "DELETE",
      url: `/mapper/canvases/${canvas.id}/edges/${edgeId}`,
    });
    expect(delRes.statusCode).toBe(200);
  });
});

describe("Mapper Transforms", () => {
  it("lists available transforms", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/mapper/transforms",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.transforms).toBeDefined();
    expect(body.transforms.length).toBeGreaterThan(0);

    // Verify transform structure
    const transform = body.transforms[0];
    expect(transform.id).toBeDefined();
    expect(transform.name).toBeDefined();
    expect(transform.inputTypes).toBeDefined();
    expect(transform.outputTypes).toBeDefined();
    expect(typeof transform.requiresApi).toBe("boolean");
  });
});

describe("Mapper Layout", () => {
  it("auto-layouts canvas nodes", async () => {
    const project = await createReconProject();
    const canvas = await createCanvas(project.id);

    // Add several nodes at the same position
    await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/nodes`,
      payload: {
        nodes: [
          { type: "domain", label: "a.com", x: 0, y: 0 },
          { type: "ip", label: "1.1.1.1", x: 0, y: 0 },
          { type: "subdomain", label: "sub.a.com", x: 0, y: 0 },
        ],
      },
    });

    const res = await app.inject({
      method: "POST",
      url: `/mapper/canvases/${canvas.id}/layout`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // After layout, nodes should be at different positions (repulsion)
    const positions = body.nodes.map((n: any) => `${Math.round(n.x)},${Math.round(n.y)}`);
    const unique = new Set(positions);
    expect(unique.size).toBeGreaterThan(1);
  });
});
