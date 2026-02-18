import { describe, it, expect } from "vitest";
import { parsePositions, stripMarkers, getPositionValue } from "./positions.js";

describe("parsePositions", () => {
  it("finds a single position marker", () => {
    const request = "GET /path?q=\u00A7test\u00A7 HTTP/1.1";
    const positions = parsePositions(request);
    expect(positions).toHaveLength(1);
    expect(positions[0].name).toBe("pos1");
    expect(request.slice(positions[0].start, positions[0].end)).toBe("\u00A7test\u00A7");
  });

  it("finds multiple position markers", () => {
    const request = "GET /\u00A7path\u00A7?q=\u00A7value\u00A7 HTTP/1.1";
    const positions = parsePositions(request);
    expect(positions).toHaveLength(2);
    expect(positions[0].name).toBe("pos1");
    expect(positions[1].name).toBe("pos2");
  });

  it("returns empty array when no markers present", () => {
    const request = "GET /path HTTP/1.1";
    const positions = parsePositions(request);
    expect(positions).toHaveLength(0);
  });

  it("handles escaped markers", () => {
    const request = "GET /path?q=\\\u00A7literal\\\u00A7 HTTP/1.1";
    const positions = parsePositions(request);
    expect(positions).toHaveLength(0);
  });

  it("handles empty content between markers", () => {
    const request = "GET /path?q=\u00A7\u00A7 HTTP/1.1";
    const positions = parsePositions(request);
    expect(positions).toHaveLength(1);
  });

  it("handles adjacent position markers", () => {
    const request = "\u00A7first\u00A7\u00A7second\u00A7";
    const positions = parsePositions(request);
    expect(positions).toHaveLength(2);
    expect(positions[0].name).toBe("pos1");
    expect(positions[1].name).toBe("pos2");
  });
});

describe("stripMarkers", () => {
  it("removes marker characters from request", () => {
    const request = "GET /\u00A7path\u00A7?q=\u00A7value\u00A7 HTTP/1.1";
    const stripped = stripMarkers(request);
    expect(stripped).toBe("GET /path?q=value HTTP/1.1");
  });

  it("converts escaped markers to literal characters", () => {
    const request = "GET /path?q=\\\u00A7literal\\\u00A7 HTTP/1.1";
    const stripped = stripMarkers(request);
    expect(stripped).toBe("GET /path?q=\u00A7literal\u00A7 HTTP/1.1");
  });

  it("returns unchanged text when no markers", () => {
    const request = "GET /path HTTP/1.1";
    expect(stripMarkers(request)).toBe(request);
  });
});

describe("getPositionValue", () => {
  it("extracts the text between markers", () => {
    const request = "GET /path?q=\u00A7test\u00A7 HTTP/1.1";
    const positions = parsePositions(request);
    expect(getPositionValue(request, positions[0])).toBe("test");
  });

  it("handles empty position content", () => {
    const request = "GET /path?q=\u00A7\u00A7 HTTP/1.1";
    const positions = parsePositions(request);
    expect(getPositionValue(request, positions[0])).toBe("");
  });
});
