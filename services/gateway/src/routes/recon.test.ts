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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-recon-test-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function createProject(name = "Test Recon Project") {
  const res = await app.inject({
    method: "POST",
    url: "/recon/projects",
    payload: { name, targets: ["example.com"] },
  });
  return res.json();
}

describe("Recon Projects", () => {
  it("creates a recon project", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/recon/projects",
      payload: { name: "My Recon", targets: ["example.com", "10.0.0.0/8"], description: "Test project" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("My Recon");
    expect(body.targets).toEqual(["example.com", "10.0.0.0/8"]);
    expect(body.description).toBe("Test project");
    expect(body.id).toBeDefined();
  });

  it("rejects project without name", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/recon/projects",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("lists projects", async () => {
    await createProject("P1");
    await createProject("P2");

    const res = await app.inject({ method: "GET", url: "/recon/projects" });
    expect(res.statusCode).toBe(200);
    expect(res.json().projects).toHaveLength(2);
  });

  it("gets project with stats", async () => {
    const project = await createProject();

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.stats).toBeDefined();
    expect(body.stats.totalEntities).toBe(0);
  });

  it("updates a project", async () => {
    const project = await createProject();

    const res = await app.inject({
      method: "PUT",
      url: `/recon/projects/${project.id}`,
      payload: { name: "Updated", targets: ["new.example.com"] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Updated");
    expect(res.json().targets).toEqual(["new.example.com"]);
  });

  it("deletes a project", async () => {
    const project = await createProject();

    const delRes = await app.inject({
      method: "DELETE",
      url: `/recon/projects/${project.id}`,
    });
    expect(delRes.statusCode).toBe(204);

    const getRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});

describe("Recon Import", () => {
  it("imports subfinder text data", async () => {
    const project = await createProject();

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: {
        content: "sub1.example.com\nsub2.example.com\nsub3.example.com",
        source: "subfinder",
        filename: "subdomains.txt",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.stats.total).toBe(3);
    expect(body.stats.new).toBe(3);
    expect(body.source).toBe("subfinder");
  });

  it("imports amass JSON data", async () => {
    const project = await createProject();
    const amassData = [
      '{"name":"api.example.com","domain":"example.com","addresses":[{"ip":"10.0.0.1"}],"tag":"dns","sources":["DNS"]}',
      '{"name":"www.example.com","domain":"example.com","addresses":[{"ip":"10.0.0.2"}],"tag":"cert","sources":["Cert"]}',
    ].join("\n");

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: amassData, source: "amass" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.stats.new).toBeGreaterThan(0);
  });

  it("auto-detects format", async () => {
    const project = await createProject();

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: {
        content: JSON.stringify({
          commandline: "ffuf -u http://example.com/FUZZ",
          results: [
            { url: "http://example.com/admin", status: 200, length: 100 },
          ],
        }),
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.source).toBe("ffuf");
    expect(body.stats.new).toBe(1);
  });

  it("handles deduplication across imports", async () => {
    const project = await createProject();

    // First import
    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: {
        content: "sub1.example.com\nsub2.example.com",
        source: "subfinder",
      },
    });

    // Second import with overlap
    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: {
        content: "sub2.example.com\nsub3.example.com",
        source: "subfinder",
      },
    });

    const body = res.json();
    expect(body.stats.new).toBe(1); // only sub3 is new
    expect(body.stats.duplicates).toBe(1); // sub2 is duplicate
  });

  it("lists imports", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com", source: "subfinder" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/imports`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().imports).toHaveLength(1);
  });

  it("deletes an import", async () => {
    const project = await createProject();

    const importRes = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com", source: "subfinder" },
    });
    const importData = importRes.json();

    const delRes = await app.inject({
      method: "DELETE",
      url: `/recon/projects/${project.id}/imports/${importData.id}`,
    });
    expect(delRes.statusCode).toBe(204);
  });
});

