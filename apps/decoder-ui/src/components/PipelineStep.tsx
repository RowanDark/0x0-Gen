import React from "react";
import type { TransformStep } from "@0x0-gen/sdk";

interface PipelineStepProps {
  step: TransformStep;
  index: number;
  onToggleDirection: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function PipelineStep({
  step,
  index,
  onToggleDirection,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: PipelineStepProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        alignItems: "center",
        background: "#111",
        border: "1px solid #2a2a2a",
        borderRadius: 4,
        cursor: "grab",
        display: "flex",
        gap: 8,
        padding: "4px 8px",
      }}
    >
      <span style={{ color: "#444", fontSize: "10px", cursor: "grab" }}>
        ⠿
      </span>
      <span style={{ color: "#666", fontSize: "10px", width: 16 }}>{index + 1}</span>
      <span style={{ color: "#aaa", flex: 1, fontSize: "11px" }}>
        {step.type}
      </span>
      <button
        onClick={onToggleDirection}
        style={{
          background: step.direction === "encode" ? "#0a1a15" : "#1a0a15",
          border: `1px solid ${step.direction === "encode" ? "#1a3a2a" : "#3a1a2a"}`,
          borderRadius: 3,
          color: step.direction === "encode" ? "#44aa77" : "#aa4477",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "9px",
          padding: "1px 6px",
        }}
      >
        {step.direction}
      </button>
      <button
        onClick={onRemove}
        style={{
          background: "transparent",
          border: "none",
          color: "#555",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "0 4px",
        }}
      >
        ×
      </button>
    </div>
  );
}
