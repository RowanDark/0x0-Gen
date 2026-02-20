import type { Transform, TransformInput, TransformResult } from "./base.js";
import * as reconDb from "../db/recon.js";

export const subdomainEnumTransform: Transform = {
  id: "subdomain-enum",
  name: "Subdomain Enumeration",
  description: "Find subdomains from recon data, or query crt.sh for certificate transparency logs",
  inputTypes: ["domain"],
  outputTypes: ["subdomain"],
  requiresApi: true,

  async execute(entity: TransformInput, projectId: string): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];
    const seen = new Set<string>();

    // First check existing recon data
    const { entities } = reconDb.listEntities(projectId, { type: "subdomain", limit: 500 });
    for (const sub of entities) {
      if (sub.normalizedValue.endsWith(`.${entity.value.toLowerCase()}`)) {
        if (seen.has(sub.normalizedValue)) continue;
        seen.add(sub.normalizedValue);

        nodes.push({
          entityId: sub.id,
          type: "subdomain",
          label: sub.value,
        });
        edges.push({
          fromNodeId: sub.id,
          toNodeId: entity.id,
          type: "belongs_to",
          label: "belongs to",
        });
      }
    }

    // Try crt.sh for additional subdomains
    try {
      const response = await fetch(
        `https://crt.sh/?q=%25.${encodeURIComponent(entity.value)}&output=json`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (response.ok) {
        const data = (await response.json()) as Array<{ name_value: string }>;
        const unique = new Set<string>();
        for (const entry of data) {
          const names = entry.name_value.split("\n");
          for (const name of names) {
            const clean = name.trim().toLowerCase().replace(/^\*\./, "");
            if (clean && clean !== entity.value.toLowerCase() && clean.endsWith(`.${entity.value.toLowerCase()}`)) {
              unique.add(clean);
            }
          }
        }

        for (const subdomain of unique) {
          if (seen.has(subdomain)) continue;
          seen.add(subdomain);

          nodes.push({
            entityId: null,
            type: "subdomain",
            label: subdomain,
          });
          edges.push({
            fromNodeId: subdomain,
            toNodeId: entity.id,
            type: "belongs_to",
            label: "belongs to",
          });
        }
      }
    } catch {
      // crt.sh query failed, use only local data
    }

    return { nodes, edges };
  },
};
