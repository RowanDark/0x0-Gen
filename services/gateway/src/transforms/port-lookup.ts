import type { Transform, TransformInput, TransformResult } from "./base.js";
import * as reconDb from "../db/recon.js";

export const portLookupTransform: Transform = {
  id: "port-lookup",
  name: "Port Lookup",
  description: "Find open ports associated with an IP from recon data",
  inputTypes: ["ip"],
  outputTypes: ["port", "service"],
  requiresApi: false,

  async execute(entity: TransformInput, projectId: string): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];

    // Find ports associated with this IP
    const { entities: ports } = reconDb.listEntities(projectId, { type: "port", limit: 500 });
    for (const port of ports) {
      const portIp = port.value.split(":")[0];
      if (portIp === entity.value) {
        nodes.push({
          entityId: port.id,
          type: "port",
          label: port.value,
        });
        edges.push({
          fromNodeId: port.id,
          toNodeId: entity.id,
          type: "runs_on",
          label: "runs on",
        });
      }
    }

    // Find services associated with this IP
    const { entities: services } = reconDb.listEntities(projectId, { type: "service", limit: 500 });
    for (const svc of services) {
      const svcHost = (svc.attributes?.host || "") as string;
      if (svcHost === entity.value) {
        nodes.push({
          entityId: svc.id,
          type: "service",
          label: svc.value,
        });
        edges.push({
          fromNodeId: svc.id,
          toNodeId: entity.id,
          type: "runs_on",
          label: "runs on",
        });
      }
    }

    return { nodes, edges };
  },
};
