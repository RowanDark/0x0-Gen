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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "0x0gen-test-decoder-"));
  process.env.DATA_DIR = tmpDir;
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  closeDb();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Gateway /decoder", () => {
  describe("POST /decoder/transform", () => {
    it("executes a single transform", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/transform",
        payload: {
          input: "Hello",
          steps: [{ type: "base64", direction: "encode" }],
        },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.output).toBe("SGVsbG8=");
      expect(body.steps).toHaveLength(1);
    });

    it("executes a multi-step pipeline", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/transform",
        payload: {
          input: "a=1&b=2",
          steps: [
            { type: "url", direction: "encode" },
            { type: "base64", direction: "encode" },
          ],
        },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.steps).toHaveLength(2);
    });

    it("returns error for unsupported direction", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/transform",
        payload: {
          input: "Hello",
          steps: [{ type: "md5", direction: "decode" }],
        },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("does not support direction");
    });

    it("rejects missing input", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/transform",
        payload: { steps: [{ type: "base64", direction: "encode" }] },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects empty steps", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/transform",
        payload: { input: "Hello", steps: [] },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /decoder/:type/:direction", () => {
    it("executes a single base64 encode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/base64/encode",
        payload: { input: "Hello" },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.output).toBe("SGVsbG8=");
    });

    it("executes base64 decode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/base64/decode",
        payload: { input: "SGVsbG8=" },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.output).toBe("Hello");
    });

    it("executes md5 hash", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/md5/encode",
        payload: { input: "Hello" },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.output).toBe("8b1a9953c4611296a827abf8c47804d7");
    });

    it("rejects invalid type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/invalid/encode",
        payload: { input: "Hello" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects invalid direction", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/base64/invalid",
        payload: { input: "Hello" },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /decoder/types", () => {
    it("returns all transform types", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/decoder/types",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.types).toHaveLength(11);
      const typeNames = body.types.map((t: { type: string }) => t.type);
      expect(typeNames).toContain("base64");
      expect(typeNames).toContain("md5");
      expect(typeNames).toContain("jwt");
    });
  });

  describe("Preset CRUD", () => {
    it("lists built-in presets", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/decoder/presets",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.presets.length).toBeGreaterThanOrEqual(6);
    });

    it("creates a custom preset", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/presets",
        payload: {
          name: "My Preset",
          steps: [{ type: "base64", direction: "decode" }],
        },
      });
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.name).toBe("My Preset");
      expect(body.steps).toHaveLength(1);
      expect(body.id).toBeTruthy();
    });

    it("gets a preset by id", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/decoder/presets",
        payload: {
          name: "Test Preset",
          steps: [{ type: "url", direction: "decode" }],
        },
      });
      const preset = createRes.json();

      const getRes = await app.inject({
        method: "GET",
        url: `/decoder/presets/${preset.id}`,
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().name).toBe("Test Preset");
    });

    it("updates a custom preset", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/decoder/presets",
        payload: {
          name: "Original",
          steps: [{ type: "base64", direction: "decode" }],
        },
      });
      const preset = createRes.json();

      const updateRes = await app.inject({
        method: "PUT",
        url: `/decoder/presets/${preset.id}`,
        payload: {
          name: "Updated",
          steps: [
            { type: "base64", direction: "decode" },
            { type: "url", direction: "decode" },
          ],
        },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().name).toBe("Updated");
      expect(updateRes.json().steps).toHaveLength(2);
    });

    it("deletes a custom preset", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/decoder/presets",
        payload: {
          name: "To Delete",
          steps: [{ type: "base64", direction: "decode" }],
        },
      });
      const preset = createRes.json();

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/decoder/presets/${preset.id}`,
      });
      expect(deleteRes.statusCode).toBe(204);

      const getRes = await app.inject({
        method: "GET",
        url: `/decoder/presets/${preset.id}`,
      });
      expect(getRes.statusCode).toBe(404);
    });

    it("cannot delete built-in presets", async () => {
      const listRes = await app.inject({
        method: "GET",
        url: "/decoder/presets",
      });
      const builtinPreset = listRes
        .json()
        .presets.find((p: { isBuiltin: boolean }) => p.isBuiltin);

      if (builtinPreset) {
        const deleteRes = await app.inject({
          method: "DELETE",
          url: `/decoder/presets/${builtinPreset.id}`,
        });
        expect(deleteRes.statusCode).toBe(404);
      }
    });

    it("returns 404 for non-existent preset", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/decoder/presets/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });

    it("rejects preset creation without name", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/presets",
        payload: {
          steps: [{ type: "base64", direction: "decode" }],
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /decoder/presets/:id/run", () => {
    it("runs a preset on input", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/decoder/presets",
        payload: {
          name: "Base64 Encode",
          steps: [{ type: "base64", direction: "encode" }],
        },
      });
      const preset = createRes.json();

      const runRes = await app.inject({
        method: "POST",
        url: `/decoder/presets/${preset.id}/run`,
        payload: { input: "Hello" },
      });
      expect(runRes.statusCode).toBe(200);
      const body = runRes.json();
      expect(body.success).toBe(true);
      expect(body.output).toBe("SGVsbG8=");
    });

    it("runs a built-in preset", async () => {
      const listRes = await app.inject({
        method: "GET",
        url: "/decoder/presets",
      });
      const base64Preset = listRes
        .json()
        .presets.find((p: { name: string }) => p.name === "Base64 Decode");

      const runRes = await app.inject({
        method: "POST",
        url: `/decoder/presets/${base64Preset.id}/run`,
        payload: { input: "SGVsbG8=" },
      });
      expect(runRes.statusCode).toBe(200);
      expect(runRes.json().output).toBe("Hello");
    });

    it("returns 404 for non-existent preset", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/decoder/presets/00000000-0000-0000-0000-000000000000/run",
        payload: { input: "Hello" },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
