import { describe, it, expect } from "vitest";
import { createIterator, calculateTotalRequests } from "./payloads.js";
import type { IntruderConfig, IntruderPayloadSet, IntruderPosition } from "./types.js";
import { randomUUID } from "node:crypto";

function makePosition(name: string): IntruderPosition {
  return { id: randomUUID(), start: 0, end: 10, name };
}

function makePayloadSet(payloads: string[], name = "set"): IntruderPayloadSet {
  return { id: randomUUID(), name, payloads, source: "manual" };
}

function makeConfig(
  attackType: IntruderConfig["attackType"],
  positions: IntruderPosition[],
  payloadSets: IntruderPayloadSet[],
): IntruderConfig {
  return {
    id: randomUUID(),
    name: "test",
    baseRequest: "GET /test HTTP/1.1",
    positions,
    payloadSets,
    attackType,
    options: {
      concurrency: 1,
      delayMs: 0,
      followRedirects: false,
      timeout: 30000,
      stopOnError: false,
    },
  };
}

describe("sniper attack type", () => {
  it("iterates each position with all payloads", () => {
    const pos1 = makePosition("pos1");
    const pos2 = makePosition("pos2");
    const payloads = makePayloadSet(["a", "b"]);
    const config = makeConfig("sniper", [pos1, pos2], [payloads]);

    const results = [...createIterator(config)];
    expect(results).toHaveLength(4); // 2 positions * 2 payloads
    // pos1 with a, pos1 with b, pos2 with a, pos2 with b
    expect(results[0].payloads["pos1"]).toBe("a");
    expect(results[0].payloads["pos2"]).toBe("");
    expect(results[1].payloads["pos1"]).toBe("b");
    expect(results[1].payloads["pos2"]).toBe("");
    expect(results[2].payloads["pos1"]).toBe("");
    expect(results[2].payloads["pos2"]).toBe("a");
    expect(results[3].payloads["pos1"]).toBe("");
    expect(results[3].payloads["pos2"]).toBe("b");
  });

  it("returns correct total requests", () => {
    const config = makeConfig(
      "sniper",
      [makePosition("p1"), makePosition("p2")],
      [makePayloadSet(["a", "b", "c"])],
    );
    expect(calculateTotalRequests(config)).toBe(6);
  });
});

describe("battering_ram attack type", () => {
  it("applies same payload to all positions", () => {
    const config = makeConfig(
      "battering_ram",
      [makePosition("pos1"), makePosition("pos2")],
      [makePayloadSet(["x", "y"])],
    );

    const results = [...createIterator(config)];
    expect(results).toHaveLength(2);
    expect(results[0].payloads["pos1"]).toBe("x");
    expect(results[0].payloads["pos2"]).toBe("x");
    expect(results[1].payloads["pos1"]).toBe("y");
    expect(results[1].payloads["pos2"]).toBe("y");
  });

  it("returns correct total requests", () => {
    const config = makeConfig(
      "battering_ram",
      [makePosition("p1"), makePosition("p2")],
      [makePayloadSet(["a", "b", "c"])],
    );
    expect(calculateTotalRequests(config)).toBe(3);
  });
});

describe("pitchfork attack type", () => {
  it("zips parallel payload lists", () => {
    const config = makeConfig(
      "pitchfork",
      [makePosition("pos1"), makePosition("pos2")],
      [makePayloadSet(["a", "b"]), makePayloadSet(["1", "2"])],
    );

    const results = [...createIterator(config)];
    expect(results).toHaveLength(2);
    expect(results[0].payloads["pos1"]).toBe("a");
    expect(results[0].payloads["pos2"]).toBe("1");
    expect(results[1].payloads["pos1"]).toBe("b");
    expect(results[1].payloads["pos2"]).toBe("2");
  });

  it("stops at shortest payload list", () => {
    const config = makeConfig(
      "pitchfork",
      [makePosition("p1"), makePosition("p2")],
      [makePayloadSet(["a", "b", "c"]), makePayloadSet(["1", "2"])],
    );
    expect(calculateTotalRequests(config)).toBe(2);
    const results = [...createIterator(config)];
    expect(results).toHaveLength(2);
  });
});

describe("cluster_bomb attack type", () => {
  it("generates cartesian product of all payload sets", () => {
    const config = makeConfig(
      "cluster_bomb",
      [makePosition("pos1"), makePosition("pos2")],
      [makePayloadSet(["a", "b"]), makePayloadSet(["1", "2"])],
    );

    const results = [...createIterator(config)];
    expect(results).toHaveLength(4); // 2 * 2
    const combos = results.map((r) => `${r.payloads["pos1"]}-${r.payloads["pos2"]}`);
    expect(combos).toContain("a-1");
    expect(combos).toContain("a-2");
    expect(combos).toContain("b-1");
    expect(combos).toContain("b-2");
  });

  it("returns correct total for larger sets", () => {
    const config = makeConfig(
      "cluster_bomb",
      [makePosition("p1"), makePosition("p2"), makePosition("p3")],
      [
        makePayloadSet(["a", "b"]),
        makePayloadSet(["1", "2", "3"]),
        makePayloadSet(["x", "y"]),
      ],
    );
    expect(calculateTotalRequests(config)).toBe(12); // 2 * 3 * 2
  });
});

describe("edge cases", () => {
  it("returns empty for no positions", () => {
    const config = makeConfig("sniper", [], [makePayloadSet(["a"])]);
    expect([...createIterator(config)]).toHaveLength(0);
    expect(calculateTotalRequests(config)).toBe(0);
  });

  it("returns empty for no payload sets", () => {
    const config = makeConfig("sniper", [makePosition("p1")], []);
    expect([...createIterator(config)]).toHaveLength(0);
    expect(calculateTotalRequests(config)).toBe(0);
  });

  it("indexes are sequential", () => {
    const config = makeConfig(
      "battering_ram",
      [makePosition("p1")],
      [makePayloadSet(["a", "b", "c"])],
    );
    const results = [...createIterator(config)];
    expect(results.map((r) => r.index)).toEqual([0, 1, 2]);
  });
});
