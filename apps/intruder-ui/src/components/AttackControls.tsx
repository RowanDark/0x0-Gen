import React from "react";
import type { AttackStatus } from "@0x0-gen/sdk";

interface AttackControlsProps {
  status: AttackStatus | "idle";
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: "Idle", color: "#666" },
  pending: { label: "Pending", color: "#888" },
  running: { label: "Running", color: "#4a8" },
  paused: { label: "Paused", color: "#cc4" },
  completed: { label: "Completed", color: "#48a" },
  cancelled: { label: "Cancelled", color: "#c44" },
};

export function AttackControls({
  status,
  canStart,
  onStart,
  onPause,
  onResume,
  onCancel,
}: AttackControlsProps) {
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.idle;
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isActive = isRunning || isPaused;

  return (
    <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
      {/* Status indicator */}
      <div style={{ alignItems: "center", display: "flex", gap: 4 }}>
        <span
          style={{
            background: statusInfo.color,
            borderRadius: "50%",
            display: "inline-block",
            height: 6,
            width: 6,
          }}
        />
        <span style={{ color: statusInfo.color, fontSize: "11px" }}>
          {statusInfo.label}
        </span>
      </div>

      {/* Control buttons */}
      {!isActive && (
        <button
          onClick={onStart}
          disabled={!canStart}
          style={{
            background: canStart ? "#2a5a2a" : "#1a1a1a",
            border: `1px solid ${canStart ? "#3a7a3a" : "#333"}`,
            borderRadius: 3,
            color: canStart ? "#aaffaa" : "#555",
            cursor: canStart ? "pointer" : "not-allowed",
            fontSize: "11px",
            fontWeight: "bold",
            padding: "4px 12px",
          }}
        >
          Start Attack
        </button>
      )}

      {isRunning && (
        <button onClick={onPause} style={activeButtonStyle("#5a5a2a", "#7a7a3a", "#ffffaa")}>
          Pause
        </button>
      )}

      {isPaused && (
        <button onClick={onResume} style={activeButtonStyle("#2a5a2a", "#3a7a3a", "#aaffaa")}>
          Resume
        </button>
      )}

      {isActive && (
        <button onClick={onCancel} style={activeButtonStyle("#5a2a2a", "#7a3a3a", "#ffaaaa")}>
          Cancel
        </button>
      )}
    </div>
  );
}

function activeButtonStyle(bg: string, border: string, color: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 3,
    color,
    cursor: "pointer",
    fontSize: "11px",
    padding: "4px 12px",
  };
}
