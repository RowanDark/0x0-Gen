import React from "react";

interface ToolbarProps {
  canvasName: string;
  nodeCount: number;
  edgeCount: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onTogglePalette: () => void;
  paletteOpen: boolean;
}

const btnStyle: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#e5e7eb",
  border: "1px solid #333",
  padding: "4px 10px",
  borderRadius: 4,
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 12,
};

export function Toolbar({
  canvasName,
  nodeCount,
  edgeCount,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onAutoLayout,
  onExport,
  onTogglePalette,
  paletteOpen,
}: ToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#111",
        borderBottom: "1px solid #222",
        fontFamily: "monospace",
        fontSize: 12,
        color: "#9ca3af",
      }}
    >
      <span style={{ color: "#22c55e", fontWeight: 600 }}>{canvasName}</span>
      <span style={{ color: "#4b5563" }}>|</span>
      <span>{nodeCount} nodes</span>
      <span>{edgeCount} edges</span>
      <span style={{ color: "#4b5563" }}>|</span>
      <span>{Math.round(zoom * 100)}%</span>

      <div style={{ flex: 1 }} />

      <button style={btnStyle} onClick={onZoomIn} title="Zoom In (+)">+</button>
      <button style={btnStyle} onClick={onZoomOut} title="Zoom Out (-)">-</button>
      <button style={btnStyle} onClick={onResetView} title="Reset View">Reset</button>
      <button style={btnStyle} onClick={onAutoLayout} title="Auto Layout">Layout</button>
      <button style={btnStyle} onClick={onExport} title="Export">Export</button>
      <button
        style={{ ...btnStyle, background: paletteOpen ? "#22c55e20" : "#1a1a1a", color: paletteOpen ? "#22c55e" : "#e5e7eb" }}
        onClick={onTogglePalette}
        title="Toggle Entity Palette"
      >
        Entities
      </button>
    </div>
  );
}
