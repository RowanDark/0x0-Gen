import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { sendRequest } from "./sender.js";

let server: http.Server;
let port: number;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer((req, res) => {
      const url = req.url ?? "/";

      if (url === "/timeout") {
        // Never respond — triggers timeout
        return;
      }

      if (url === "/error") {
        req.socket.destroy();
        return;
      }

      if (url === "/redirect") {
        res.writeHead(302, { location: `http://127.0.0.1:${port}/ok` });
        res.end();
        return;
      }

      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const responseBody = JSON.stringify({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body || null,
        });

        res.writeHead(200, {
          "content-type": "application/json",
          "x-test": "true",
        });
        res.end(responseBody);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      port = typeof addr === "object" && addr ? addr.port : 0;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("sendRequest", () => {
  it("sends a GET request successfully", async () => {
    const entry = await sendRequest({
      method: "GET",
      url: `http://127.0.0.1:${port}/ok`,
      headers: {},
      body: null,
    });

    expect(entry.error).toBeNull();
    expect(entry.response).not.toBeNull();
    expect(entry.response!.statusCode).toBe(200);
    expect(entry.duration).toBeGreaterThan(0);
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it("sends a POST request with body", async () => {
    const entry = await sendRequest({
      method: "POST",
      url: `http://127.0.0.1:${port}/submit`,
      headers: { "content-type": "application/json" },
      body: '{"hello":"world"}',
    });

    expect(entry.error).toBeNull();
    expect(entry.response!.statusCode).toBe(200);
    const parsed = JSON.parse(entry.response!.body!) as {
      method: string;
      body: string;
    };
    expect(parsed.method).toBe("POST");
    expect(parsed.body).toBe('{"hello":"world"}');
  });

  it("captures response headers", async () => {
    const entry = await sendRequest({
      method: "GET",
      url: `http://127.0.0.1:${port}/ok`,
      headers: {},
      body: null,
    });

    expect(entry.response!.headers["x-test"]).toBe("true");
    expect(entry.response!.headers["content-type"]).toContain("application/json");
  });

  it("handles timeout gracefully", async () => {
    const entry = await sendRequest(
      {
        method: "GET",
        url: `http://127.0.0.1:${port}/timeout`,
        headers: {},
        body: null,
      },
      { timeout: 200 },
    );

    expect(entry.error).not.toBeNull();
    expect(entry.response).toBeNull();
  }, 5000);

  it("handles connection refused gracefully", async () => {
    const entry = await sendRequest({
      method: "GET",
      url: "http://127.0.0.1:1",
      headers: {},
      body: null,
    });

    expect(entry.error).not.toBeNull();
    expect(entry.response).toBeNull();
  });

  it("follows redirects when enabled", async () => {
    const entry = await sendRequest(
      {
        method: "GET",
        url: `http://127.0.0.1:${port}/redirect`,
        headers: {},
        body: null,
      },
      { followRedirects: true },
    );

    expect(entry.error).toBeNull();
    expect(entry.response!.statusCode).toBe(200);
  });

  it("does not follow redirects by default", async () => {
    const entry = await sendRequest({
      method: "GET",
      url: `http://127.0.0.1:${port}/redirect`,
      headers: {},
      body: null,
    });

    expect(entry.response!.statusCode).toBe(302);
  });

  it("records duration", async () => {
    const entry = await sendRequest({
      method: "GET",
      url: `http://127.0.0.1:${port}/ok`,
      headers: {},
      body: null,
    });

    expect(typeof entry.duration).toBe("number");
    expect(entry.duration).toBeGreaterThanOrEqual(0);
  });
});
