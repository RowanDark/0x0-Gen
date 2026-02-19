import React from "react";

export interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onResetView: () => void;
  zoom: number;
}

export function Toolbar({ onZoomIn, onZoomOut, onFitToScreen, onResetView, zoom }: ToolbarProps) {
  const btnStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 3,
    color: "#ccc",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 11,
    padding: "4px 8px",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        gap: 4,
        zIndex: 10,
        background: "#0a0a0acc",
        padding: 4,
        borderRadius: 4,
        border: "1px solid #222",
      }}
    >
      <button style={btnStyle} onClick={onZoomIn} title="Zoom In">
        +
      </button>
      <button style={btnStyle} onClick={onZoomOut} title="Zoom Out">
        -
      </button>
      <span
        style={{
          color: "#666",
          fontFamily: "monospace",
          fontSize: 10,
          padding: "4px 6px",
          minWidth: 36,
          textAlign: "center",
        }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button style={btnStyle} onClick={onFitToScreen} title="Fit to Screen">
        Fit
      </button>
      <button style={btnStyle} onClick={onResetView} title="Reset View">
        Reset
      </button>
    </div>
  );
}
