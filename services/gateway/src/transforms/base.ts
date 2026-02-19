import type { EntityType, MapperNode, MapperEdge } from "@0x0-gen/contracts";

export interface TransformInput {
  id: string;
  type: EntityType;
  value: string;
  projectId: string;
  [key: string]: unknown;
}

export interface TransformResult {
  nodes: Array<{
    entityId: string | null;
    type: EntityType;
    label: string;
  }>;
  edges: Array<{
    fromNodeId: string;
    toNodeId: string;
    type: string;
    label?: string;
  }>;
}

export interface Transform {
  id: string;
  name: string;
  description: string;
  inputTypes: EntityType[];
  outputTypes: EntityType[];
  requiresApi: boolean;
  execute(entity: TransformInput, projectId: string): Promise<TransformResult>;
}
