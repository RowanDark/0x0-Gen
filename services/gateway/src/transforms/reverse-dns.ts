import type { Transform, TransformInput, TransformResult } from "./base.js";
import { reverse } from "node:dns/promises";

export const reverseDnsTransform: Transform = {
  id: "reverse-dns",
  name: "Reverse DNS",
  description: "Resolve IP address to domain names via reverse DNS",
  inputTypes: ["ip"],
  outputTypes: ["domain"],
  requiresApi: true,

  async execute(entity: TransformInput): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];

    try {
      const hostnames = await reverse(entity.value);
      for (const hostname of hostnames) {
        nodes.push({
          entityId: null,
          type: "domain",
          label: hostname,
        });
        edges.push({
          fromNodeId: entity.id,
          toNodeId: hostname,
          type: "resolves_to",
          label: "resolves to",
        });
      }
    } catch {
      // Reverse DNS failed
    }

    return { nodes, edges };
  },
};
