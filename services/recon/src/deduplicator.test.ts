import { describe, it, expect } from "vitest";
import { deduplicate } from "./deduplicator.js";
import type { ReconEntity } from "@0x0-gen/contracts";
import { randomUUID } from "node:crypto";

function makeEntity(overrides: Partial<ReconEntity> = {}): ReconEntity {
  return {
    id: randomUUID(),
    projectId: "proj-1",
    importId: null,
    category: "infrastructure",
    type: "subdomain",
    value: "test.example.com",
    normalizedValue: "test.example.com",
    attributes: {},
    confidence: 70,
    sources: ["amass"],
    firstSeen: 1000,
    lastSeen: 1000,
    tags: [],
    ...overrides,
  };
}

describe("deduplicate", () => {
  it("marks new entities as new", () => {
    const newEntities = [makeEntity({ value: "a.example.com", normalizedValue: "a.example.com" })];
    const result = deduplicate(newEntities, []);
    expect(result.new).toHaveLength(1);
    expect(result.updated).toHaveLength(0);
    expect(result.duplicates).toBe(0);
  });

  it("merges duplicate entities", () => {
    const existing = [
      makeEntity({
        value: "a.example.com",
        normalizedValue: "a.example.com",
        sources: ["amass"],
        lastSeen: 1000,
        confidence: 70,
      }),
    ];

    const newEntities = [
      makeEntity({
        value: "a.example.com",
        normalizedValue: "a.example.com",
        sources: ["subfinder"],
        lastSeen: 2000,
        confidence: 80,
      }),
    ];

    const result = deduplicate(newEntities, existing);
    expect(result.new).toHaveLength(0);
    expect(result.updated).toHaveLength(1);
    expect(result.duplicates).toBe(1);
    expect(result.updated[0].sources).toEqual(["amass", "subfinder"]);
    expect(result.updated[0].lastSeen).toBe(2000);
    expect(result.updated[0].confidence).toBe(80);
  });

  it("handles batch dedup (within same import)", () => {
    const newEntities = [
      makeEntity({ value: "x.example.com", normalizedValue: "x.example.com", sources: ["tool1"] }),
      makeEntity({ value: "x.example.com", normalizedValue: "x.example.com", sources: ["tool2"] }),
    ];

    const result = deduplicate(newEntities, []);
    // First is new, second is duplicate of first
    expect(result.new).toHaveLength(1);
    expect(result.duplicates).toBe(1);
  });

  it("preserves existing entity id on merge", () => {
    const existingId = randomUUID();
    const existing = [
      makeEntity({ id: existingId, normalizedValue: "dup.example.com" }),
    ];

    const newEntities = [makeEntity({ normalizedValue: "dup.example.com" })];

    const result = deduplicate(newEntities, existing);
    expect(result.updated[0].id).toBe(existingId);
  });
});
