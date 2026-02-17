import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../app.js";

describe("Gateway /healthz", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns status ok", async () => {
    app = await buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/healthz",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });
});
