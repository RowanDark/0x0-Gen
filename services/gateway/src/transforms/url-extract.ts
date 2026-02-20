import type { Transform, TransformInput, TransformResult } from "./base.js";
import * as reconDb from "../db/recon.js";

export const urlExtractTransform: Transform = {
  id: "url-extract",
  name: "URL Extract",
  description: "Find known URLs associated with a domain from recon data",
  inputTypes: ["domain", "subdomain"],
  outputTypes: ["url"],
  requiresApi: false,

  async execute(entity: TransformInput, projectId: string): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];

    const { entities } = reconDb.listEntities(projectId, { type: "url", limit: 500 });
    for (const url of entities) {
      const urlHost = url.normalizedValue.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
      if (urlHost === entity.value.toLowerCase() || urlHost.endsWith(`.${entity.value.toLowerCase()}`)) {
        nodes.push({
          entityId: url.id,
          type: "url",
          label: url.value,
        });
        edges.push({
          fromNodeId: url.id,
          toNodeId: entity.id,
          type: "found_at",
          label: "found at",
        });
      }
    }

    return { nodes, edges };
  },
};
