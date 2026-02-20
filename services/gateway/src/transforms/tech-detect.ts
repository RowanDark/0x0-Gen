import type { Transform, TransformInput, TransformResult } from "./base.js";
import * as reconDb from "../db/recon.js";

export const techDetectTransform: Transform = {
  id: "tech-detect",
  name: "Technology Detection",
  description: "Find technologies detected on a URL from recon data",
  inputTypes: ["url", "domain", "subdomain"],
  outputTypes: ["technology"],
  requiresApi: false,

  async execute(entity: TransformInput, projectId: string): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];

    const { entities } = reconDb.listEntities(projectId, { type: "technology", limit: 500 });
    for (const tech of entities) {
      const detectedAt = (tech.attributes?.detectedAt || "") as string;
      if (!detectedAt) continue;

      const normalizedDetectedAt = detectedAt.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();

      let matches = false;
      if (entity.type === "url") {
        matches = normalizedDetectedAt === entity.value.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
      } else {
        // domain or subdomain - check if the tech's URL is on this domain
        const host = normalizedDetectedAt.split("/")[0].split(":")[0];
        matches = host === entity.value.toLowerCase() || host.endsWith(`.${entity.value.toLowerCase()}`);
      }

      if (matches) {
        nodes.push({
          entityId: tech.id,
          type: "technology",
          label: tech.value,
        });
        edges.push({
          fromNodeId: tech.id,
          toNodeId: entity.id,
          type: "runs_on",
          label: "runs on",
        });
      }
    }

    return { nodes, edges };
  },
};
