import { describe, it, expect } from "vitest";
import { parseRawRequest, serializeRequest } from "./parser.js";

describe("parseRawRequest", () => {
  it("parses a simple GET request", () => {
    const raw = "GET /api/users HTTP/1.1\r\nHost: example.com\r\n\r\n";
    const req = parseRawRequest(raw);
    expect(req.method).toBe("GET");
    expect(req.url).toBe("http://example.com/api/users");
    expect(req.headers["host"]).toBe("example.com");
    expect(req.body).toBeNull();
  });

  it("parses a POST request with body", () => {
    const raw =
      'POST /login HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: application/json\r\n\r\n{"user":"test"}';
    const req = parseRawRequest(raw);
    expect(req.method).toBe("POST");
    expect(req.url).toBe("http://api.example.com/login");
    expect(req.headers["content-type"]).toBe("application/json");
    expect(req.body).toBe('{"user":"test"}');
  });

  it("handles LF-only line endings", () => {
    const raw = "GET /path HTTP/1.1\nHost: host.com\n\n";
    const req = parseRawRequest(raw);
    expect(req.method).toBe("GET");
    expect(req.url).toBe("http://host.com/path");
  });

  it("uses https for port 443", () => {
    const raw = "GET / HTTP/1.1\r\nHost: secure.com:443\r\n\r\n";
    const req = parseRawRequest(raw);
    expect(req.url.startsWith("https://")).toBe(true);
  });

  it("uses full URL as-is when path is absolute", () => {
    const raw = "GET https://api.example.com/data HTTP/1.1\r\n\r\n";
    const req = parseRawRequest(raw);
    expect(req.url).toBe("https://api.example.com/data");
  });

  it("throws on invalid method", () => {
    const raw = "INVALID /path HTTP/1.1\r\n\r\n";
    expect(() => parseRawRequest(raw)).toThrow("Invalid HTTP method");
  });

  it("throws on missing request line", () => {
    expect(() => parseRawRequest("")).toThrow("Invalid raw HTTP");
  });

  it("parses query string correctly", () => {
    const raw = "GET /search?q=hello&page=1 HTTP/1.1\r\nHost: api.com\r\n\r\n";
    const req = parseRawRequest(raw);
    expect(req.url).toBe("http://api.com/search?q=hello&page=1");
  });
});

describe("serializeRequest", () => {
  it("serializes a GET request to raw HTTP", () => {
    const req = {
      method: "GET" as const,
      url: "http://example.com/api",
      headers: { host: "example.com" },
      body: null,
    };
    const raw = serializeRequest(req);
    expect(raw).toContain("GET /api HTTP/1.1");
    expect(raw).toContain("host: example.com");
  });

  it("serializes a POST request with body", () => {
    const req = {
      method: "POST" as const,
      url: "http://example.com/submit",
      headers: { "content-type": "application/json" },
      body: '{"key":"value"}',
    };
    const raw = serializeRequest(req);
    expect(raw).toContain("POST /submit HTTP/1.1");
    expect(raw).toContain("content-type: application/json");
    expect(raw).toContain('{"key":"value"}');
  });

  it("adds host header from URL if missing", () => {
    const req = {
      method: "GET" as const,
      url: "http://myhost.com/path",
      headers: {},
      body: null,
    };
    const raw = serializeRequest(req);
    expect(raw).toContain("host: myhost.com");
  });

  it("round-trips: serialize then parse gives same request", () => {
    const original = {
      method: "PUT" as const,
      url: "http://api.test.com/resource/123",
      headers: { "content-type": "application/json", authorization: "Bearer token" },
      body: '{"name":"updated"}',
    };
    const raw = serializeRequest(original);
    const parsed = parseRawRequest(raw);
    expect(parsed.method).toBe(original.method);
    expect(parsed.url).toBe(original.url);
    expect(parsed.headers["content-type"]).toBe(original.headers["content-type"]);
    expect(parsed.body).toBe(original.body);
  });
});