describe("Recon Entities", () => {
  async function importSubdomains(projectId: string, subdomains: string[]) {
    return app.inject({
      method: "POST",
      url: `/recon/projects/${projectId}/import/text`,
      payload: {
        content: subdomains.join("\n"),
        source: "subfinder",
      },
    });
  }

  it("lists entities with filters", async () => {
    const project = await createProject();
    await importSubdomains(project.id, ["a.example.com", "b.example.com"]);

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities?type=subdomain`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.entities).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("searches entities", async () => {
    const project = await createProject();
    await importSubdomains(project.id, ["api.example.com", "www.example.com", "mail.example.com"]);

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities?search=api`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().entities).toHaveLength(1);
    expect(res.json().entities[0].value).toBe("api.example.com");
  });

  it("gets entity with relationships", async () => {
    const project = await createProject();
    await importSubdomains(project.id, ["a.example.com"]);

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entity = listRes.json().entities[0];

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities/${entity.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().relationships).toBeDefined();
  });

  it("updates entity tags and notes", async () => {
    const project = await createProject();
    await importSubdomains(project.id, ["a.example.com"]);

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entity = listRes.json().entities[0];

    const res = await app.inject({
      method: "PUT",
      url: `/recon/projects/${project.id}/entities/${entity.id}`,
      payload: { tags: ["important", "reviewed"], notes: "Needs follow-up" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().tags).toEqual(["important", "reviewed"]);
    expect(res.json().notes).toBe("Needs follow-up");
  });

  it("deletes an entity", async () => {
    const project = await createProject();
    await importSubdomains(project.id, ["a.example.com"]);

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entity = listRes.json().entities[0];

    const delRes = await app.inject({
      method: "DELETE",
      url: `/recon/projects/${project.id}/entities/${entity.id}`,
    });
    expect(delRes.statusCode).toBe(204);
  });
});

describe("Recon Bulk Operations", () => {
  it("bulk tags entities", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com\nb.example.com", source: "subfinder" },
    });

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entityIds = listRes.json().entities.map((e: { id: string }) => e.id);

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/entities/bulk/tag`,
      payload: { entityIds, tag: "priority" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    // Verify tags were applied
    const verifyRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities/${entityIds[0]}`,
    });
    expect(verifyRes.json().tags).toContain("priority");
  });

  it("bulk deletes entities", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com\nb.example.com\nc.example.com", source: "subfinder" },
    });

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entityIds = listRes.json().entities.slice(0, 2).map((e: { id: string }) => e.id);

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/entities/bulk/delete`,
      payload: { entityIds },
    });

    expect(res.statusCode).toBe(200);

    const afterRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    expect(afterRes.json().total).toBe(1);
  });

  it("exports entities as JSON", async () => {
    const project = await createProject();
    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com", source: "subfinder" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/entities/bulk/export`,
      payload: { format: "json" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().entities).toHaveLength(1);
  });

  it("exports entities as CSV", async () => {
    const project = await createProject();
    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com", source: "subfinder" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/entities/bulk/export`,
      payload: { format: "csv" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("id,category,type,value");
    expect(res.body).toContain("a.example.com");
  });
});

describe("Recon Relationships", () => {
  it("creates and lists manual relationships", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com\nb.example.com", source: "subfinder" },
    });

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entities = listRes.json().entities;

    // Create manual relationship
    const createRes = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/relationships`,
      payload: {
        fromEntityId: entities[0].id,
        toEntityId: entities[1].id,
        type: "linked_to",
      },
    });

    expect(createRes.statusCode).toBe(201);

    // List relationships
    const relRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/relationships`,
    });

    expect(relRes.statusCode).toBe(200);
    expect(relRes.json().relationships.length).toBeGreaterThanOrEqual(1);
  });

  it("deletes a relationship", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com\nb.example.com", source: "subfinder" },
    });

    const listRes = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/entities`,
    });
    const entities = listRes.json().entities;

    const createRes = await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/relationships`,
      payload: {
        fromEntityId: entities[0].id,
        toEntityId: entities[1].id,
        type: "linked_to",
      },
    });
    const rel = createRes.json();

    const delRes = await app.inject({
      method: "DELETE",
      url: `/recon/projects/${project.id}/relationships/${rel.id}`,
    });
    expect(delRes.statusCode).toBe(204);
  });
});

describe("Recon Stats and Analysis", () => {
  it("returns project stats", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com\nb.example.com", source: "subfinder" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/stats`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalEntities).toBe(2);
    expect(body.totalImports).toBe(1);
    expect(body.byCategory.infrastructure).toBe(2);
    expect(body.byType.subdomain).toBe(2);
  });

  it("returns timeline data", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com", source: "subfinder" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/timeline`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().timeline).toBeDefined();
  });

  it("returns graph data", async () => {
    const project = await createProject();

    await app.inject({
      method: "POST",
      url: `/recon/projects/${project.id}/import/text`,
      payload: { content: "a.example.com", source: "subfinder" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/recon/projects/${project.id}/graph`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nodes).toBeDefined();
    expect(body.edges).toBeDefined();
    expect(body.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Recon Utility", () => {
  it("lists available parsers", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/recon/parsers",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.parsers.length).toBeGreaterThan(10);
    expect(body.parsers[0].name).toBeDefined();
    expect(body.parsers[0].source).toBeDefined();
    expect(body.parsers[0].formats).toBeDefined();
  });

  it("auto-detects format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/recon/detect",
      payload: {
        content: JSON.stringify({
          commandline: "ffuf -u http://example.com/FUZZ",
          results: [],
        }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe("ffuf");
  });

  it("returns null for undetectable format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/recon/detect",
      payload: { content: "random gibberish that matches nothing" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBeNull();
  });
});
