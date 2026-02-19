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

const categoryIcons: Record<string, string> = {
  infrastructure: "\u2302",
  web_assets: "\u2318",
  technology: "\u2699",
  network: "\u2307",
  people: "\u263A",
  organizations: "\u2616",
  credentials: "\u26BF",
  vulnerabilities: "\u26A0",
  files: "\u2750",
  total: "\u2211",
};

export interface StatCardProps {
  label: string;
  count: number;
  category?: string;
  onClick?: () => void;
}

export function StatCard({ label, count, category, onClick }: StatCardProps) {
  const color = category ? categoryColors[category] ?? "#888" : "#22c55e";
  const icon = category ? categoryIcons[category] ?? "\u2022" : categoryIcons.total;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#111",
        border: `1px solid ${color}33`,
        borderRadius: 6,
        padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        minWidth: 130,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget.style.borderColor = color);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.borderColor = `${color}33`);
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16, color }}>{icon}</span>
        <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace", textTransform: "capitalize" }}>
          {label.replace(/_/g, " ")}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "monospace" }}>{count.toLocaleString()}</div>
      {onClick && (
        <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", marginTop: 6 }}>View &rarr;</div>
      )}
    </div>
  );
}
