import React from "react";

const categoryColors: Record<string, string> = {
  infrastructure: "#3b82f6",
  web_assets: "#8b5cf6",
  technology: "#06b6d4",
  network: "#f59e0b",
  people: "#ec4899",
  organizations: "#14b8a6",
  credentials: "#ef4444",
  vulnerabilities: "#f97316",
  files: "#84cc16",
};

export interface CategoryBreakdownProps {
  data: Record<string, number>;
  total: number;
}

export function CategoryBreakdown({ data, total }: CategoryBreakdownProps) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) {
    return (
      <div style={{ padding: 16, color: "#555", fontFamily: "monospace", fontSize: 12 }}>
        No entity data yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(([category, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const color = categoryColors[category] ?? "#888";
        return (
          <div key={category}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#ccc", textTransform: "capitalize" }}>
                {category.replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#888" }}>
                {count} ({pct.toFixed(1)}%)
              </span>
            </div>
            <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
