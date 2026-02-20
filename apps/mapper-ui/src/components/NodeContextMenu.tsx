import React from "react";
import type { MapperNode, MapperTransform } from "@0x0-gen/sdk";

interface NodeContextMenuProps {
  node: MapperNode;
  position: { x: number; y: number };
  transforms: MapperTransform[];
  onRunTransform: (transformId: string) => void;
  onPin: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const menuStyle: React.CSSProperties = {
  position: "fixed",
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: 6,
  padding: 4,
  zIndex: 1000,
  fontFamily: "monospace",
  fontSize: 12,
  minWidth: 180,
  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
};

const itemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "6px 12px",
  background: "transparent",
  color: "#e5e7eb",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 12,
  borderRadius: 3,
};

export function NodeContextMenu({
  node,
  position,
  transforms,
  onRunTransform,
  onPin,
  onDelete,
  onClose,
}: NodeContextMenuProps) {
  const applicableTransforms = transforms.filter((t) =>
    t.inputTypes.includes(node.type as any),
  );

  return (
    <>
      {/* Overlay to catch clicks outside */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      <div style={{ ...menuStyle, left: position.x, top: position.y }}>
        <div style={{ padding: "4px 12px", color: "#6b7280", fontSize: 10, borderBottom: "1px solid #333", marginBottom: 2 }}>
          {node.type}: {node.label.length > 20 ? node.label.slice(0, 20) + "..." : node.label}
        </div>

        {applicableTransforms.length > 0 && (
          <>
            <div style={{ padding: "4px 12px", color: "#22c55e", fontSize: 10, marginTop: 4 }}>
              Transforms
            </div>
            {applicableTransforms.map((t) => (
              <button
                key={t.id}
                style={itemStyle}
                onClick={() => { onRunTransform(t.id); onClose(); }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#22c55e20"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                title={t.description}
              >
                {t.name}
                {t.requiresApi && <span style={{ color: "#f59e0b", marginLeft: 4 }}>*</span>}
              </button>
            ))}
            <div style={{ borderTop: "1px solid #333", margin: "2px 0" }} />
          </>
        )}

        <button
          style={itemStyle}
          onClick={() => { onPin(); onClose(); }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#22c55e20"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
        >
          {node.pinned ? "Unpin" : "Pin"}
        </button>

        <button
          style={{ ...itemStyle, color: "#ef4444" }}
          onClick={() => { onDelete(); onClose(); }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#ef444420"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
        >
          Remove
        </button>
      </div>
    </>
  );
}
