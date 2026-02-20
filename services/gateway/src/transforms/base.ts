export interface TransformInput {
  id: string;
  value: string;
  type: string;
}

export interface TransformNode {
  entityId: string | null;
  type: string;
  label: string;
}

export interface TransformEdge {
  fromNodeId: string;
  toNodeId: string;
  type: string;
  label: string;
}

export interface TransformResult {
  nodes: TransformNode[];
  edges: TransformEdge[];
}

export interface Transform {
  id: string;
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  requiresApi: boolean;
  execute(entity: TransformInput, projectId: string): Promise<TransformResult>;
}
