import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { buildApp } from "../app.js";
import WebSocket from "ws";

describe("Gateway WebSocket", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let address: string;

  beforeAll(async () => {
    app = await buildApp();
    address = await app.listen({ port: 0 });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("accepts WebSocket connections", async () => {
    const wsUrl = address.replace("http", "ws") + "/ws";

    const connected = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timed out"));
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    expect(connected).toBe(true);
  });
});
