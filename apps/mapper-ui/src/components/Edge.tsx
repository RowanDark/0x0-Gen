import React from "react";
import type { MapperEdge, MapperNode } from "@0x0-gen/sdk";

interface EdgeProps {
  edge: MapperEdge;
  fromNode: MapperNode;
  toNode: MapperNode;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function EdgeComponent({ edge, fromNode, toNode, selected, onClick }: EdgeProps) {
  const color = edge.style?.color || "#4b5563";
  const width = edge.style?.width || (selected ? 2.5 : 1.5);
  const dashed = edge.style?.dashed || false;

  // Calculate direction vector
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return null;

  const nx = dx / dist;
  const ny = dy / dist;

  // Offset start/end to circle edge (radius ~24)
  const r = 24;
  const x1 = fromNode.x + nx * r;
  const y1 = fromNode.y + ny * r;
  const x2 = toNode.x - nx * r;
  const y2 = toNode.y - ny * r;

  // Arrowhead
  const arrowSize = 8;
  const ax1 = x2 - nx * arrowSize - ny * arrowSize * 0.5;
  const ay1 = y2 - ny * arrowSize + nx * arrowSize * 0.5;
  const ax2 = x2 - nx * arrowSize + ny * arrowSize * 0.5;
  const ay2 = y2 - ny * arrowSize - nx * arrowSize * 0.5;

  // Midpoint for label
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }} data-testid={`edge-${edge.id}`}>
      {/* Invisible wider line for easier clicking */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Visible line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={selected ? "#22c55e" : color}
        strokeWidth={width}
        strokeDasharray={dashed ? "6 3" : undefined}
      />

      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={selected ? "#22c55e" : color}
      />

      {/* Label on hover (always shown if selected, or shown via CSS hover) */}
      {(edge.label || edge.type) && (
        <text
          x={mx}
          y={my - 6}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={9}
          fontFamily="monospace"
          opacity={selected ? 1 : 0.7}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {edge.label || edge.type.replace(/_/g, " ")}
        </text>
      )}
    </g>
  );
}
