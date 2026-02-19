export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  confidence: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    category: string;
    confidence: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    confidence: number;
  }>;
}
