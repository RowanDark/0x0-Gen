import React, { useRef } from "react";
import type { TransformStep } from "@0x0-gen/sdk";
import { PipelineStep } from "./PipelineStep.js";

interface PipelineBuilderProps {
  steps: TransformStep[];
  autoRun: boolean;
  running: boolean;
  onToggleDirection: (index: number) => void;
  onRemoveStep: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClear: () => void;
  onExecute: () => void;
  onToggleAutoRun: () => void;
}

export function PipelineBuilder({
  steps,
  autoRun,
  running,
  onToggleDirection,
  onRemoveStep,
  onReorder,
  onClear,
  onExecute,
  onToggleAutoRun,
}: PipelineBuilderProps) {
  const dragIndexRef = useRef<number>(-1);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#555",
            fontSize: "10px",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Pipeline ({steps.length})
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label
            style={{ color: "#555", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}
          >
            <input
              type="checkbox"
              checked={autoRun}
              onChange={onToggleAutoRun}
              style={{ width: 12, height: 12 }}
            />
            Auto
          </label>
          <button onClick={onClear} style={btnStyle} disabled={steps.length === 0}>
            Clear
          </button>
          <button
            onClick={onExecute}
            disabled={steps.length === 0 || running}
            style={{
              ...btnStyle,
              background: steps.length > 0 ? "#0a2a1a" : "#1a1a1a",
              borderColor: steps.length > 0 ? "#1a4a2a" : "#333",
              color: steps.length > 0 ? "#44cc88" : "#555",
            }}
          >
            {running ? "..." : "Run"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: 3,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {steps.length === 0 ? (
          <div style={{ color: "#333", fontSize: "11px", padding: 8, textAlign: "center" }}>
            Add transforms from the picker below
          </div>
        ) : (
          steps.map((step, i) => (
            <PipelineStep
              key={`${step.type}-${step.direction}-${i}`}
              step={step}
              index={i}
              onToggleDirection={() => onToggleDirection(i)}
              onRemove={() => onRemoveStep(i)}
              onDragStart={() => {
                dragIndexRef.current = i;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndexRef.current >= 0 && dragIndexRef.current !== i) {
                  onReorder(dragIndexRef.current, i);
                }
                dragIndexRef.current = -1;
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: 3,
  color: "#888",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "2px 8px",
};
