import React from "react";

const categories: Array<{ key: string; color: string; label: string }> = [
  { key: "infrastructure", color: "#3b82f6", label: "Infrastructure" },
  { key: "web_assets", color: "#8b5cf6", label: "Web Assets" },
  { key: "technology", color: "#06b6d4", label: "Technology" },
  { key: "network", color: "#f59e0b", label: "Network" },
  { key: "people", color: "#ec4899", label: "People" },
  { key: "organizations", color: "#14b8a6", label: "Organizations" },
  { key: "credentials", color: "#ef4444", label: "Credentials" },
  { key: "vulnerabilities", color: "#f97316", label: "Vulnerabilities" },
  { key: "files", color: "#84cc16", label: "Files" },
];

export interface LegendProps {
  visibleCategories?: Set<string>;
}

export function Legend({ visibleCategories }: LegendProps) {
  const filtered = visibleCategories
    ? categories.filter((c) => visibleCategories.has(c.key))
    : categories;

  if (filtered.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        background: "#0a0a0acc",
        border: "1px solid #222",
        borderRadius: 4,
        padding: "6px 10px",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 12px",
        zIndex: 10,
        maxWidth: 400,
      }}
    >
      {filtered.map((cat) => (
        <div
          key={cat.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            fontFamily: "monospace",
            color: "#888",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: cat.color,
              flexShrink: 0,
            }}
          />
          {cat.label}
        </div>
      ))}
    </div>
  );
}
