import { describe, it, expect } from "vitest";
import { executePipeline } from "./pipeline.js";

describe("executePipeline", () => {
  it("executes a single step", () => {
    const result = executePipeline("Hello", [
      { type: "base64", direction: "encode" },
    ]);
    expect(result.success).toBe(true);
    expect(result.output).toBe("SGVsbG8=");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("chains multiple steps", () => {
    const result = executePipeline("a=1&b=2", [
      { type: "url", direction: "encode" },
      { type: "base64", direction: "encode" },
    ]);
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(2);
    // First step URL encodes
    expect(result.steps[0].output).toBe("a%3D1%26b%3D2");
    // Second step base64 encodes the URL-encoded string
    expect(result.output).toBe(
      Buffer.from("a%3D1%26b%3D2").toString("base64"),
    );
  });

  it("stops on first error", () => {
    const result = executePipeline("Hello", [
      { type: "base64", direction: "encode" },
      { type: "md5", direction: "decode" }, // MD5 doesn't support decode
      { type: "url", direction: "encode" }, // Should never run
    ]);
    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].success).toBe(true);
    expect(result.steps[1].success).toBe(false);
    expect(result.error).toContain("does not support direction");
    // Output should be the last successful output
    expect(result.output).toBe("SGVsbG8=");
  });

  it("handles transform execution errors", () => {
    const result = executePipeline("not-valid-hex-odd", [
      { type: "hex", direction: "decode" },
    ]);
    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].success).toBe(false);
    expect(result.steps[0].error).toBeTruthy();
  });

  it("returns input as output for empty steps", () => {
    const result = executePipeline("Hello", []);
    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello");
    expect(result.steps).toHaveLength(0);
  });

  it("passes options through to transforms", () => {
    const result = executePipeline("Hi", [
      { type: "hex", direction: "encode", options: { uppercase: true, separator: ":" } },
    ]);
    expect(result.success).toBe(true);
    expect(result.output).toBe("48:69");
  });

  it("tracks input/output for each step", () => {
    const result = executePipeline("Hello", [
      { type: "base64", direction: "encode" },
      { type: "url", direction: "encode" },
    ]);
    expect(result.steps[0].input).toBe("Hello");
    expect(result.steps[0].output).toBe("SGVsbG8=");
    expect(result.steps[1].input).toBe("SGVsbG8=");
    expect(result.steps[1].output).toBe("SGVsbG8%3D");
  });
});
