import React from "react";
import type { IntruderPosition } from "@0x0-gen/sdk";

interface PositionMarkerProps {
  position: IntruderPosition;
  index: number;
  onRemove: (id: string) => void;
}

export function PositionMarker({ position, index, onRemove }: PositionMarkerProps) {
  const hue = index * 60;

  return (
    <span
      style={{
        alignItems: "center",
        background: `hsl(${hue}, 40%, 20%)`,
        border: `1px solid hsl(${hue}, 40%, 35%)`,
        borderRadius: 3,
        color: `hsl(${hue}, 70%, 70%)`,
        display: "inline-flex",
        fontSize: "10px",
        gap: 4,
        padding: "1px 6px",
      }}
    >
      <span
        style={{
          background: `hsl(${hue}, 50%, 30%)`,
          borderRadius: 2,
          fontSize: "9px",
          fontWeight: "bold",
          padding: "0 3px",
        }}
      >
        {index + 1}
      </span>
      {position.name ?? `pos${index + 1}`}
      <button
        onClick={() => onRemove(position.id)}
        style={{
          background: "none",
          border: "none",
          color: "#888",
          cursor: "pointer",
          fontSize: "10px",
          padding: 0,
        }}
        title="Remove position"
      >
        x
      </button>
    </span>
  );
}
