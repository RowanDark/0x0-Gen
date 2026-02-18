import React from "react";
import type { AttackType } from "@0x0-gen/sdk";

interface AttackTypeSelectorProps {
  value: AttackType;
  onChange: (type: AttackType) => void;
  positionCount: number;
  payloadCounts: number[];
}

const ATTACK_TYPES: {
  type: AttackType;
  label: string;
  description: string;
}[] = [
  {
    type: "sniper",
    label: "Sniper",
    description: "Test each position one at a time",
  },
  {
    type: "battering_ram",
    label: "Battering Ram",
    description: "Same payload in all positions",
  },
  {
    type: "pitchfork",
    label: "Pitchfork",
    description: "Parallel payload lists",
  },
  {
    type: "cluster_bomb",
    label: "Cluster Bomb",
    description: "All combinations",
  },
];

function estimateRequests(
  type: AttackType,
  positionCount: number,
  payloadCounts: number[],
): number {
  if (positionCount === 0 || payloadCounts.length === 0) return 0;

  switch (type) {
    case "sniper":
      return positionCount * (payloadCounts[0] ?? 0);
    case "battering_ram":
      return payloadCounts[0] ?? 0;
    case "pitchfork":
      return Math.min(
        ...payloadCounts.slice(0, positionCount),
      );
    case "cluster_bomb": {
      let total = 1;
      for (let i = 0; i < positionCount; i++) {
        total *= payloadCounts[i] ?? payloadCounts[0] ?? 1;
      }
      return total;
    }
  }
}

export function AttackTypeSelector({
  value,
  onChange,
  positionCount,
  payloadCounts,
}: AttackTypeSelectorProps) {
  const estimated = estimateRequests(value, positionCount, payloadCounts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 8,
          paddingBottom: 8,
        }}
      >
        <span style={{ color: "#888", fontSize: "11px" }}>Attack Type</span>
        <span style={{ color: "#666", fontSize: "10px", marginLeft: "auto" }}>
          ~{estimated.toLocaleString()} requests
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ATTACK_TYPES.map((at) => (
          <label
            key={at.type}
            style={{
              alignItems: "flex-start",
              background: value === at.type ? "#1a2a3a" : "#111",
              border: `1px solid ${value === at.type ? "#2a4a6a" : "#222"}`,
              borderRadius: 4,
              cursor: "pointer",
              display: "flex",
              gap: 8,
              padding: "6px 8px",
            }}
          >
            <input
              type="radio"
              name="attackType"
              value={at.type}
              checked={value === at.type}
              onChange={() => onChange(at.type)}
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ color: "#ccc", fontSize: "11px", fontWeight: "bold" }}>
                {at.label}
              </div>
              <div style={{ color: "#666", fontSize: "10px" }}>{at.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
