import type { Transform, TransformInput, TransformResult } from "./base.js";
import { resolve4 } from "node:dns/promises";

export const dnsLookupTransform: Transform = {
  id: "dns-lookup",
  name: "DNS Lookup",
  description: "Resolve domain/subdomain to IP addresses via DNS",
  inputTypes: ["domain", "subdomain"],
  outputTypes: ["ip"],
  requiresApi: true,

  async execute(entity: TransformInput): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];

    try {
      const ips = await resolve4(entity.value);
      for (const ip of ips) {
        nodes.push({
          entityId: null,
          type: "ip",
          label: ip,
        });
        edges.push({
          fromNodeId: entity.id,
          toNodeId: ip,
          type: "resolves_to",
          label: "resolves to",
        });
      }
    } catch {
      // DNS resolution failed, return empty
    }

    return { nodes, edges };
  },
};
