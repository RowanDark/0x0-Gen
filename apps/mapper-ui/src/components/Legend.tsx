import React from "react";
import { TYPE_COLORS } from "./Node.js";

interface LegendProps {
  visibleTypes: string[];
}

export function Legend({ visibleTypes }: LegendProps) {
  if (visibleTypes.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        background: "#111",
        border: "1px solid #333",
        borderRadius: 4,
        padding: "6px 10px",
        fontFamily: "monospace",
        fontSize: 10,
      }}
    >
      {visibleTypes.map((type) => (
        <div
          key={type}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "1px 0",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: TYPE_COLORS[type] || "#6b7280",
            }}
          />
          <span style={{ color: "#9ca3af" }}>{type}</span>
        </div>
      ))}
    </div>
  );
}
