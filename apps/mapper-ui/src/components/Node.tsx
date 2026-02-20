import React from "react";
import type { MapperNode } from "@0x0-gen/sdk";

const TYPE_COLORS: Record<string, string> = {
  domain: "#22c55e",
  subdomain: "#4ade80",
  ip: "#3b82f6",
  asn: "#6366f1",
  netblock: "#8b5cf6",
  url: "#f59e0b",
  endpoint: "#f97316",
  parameter: "#ef4444",
  port: "#06b6d4",
  service: "#14b8a6",
  technology: "#a855f7",
  email: "#ec4899",
  username: "#f43f5e",
  person: "#d946ef",
  organization: "#8b5cf6",
  credential: "#ef4444",
  vulnerability: "#dc2626",
  file: "#78716c",
  certificate: "#0ea5e9",
};

const TYPE_ICONS: Record<string, string> = {
  domain: "\u{1F310}",
  subdomain: "\u{1F30D}",
  ip: "\u{1F4CD}",
  url: "\u{1F517}",
  port: "\u{1F6AA}",
  service: "\u2699",
  technology: "\u{1F4BB}",
  email: "\u2709",
  person: "\u{1F464}",
  organization: "\u{1F3E2}",
  vulnerability: "\u26A0",
  certificate: "\u{1F512}",
  file: "\u{1F4C4}",
};

interface NodeProps {
  node: MapperNode;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function NodeComponent({
  node,
  selected,
  onMouseDown,
  onClick,
  onDoubleClick,
  onContextMenu,
}: NodeProps) {
  const color = node.style?.color || TYPE_COLORS[node.type] || "#6b7280";
  const size = node.style?.size || 24;
  const icon = TYPE_ICONS[node.type] || "\u25CF";

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ cursor: "grab" }}
      data-testid={`node-${node.id}`}
    >
      {/* Selection ring */}
      {selected && (
        <circle
          r={size + 4}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}

      {/* Node circle */}
      <circle
        r={size}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={selected ? 2 : 1.5}
      />

      {/* Icon */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.8}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {icon}
      </text>

      {/* Label */}
      <text
        y={size + 14}
        textAnchor="middle"
        fill="#e5e7eb"
        fontSize={11}
        fontFamily="monospace"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {node.label.length > 30
          ? node.label.slice(0, 27) + "..."
          : node.label}
      </text>

      {/* Pin indicator */}
      {node.pinned && (
        <text
          x={size - 4}
          y={-size + 4}
          fontSize={10}
          style={{ pointerEvents: "none" }}
        >
          {"\u{1F4CC}"}
        </text>
      )}
    </g>
  );
}

export { TYPE_COLORS };
