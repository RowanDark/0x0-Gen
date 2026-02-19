import React from "react";
import type { MapperNode, MapperEdge, MapperTransform } from "@0x0-gen/sdk";
import { TYPE_COLORS } from "./Node.js";
import { TransformMenu } from "./TransformMenu.js";

interface NodeDetailProps {
  node: MapperNode;
  edges: MapperEdge[];
  allNodes: MapperNode[];
  transforms: MapperTransform[];
  onPin: () => void;
  onDelete: () => void;
  onRunTransform: (transformId: string) => void;
  onClose: () => void;
}

export function NodeDetail({
  node,
  edges,
  allNodes,
  transforms,
  onPin,
  onDelete,
  onRunTransform,
  onClose,
}: NodeDetailProps) {
  const connectedEdges = edges.filter(
    (e) => e.fromNodeId === node.id || e.toNodeId === node.id,
  );

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <div
      style={{
        width: 280,
        background: "#111",
        borderLeft: "1px solid #222",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        fontSize: 12,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #222" }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: TYPE_COLORS[node.type] || "#6b7280",
            marginRight: 8,
          }}
        />
        <span style={{ color: "#22c55e", fontWeight: 600, flex: 1 }}>Node Details</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          x
        </button>
      </div>

      <div style={{ padding: "8px 12px" }}>
        <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>Type</div>
        <div style={{ color: "#e5e7eb", marginBottom: 8 }}>{node.type}</div>

        <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>Label</div>
        <div style={{ color: "#e5e7eb", wordBreak: "break-all", marginBottom: 8 }}>
          {node.label}
        </div>

        <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>Position</div>
        <div style={{ color: "#e5e7eb", marginBottom: 8 }}>
          x: {Math.round(node.x)}, y: {Math.round(node.y)}
        </div>

        <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>Pinned</div>
        <div style={{ color: "#e5e7eb", marginBottom: 8 }}>{node.pinned ? "Yes" : "No"}</div>

        {node.entityId && (
          <>
            <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>Entity ID</div>
            <div style={{ color: "#e5e7eb", fontSize: 9, wordBreak: "break-all", marginBottom: 8 }}>
              {node.entityId}
            </div>
          </>
        )}
      </div>

      {/* Connections */}
      {connectedEdges.length > 0 && (
        <div style={{ padding: "0 12px 8px" }}>
          <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 4 }}>
            Connections ({connectedEdges.length})
          </div>
          {connectedEdges.map((edge) => {
            const otherId = edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId;
            const other = nodeMap.get(otherId);
            const direction = edge.fromNodeId === node.id ? "\u2192" : "\u2190";
            return (
              <div
                key={edge.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 0",
                  color: "#9ca3af",
                  fontSize: 10,
                }}
              >
                <span>{direction}</span>
                <span style={{ color: "#6b7280" }}>{edge.type.replace(/_/g, " ")}</span>
                <span style={{ color: "#e5e7eb" }}>
                  {other ? (other.label.length > 15 ? other.label.slice(0, 15) + "..." : other.label) : "?"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Transforms */}
      <div style={{ padding: "0 12px 8px", borderTop: "1px solid #222", paddingTop: 8 }}>
        <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 4 }}>Transforms</div>
        <TransformMenu
          transforms={transforms}
          entityType={node.type}
          onSelect={onRunTransform}
        />
      </div>

      {/* Actions */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #222", display: "flex", gap: 8 }}>
        <button
          onClick={onPin}
          style={{
            flex: 1,
            padding: "4px 8px",
            background: "#1a1a1a",
            color: "#e5e7eb",
            border: "1px solid #333",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          {node.pinned ? "Unpin" : "Pin"}
        </button>
        <button
          onClick={onDelete}
          style={{
            flex: 1,
            padding: "4px 8px",
            background: "#1a1a1a",
            color: "#ef4444",
            border: "1px solid #333",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
