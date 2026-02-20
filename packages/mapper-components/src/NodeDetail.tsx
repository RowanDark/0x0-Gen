import React from "react";
import type { GraphNode, GraphEdge } from "./types.js";

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

export interface NodeDetailProps {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onClose: () => void;
  onSelectNode: (id: string) => void;
}

export function NodeDetail({ node, edges, nodes, onClose, onSelectNode }: NodeDetailProps) {
  const color = categoryColors[node.category] ?? "#888";
  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id,
  );
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
    textTransform: "uppercase",
    marginBottom: 2,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#ccc",
    fontFamily: "monospace",
    wordBreak: "break-all",
    marginBottom: 10,
  };

  const btnStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 3,
    color: "#888",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 10,
    padding: "2px 8px",
  };

  return (
    <div
      style={{
        width: 260,
        borderLeft: "1px solid #222",
        background: "#0f0f0f",
        padding: 12,
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            color,
            background: `${color}15`,
            padding: "2px 8px",
            borderRadius: 3,
            fontSize: 10,
            fontFamily: "monospace",
            textTransform: "capitalize",
          }}
        >
          {node.type}
        </span>
        <button onClick={onClose} style={btnStyle}>
          &times;
        </button>
      </div>

      <div style={labelStyle}>Label</div>
      <div style={{ ...valueStyle, fontSize: 13, color: "#eee" }}>{node.label}</div>

      <div style={labelStyle}>Category</div>
      <div style={valueStyle}>{node.category.replace(/_/g, " ")}</div>

      <div style={labelStyle}>Confidence</div>
      <div style={valueStyle}>{node.confidence}%</div>

      {connectedEdges.length > 0 && (
        <>
          <div style={labelStyle}>Connections ({connectedEdges.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {connectedEdges.map((edge) => {
              const otherId = edge.source === node.id ? edge.target : edge.source;
              const other = nodeMap.get(otherId);
              const direction = edge.source === node.id ? "\u2192" : "\u2190";
              return (
                <div
                  key={edge.id}
                  onClick={() => onSelectNode(otherId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    background: "#111",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  <span style={{ color: "#555" }}>{direction}</span>
                  <span style={{ color: "#22c55e" }}>{edge.type.replace(/_/g, " ")}</span>
                  <span
                    style={{
                      color: "#888",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {other?.label ?? otherId.slice(0, 8)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
