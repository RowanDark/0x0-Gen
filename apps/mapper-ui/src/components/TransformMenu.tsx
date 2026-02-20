import React from "react";
import type { MapperTransform } from "@0x0-gen/sdk";

interface TransformMenuProps {
  transforms: MapperTransform[];
  entityType: string;
  onSelect: (transformId: string) => void;
}

export function TransformMenu({ transforms, entityType, onSelect }: TransformMenuProps) {
  const applicable = transforms.filter((t) =>
    t.inputTypes.includes(entityType as any),
  );

  if (applicable.length === 0) {
    return (
      <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", padding: 8 }}>
        No transforms available for {entityType}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {applicable.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 10px",
            background: "transparent",
            color: "#e5e7eb",
            border: "none",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 11,
            borderRadius: 3,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#22c55e20"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          title={t.description}
        >
          {t.name}
          {t.requiresApi && <span style={{ color: "#f59e0b", marginLeft: 4, fontSize: 9 }}>API</span>}
        </button>
      ))}
    </div>
  );
}
