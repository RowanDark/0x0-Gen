import { describe, it, expect, vi } from "vitest";
import { whoisTransform } from "./whois.js";

// Mock the whois module
vi.mock("whois", () => ({
  lookup: vi.fn((domain: string, callback: (err: Error | null, data: string | null) => void) => {
    const mockResponse = `
Domain Name: EXAMPLE.COM
Registrar: Example Registrar, Inc.
Registrant Name: John Doe
Registrant Organization: Example Corp
Registrant Email: admin@example.com
Creation Date: 1995-08-14T04:00:00Z
Expiration Date: 2025-08-13T04:00:00Z
Name Server: NS1.EXAMPLE.COM
Name Server: NS2.EXAMPLE.COM
`;
    callback(null, mockResponse);
  }),
}));

describe("whoisTransform", () => {
  it("has correct metadata", () => {
    expect(whoisTransform.id).toBe("whois");
    expect(whoisTransform.inputTypes).toContain("domain");
    expect(whoisTransform.inputTypes).toContain("ip");
    expect(whoisTransform.requiresApi).toBe(true);
  });

  it("extracts organization from WHOIS response", async () => {
    const result = await whoisTransform.execute(
      { id: "entity-1", value: "example.com", type: "domain" },
      "project-1",
    );

    const orgNode = result.nodes.find((n) => n.type === "organization" && n.label === "Example Corp");
    expect(orgNode).toBeDefined();
  });

  it("extracts email from WHOIS response", async () => {
    const result = await whoisTransform.execute(
      { id: "entity-1", value: "example.com", type: "domain" },
      "project-1",
    );

    const emailNode = result.nodes.find((n) => n.type === "email");
    expect(emailNode?.label).toBe("admin@example.com");
  });

  it("extracts registrant name from WHOIS response", async () => {
    const result = await whoisTransform.execute(
      { id: "entity-1", value: "example.com", type: "domain" },
      "project-1",
    );

    const personNode = result.nodes.find((n) => n.type === "person");
    expect(personNode?.label).toBe("John Doe");
  });

  it("creates edges linking entities to source", async () => {
    const result = await whoisTransform.execute(
      { id: "entity-1", value: "example.com", type: "domain" },
      "project-1",
    );

    expect(result.edges.length).toBeGreaterThan(0);
    const ownsEdge = result.edges.find((e) => e.type === "owns");
    expect(ownsEdge).toBeDefined();
  });

  it("handles WHOIS lookup failure gracefully", async () => {
    // Override mock to simulate failure
    const whois = await import("whois");
    vi.mocked(whois.lookup).mockImplementationOnce(((domain: string, callback: (err: Error | null, data: string | null) => void) => {
      callback(new Error("WHOIS lookup failed"), null);
    }) as typeof whois.lookup);

    const result = await whoisTransform.execute(
      { id: "entity-1", value: "invalid-domain", type: "domain" },
      "project-1",
    );

    // Should return empty results, not throw
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
