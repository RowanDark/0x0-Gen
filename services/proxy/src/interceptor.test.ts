import { describe, it, expect } from "vitest";
import { captureRequest, captureResponse, buildExchange } from "./interceptor.js";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";

function createMockRequest(overrides: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}): IncomingMessage {
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  req.method = overrides.method ?? "GET";
  req.url = overrides.url ?? "http://example.com/test";
  if (overrides.headers) {
    for (const [key, value] of Object.entries(overrides.headers)) {
      req.headers[key] = value;
    }
  }
  if (!req.headers.host) {
    req.headers.host = "example.com";
  }
  return req;
}

function createMockResponse(overrides: {
  statusCode?: number;
  statusMessage?: string;
  headers?: Record<string, string>;
}): IncomingMessage {
  const socket = new Socket();
  const res = new IncomingMessage(socket);
  res.statusCode = overrides.statusCode ?? 200;
  res.statusMessage = overrides.statusMessage ?? "OK";
  if (overrides.headers) {
    for (const [key, value] of Object.entries(overrides.headers)) {
      res.headers[key] = value;
    }
  }
  return res;
}

describe("interceptor", () => {
  describe("captureRequest", () => {
    it("captures a GET request with no body", () => {
      const req = createMockRequest({
        method: "GET",
        url: "http://example.com/api/data",
        headers: { host: "example.com", "user-agent": "test" },
      });

      const result = captureRequest(req, Buffer.alloc(0));

      expect(result.id).toBeDefined();
      expect(result.method).toBe("GET");
      expect(result.url).toBe("http://example.com/api/data");
      expect(result.host).toBe("example.com");
      expect(result.path).toBe("/api/data");
      expect(result.body).toBeNull();
      expect(result.contentLength).toBe(0);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it("captures a POST request with JSON body", () => {
      const req = createMockRequest({
        method: "POST",
        url: "http://example.com/api/data",
        headers: { host: "example.com", "content-type": "application/json" },
      });

      const body = Buffer.from('{"key":"value"}');
      const result = captureRequest(req, body);

      expect(result.method).toBe("POST");
      expect(result.body).toBe('{"key":"value"}');
      expect(result.contentLength).toBe(15);
    });

    it("captures binary body as base64", () => {
      const req = createMockRequest({
        method: "POST",
        url: "http://example.com/upload",
        headers: { host: "example.com", "content-type": "image/png" },
      });

      const body = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const result = captureRequest(req, body);

      expect(result.body).toBe(body.toString("base64"));
    });

    it("assigns projectId when provided", () => {
      const req = createMockRequest({
        method: "GET",
        url: "http://example.com/",
        headers: { host: "example.com" },
      });

      const projectId = "00000000-0000-0000-0000-000000000001";
      const result = captureRequest(req, Buffer.alloc(0), projectId);

      expect(result.projectId).toBe(projectId);
    });
  });

  describe("captureResponse", () => {
    it("captures a 200 response", () => {
      const res = createMockResponse({
        statusCode: 200,
        statusMessage: "OK",
        headers: { "content-type": "text/plain" },
      });

      const body = Buffer.from("Hello");
      const requestId = "00000000-0000-0000-0000-000000000001";
      const result = captureResponse(res, body, requestId, Date.now() - 50);

      expect(result.id).toBeDefined();
      expect(result.requestId).toBe(requestId);
      expect(result.statusCode).toBe(200);
      expect(result.statusMessage).toBe("OK");
      expect(result.body).toBe("Hello");
      expect(result.contentLength).toBe(5);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("captures response with no body", () => {
      const res = createMockResponse({ statusCode: 204, statusMessage: "No Content" });
      const result = captureResponse(
        res,
        Buffer.alloc(0),
        "00000000-0000-0000-0000-000000000001",
        Date.now(),
      );

      expect(result.statusCode).toBe(204);
      expect(result.body).toBeNull();
      expect(result.contentLength).toBe(0);
    });
  });

  describe("buildExchange", () => {
    it("builds an exchange from request and response", () => {
      const req = captureRequest(
        createMockRequest({
          method: "GET",
          url: "http://example.com/",
          headers: { host: "example.com" },
        }),
        Buffer.alloc(0),
      );

      const res = captureResponse(
        createMockResponse({ statusCode: 200 }),
        Buffer.from("OK"),
        req.id,
        req.timestamp,
      );

      const exchange = buildExchange(req, res);

      expect(exchange.id).toBeDefined();
      expect(exchange.request).toBe(req);
      expect(exchange.response).toBe(res);
      expect(exchange.tags).toEqual([]);
    });

    it("builds an exchange with null response", () => {
      const req = captureRequest(
        createMockRequest({
          method: "GET",
          url: "http://example.com/",
          headers: { host: "example.com" },
        }),
        Buffer.alloc(0),
      );

      const exchange = buildExchange(req, null);

      expect(exchange.response).toBeNull();
    });
  });
});
