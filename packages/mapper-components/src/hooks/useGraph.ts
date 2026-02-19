import { useState, useCallback, useRef, useEffect } from "react";
import type { GraphNode, GraphEdge, GraphData } from "../types.js";

const REPULSION = 5000;
const ATTRACTION = 0.01;
const DAMPING = 0.9;
const MIN_VELOCITY = 0.01;
const MAX_ITERATIONS = 300;

function layoutNodes(rawNodes: GraphData["nodes"], rawEdges: GraphData["edges"]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length;
    const radius = 200 + rawNodes.length * 10;
    return {
      ...n,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  const edges: GraphEdge[] = rawEdges.map((e) => ({ ...e }));

  // Simple force-directed layout
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let maxVel = 0;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx += fx;
        nodes[i].vy += fy;
        nodes[j].vx -= fx;
        nodes[j].vy -= fy;
      }
    }

    // Attraction along edges
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = dist * ATTRACTION;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // Apply velocity
    for (const node of nodes) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
      maxVel = Math.max(maxVel, Math.abs(node.vx), Math.abs(node.vy));
    }

    if (maxVel < MIN_VELOCITY) break;
  }

  // Zero out velocity after layout
  for (const node of nodes) {
    node.vx = 0;
    node.vy = 0;
  }

  return { nodes, edges };
}

export function useGraph(data: GraphData | null) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const layoutDone = useRef(false);

  useEffect(() => {
    if (!data || (data.nodes.length === 0 && data.edges.length === 0)) {
      setNodes([]);
      setEdges([]);
      layoutDone.current = false;
      return;
    }

    const result = layoutNodes(data.nodes, data.edges);
    setNodes(result.nodes);
    setEdges(result.edges);
    layoutDone.current = true;
  }, [data]);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
    );
  }, []);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const addNode = useCallback((node: GraphData["nodes"][number]) => {
    setNodes((prev) => {
      if (prev.find((n) => n.id === node.id)) return prev;
      return [
        ...prev,
        {
          ...node,
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
        },
      ];
    });
  }, []);

  return {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    moveNode,
    selectNode,
    addNode,
  };
}
