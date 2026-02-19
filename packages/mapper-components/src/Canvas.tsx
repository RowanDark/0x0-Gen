import React, { useRef, useEffect, useCallback } from "react";
import type { GraphNode, GraphEdge, Viewport } from "./types.js";

const categoryColors: Record<string, string> = {
  infrastructure: "#3b82f6",
  web_assets: "#8b5cf6",
  technology: "#06b6d4",
  network: "#f59e0b",
  people: "#ec4899",
  organizations: "#14b8a6",
  credentials: "#ef4444",
  vulnerabilities: "#f97316",
  files: "#84cc16",
};

const NODE_RADIUS = 20;

export interface CanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onWheel: (delta: number, cx: number, cy: number) => void;
  onPanStart: (x: number, y: number) => void;
  onPanMove: (x: number, y: number) => boolean;
  onPanEnd: () => void;
}

export function Canvas({
  nodes,
  edges,
  viewport,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onWheel,
  onPanStart,
  onPanMove,
  onPanEnd,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - viewport.x) / viewport.zoom,
      y: (sy - viewport.y) / viewport.zoom,
    }),
    [viewport],
  );

  const findNodeAt = useCallback(
    (sx: number, sy: number): GraphNode | null => {
      const { x: wx, y: wy } = screenToWorld(sx, sy);
      // Search in reverse order (top nodes first)
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = wx - n.x;
        const dy = wy - n.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
          return n;
        }
      }
      return null;
    },
    [nodes, screenToWorld],
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Draw edges
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Edge label at midpoint
      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2;
      ctx.font = "9px monospace";
      ctx.fillStyle = "#555";
      ctx.textAlign = "center";
      ctx.fillText(edge.type.replace(/_/g, " "), mx, my - 4);
    }

    // Draw nodes
    for (const node of nodes) {
      const color = categoryColors[node.category] ?? "#888";
      const isSelected = node.id === selectedNodeId;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? color : `${color}44`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#fff" : color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Type icon letter
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = isSelected ? "#fff" : color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.type.charAt(0).toUpperCase(), node.x, node.y);

      // Label below
      ctx.font = "10px monospace";
      ctx.fillStyle = "#ccc";
      ctx.textBaseline = "top";
      const label = node.label.length > 20 ? node.label.slice(0, 18) + "..." : node.label;
      ctx.fillText(label, node.x, node.y + NODE_RADIUS + 4);
    }

    ctx.restore();

    // Mini-info overlay
    ctx.font = "10px monospace";
    ctx.fillStyle = "#555";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      `${nodes.length} nodes, ${edges.length} edges | zoom: ${viewport.zoom.toFixed(2)}`,
      8,
      rect.height - 8,
    );
  }, [nodes, edges, viewport, selectedNodeId]);

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = container.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = findNodeAt(sx, sy);

      if (node) {
        const { x: wx, y: wy } = screenToWorld(sx, sy);
        dragState.current = {
          nodeId: node.id,
          offsetX: wx - node.x,
          offsetY: wy - node.y,
        };
        onSelectNode(node.id);
      } else {
        onSelectNode(null);
        onPanStart(e.clientX, e.clientY);
      }
    },
    [findNodeAt, screenToWorld, onSelectNode, onPanStart],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x: wx, y: wy } = screenToWorld(sx, sy);
        onMoveNode(
          dragState.current.nodeId,
          wx - dragState.current.offsetX,
          wy - dragState.current.offsetY,
        );
      } else {
        onPanMove(e.clientX, e.clientY);
      }
    },
    [screenToWorld, onMoveNode, onPanMove],
  );

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
    onPanEnd();
  }, [onPanEnd]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      onWheel(e.deltaY, e.clientX - rect.left, e.clientY - rect.top);
    },
    [onWheel],
  );

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", cursor: dragState.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
