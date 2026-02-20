import React from "react";
import type { MapperNode, MapperEdge, MapperViewport } from "@0x0-gen/sdk";
import { TYPE_COLORS } from "./Node.js";

interface MiniMapProps {
  nodes: MapperNode[];
  edges: MapperEdge[];
  viewport: MapperViewport;
  containerWidth: number;
  containerHeight: number;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;

export function MiniMap({ nodes, edges, viewport, containerWidth, containerHeight }: MiniMapProps) {
  if (nodes.length === 0) return null;

  // Calculate bounds of all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - 30);
    minY = Math.min(minY, n.y - 30);
    maxX = Math.max(maxX, n.x + 30);
    maxY = Math.max(maxY, n.y + 30);
  }

  const padding = 40;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;
  const scale = Math.min(MINIMAP_WIDTH / worldWidth, MINIMAP_HEIGHT / worldHeight);

  // Viewport rectangle in minimap space
  const vx = (-viewport.x / viewport.zoom - minX) * scale;
  const vy = (-viewport.y / viewport.zoom - minY) * scale;
  const vw = (containerWidth / viewport.zoom) * scale;
  const vh = (containerHeight / viewport.zoom) * scale;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        background: "#111",
        border: "1px solid #333",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
        {/* Edges */}
        {edges.map((edge) => {
          const from = nodes.find((n) => n.id === edge.fromNodeId);
          const to = nodes.find((n) => n.id === edge.toNodeId);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={(from.x - minX) * scale}
              y1={(from.y - minY) * scale}
              x2={(to.x - minX) * scale}
              y2={(to.y - minY) * scale}
              stroke="#333"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <circle
            key={node.id}
            cx={(node.x - minX) * scale}
            cy={(node.y - minY) * scale}
            r={2}
            fill={TYPE_COLORS[node.type] || "#6b7280"}
          />
        ))}

        {/* Viewport indicator */}
        <rect
          x={vx}
          y={vy}
          width={vw}
          height={vh}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1}
          opacity={0.6}
        />
      </svg>
    </div>
  );
}
