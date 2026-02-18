import React from "react";
import type { TransformTypeInfo } from "../hooks/useTransformTypes.js";
import type { TransformType, TransformDirection } from "@0x0-gen/sdk";

interface TransformPickerProps {
  types: TransformTypeInfo[];
  onAdd: (type: TransformType, direction?: TransformDirection) => void;
}

const CATEGORY_ORDER = ["Encoding", "Text", "Hash", "Compression", "Formats"];

export function TransformPicker({ types, onAdd }: TransformPickerProps) {
  const categories = CATEGORY_ORDER.filter((cat) =>
    types.some((t) => t.category === cat),
  );

  return (
    <div style={{ padding: 8 }}>
      <div
        style={{
          color: "#555",
          fontSize: "10px",
          letterSpacing: 1,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        Transforms
      </div>
      {categories.map((category) => (
        <div key={category} style={{ marginBottom: 10 }}>
          <div style={{ color: "#666", fontSize: "10px", marginBottom: 4 }}>
            {category}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {types
              .filter((t) => t.category === category)
              .map((t) => {
                const isOneWay = t.directions.length === 1;
                return (
                  <button
                    key={t.type}
                    onClick={() => onAdd(t.type, "encode")}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (t.directions.includes("decode")) {
                        onAdd(t.type, "decode");
                      }
                    }}
                    title={`${t.description}${isOneWay ? " (one-way)" : "\nRight-click for decode"}`}
                    style={{
                      background: isOneWay ? "#1a1520" : "#151a20",
                      border: `1px solid ${isOneWay ? "#332244" : "#223344"}`,
                      borderRadius: 4,
                      color: isOneWay ? "#9977bb" : "#77aacc",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      padding: "4px 10px",
                    }}
                  >
                    {t.name}
                    {isOneWay && (
                      <span style={{ fontSize: "8px", marginLeft: 3, opacity: 0.6 }}>
                        →
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
      <div style={{ color: "#444", fontSize: "9px", marginTop: 8 }}>
        Click to add (encode) · Right-click for decode
      </div>
    </div>
  );
}
