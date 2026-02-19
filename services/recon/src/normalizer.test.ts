import { describe, it, expect } from "vitest";
import { normalizeEntity, normalizeEntities } from "./normalizer.js";
import type { RawEntity } from "./parsers/base.js";

describe("normalizeEntity", () => {
  it("normalizes a subdomain entity", () => {
    const raw: RawEntity = {
      type: "subdomain",
      category: "infrastructure",
      value: "API.Example.COM.",
      attributes: { tag: "dns" },
      confidence: 80,
      source: "amass",
    };

    const entity = normalizeEntity(raw, "proj-123", "imp-456");
    expect(entity.value).toBe("API.Example.COM.");
    expect(entity.normalizedValue).toBe("api.example.com");
    expect(entity.category).toBe("infrastructure");
    expect(entity.type).toBe("subdomain");
    expect(entity.projectId).toBe("proj-123");
    expect(entity.importId).toBe("imp-456");
    expect(entity.sources).toEqual(["amass"]);
    expect(entity.confidence).toBe(80);
    expect(entity.tags).toEqual([]);
  });

  it("normalizes URL by removing protocol", () => {
    const raw: RawEntity = {
      type: "url",
      category: "web_assets",
      value: "HTTPS://Example.com/Path/",
      attributes: {},
      source: "ffuf",
    };

    const entity = normalizeEntity(raw, "proj-123", null);
    expect(entity.normalizedValue).toBe("example.com/path");
  });

  it("assigns correct category from type", () => {
    const raw: RawEntity = {
      type: "email",
      category: "infrastructure", // wrong category
      value: "test@example.com",
      attributes: {},
      source: "test",
    };

    const entity = normalizeEntity(raw, "proj-123", null);
    expect(entity.category).toBe("people"); // auto-corrected from type
  });

  it("defaults confidence to 50", () => {
    const raw: RawEntity = {
      type: "ip",
      category: "infrastructure",
      value: "1.2.3.4",
      attributes: {},
      source: "test",
    };

    const entity = normalizeEntity(raw, "proj-123", null);
    expect(entity.confidence).toBe(50);
  });
});

describe("normalizeEntities", () => {
  it("normalizes multiple entities", () => {
    const raws: RawEntity[] = [
      { type: "subdomain", category: "infrastructure", value: "a.example.com", attributes: {}, source: "test" },
      { type: "ip", category: "infrastructure", value: "1.2.3.4", attributes: {}, source: "test" },
    ];

    const entities = normalizeEntities(raws, "proj-123", "imp-456");
    expect(entities).toHaveLength(2);
    expect(entities[0].id).toBeDefined();
    expect(entities[1].id).toBeDefined();
    expect(entities[0].id).not.toBe(entities[1].id);
  });
});
