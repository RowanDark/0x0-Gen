import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../app.js";

describe("Gateway /services", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns stub service list", async () => {
    app = await buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/services",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.services).toHaveLength(4);
    expect(body.services.map((s: { name: string }) => s.name)).toEqual([
      "proxy",
      "replay",
      "decoder",
      "intruder",
    ]);
    for (const service of body.services) {
      expect(service.status).toBe("stub");
    }
  });
});
