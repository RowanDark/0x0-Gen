import { describe, it, expect } from "vitest";
import { renderRequest } from "./renderer.js";
import type { IntruderPosition } from "./types.js";
import { randomUUID } from "node:crypto";

function makePos(start: number, end: number, name: string): IntruderPosition {
  return { id: randomUUID(), start, end, name };
}

describe("renderRequest", () => {
  it("replaces single position with payload", () => {
    //                    01234567890123456
    const baseRequest = "GET /§test§ HTTP";
    const pos = makePos(5, 11, "pos1");
    const payloads = new Map([["pos1", "hello"]]);

    const result = renderRequest(baseRequest, [pos], payloads);
    expect(result).toBe("GET /hello HTTP");
  });

  it("replaces multiple positions", () => {
    //                    0123456789012345678901234
    const baseRequest = "GET /§p1§?q=§p2§ HTTP/1";
    const pos1 = makePos(5, 9, "a");
    const pos2 = makePos(12, 16, "b");
    const payloads = new Map([
      ["a", "path"],
      ["b", "value"],
    ]);

    const result = renderRequest(baseRequest, [pos1, pos2], payloads);
    expect(result).toBe("GET /path?q=value HTTP/1");
  });

  it("handles empty payload", () => {
    const baseRequest = "GET /§test§ HTTP";
    const pos = makePos(5, 11, "pos1");
    const payloads = new Map([["pos1", ""]]);

    const result = renderRequest(baseRequest, [pos], payloads);
    expect(result).toBe("GET / HTTP");
  });

  it("returns original request when no positions", () => {
    const baseRequest = "GET /path HTTP/1.1";
    const result = renderRequest(baseRequest, [], new Map());
    expect(result).toBe(baseRequest);
  });

  it("uses empty string for missing payload", () => {
    const baseRequest = "GET /§test§ HTTP";
    const pos = makePos(5, 11, "pos1");
    const payloads = new Map<string, string>();

    const result = renderRequest(baseRequest, [pos], payloads);
    expect(result).toBe("GET / HTTP");
  });

  it("throws on overlapping positions", () => {
    const baseRequest = "GET /test HTTP/1.1";
    const pos1 = makePos(5, 10, "a");
    const pos2 = makePos(8, 15, "b");
    const payloads = new Map([
      ["a", "x"],
      ["b", "y"],
    ]);

    expect(() => renderRequest(baseRequest, [pos1, pos2], payloads)).toThrow(
      /Overlapping positions/,
    );
  });

  it("handles positions given in unsorted order", () => {
    const baseRequest = "GET /§p1§?q=§p2§ HTTP";
    const pos1 = makePos(5, 9, "a");
    const pos2 = makePos(12, 16, "b");
    const payloads = new Map([
      ["a", "xx"],
      ["b", "yy"],
    ]);

    // Pass in reverse order - should still work
    const result = renderRequest(baseRequest, [pos2, pos1], payloads);
    expect(result).toBe("GET /xx?q=yy HTTP");
  });
});
