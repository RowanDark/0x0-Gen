import type { Transform, TransformInput, TransformResult } from "./base.js";
import * as reconDb from "../db/recon.js";

export const relatedEntitiesTransform: Transform = {
  id: "related-entities",
  name: "Related Entities",
  description: "Find entities related through existing relationships in the recon database",
  inputTypes: [
    "domain", "subdomain", "ip", "asn", "netblock", "url", "endpoint",
    "parameter", "port", "service", "technology", "email", "username",
    "person", "organization", "credential", "vulnerability", "file", "certificate",
  ],
  outputTypes: [
    "domain", "subdomain", "ip", "url", "port", "service", "technology",
    "email", "vulnerability", "certificate",
  ],
  requiresApi: false,

  async execute(entity: TransformInput, projectId: string): Promise<TransformResult> {
    const relationships = reconDb.listRelationships(projectId, entity.id);

    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];
    const seenIds = new Set<string>();

    for (const rel of relationships) {
      const relatedEntityId = rel.fromEntityId === entity.id ? rel.toEntityId : rel.fromEntityId;
      if (seenIds.has(relatedEntityId)) continue;
      seenIds.add(relatedEntityId);

      const relatedEntity = reconDb.getEntity(relatedEntityId);
      if (!relatedEntity) continue;

      nodes.push({
        entityId: relatedEntity.id,
        type: relatedEntity.type,
        label: relatedEntity.value,
      });

      edges.push({
        fromNodeId: rel.fromEntityId,
        toNodeId: rel.toEntityId,
        type: rel.type,
        label: rel.type.replace(/_/g, " "),
      });
    }

    return { nodes, edges };
  },
};
