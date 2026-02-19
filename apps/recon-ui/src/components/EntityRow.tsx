import React from "react";
import type { ReconEntity } from "@0x0-gen/sdk";

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

const typeIcons: Record<string, string> = {
  domain: "\u2302",
  subdomain: "\u2302",
  ip: "#",
  url: "\u2197",
  endpoint: "/",
  port: ":",
  email: "@",
  vulnerability: "\u26A0",
  technology: "\u2699",
  file: "\u2750",
  certificate: "\u2618",
  service: "\u25B8",
  person: "\u263A",
  organization: "\u2616",
  credential: "\u26BF",
  username: "\u263A",
  parameter: "?",
  asn: "~",
  netblock: "\u2307",
};

export interface EntityRowProps {
  entity: ReconEntity;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}

export function EntityRow({ entity, selected, onToggleSelect, onClick }: EntityRowProps) {
  const color = categoryColors[entity.category] ?? "#888";
  const icon = typeIcons[entity.type] ?? "\u2022";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderBottom: "1px solid #1a1a1a",
        background: selected ? "#1a1a2a" : "transparent",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "monospace",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "#111";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ accentColor: "#22c55e" }}
      />

      {/* Type icon */}
      <span style={{ color, width: 16, textAlign: "center", fontSize: 13 }}>{icon}</span>

      {/* Value */}
      <span style={{ flex: 1, color: "#eee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entity.value}
      </span>

      {/* Category */}
      <span
        style={{
          color,
          background: `${color}15`,
          padding: "1px 6px",
          borderRadius: 3,
          fontSize: 9,
          textTransform: "capitalize",
        }}
      >
        {entity.type}
      </span>

      {/* Sources */}
      <span style={{ color: "#555", width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entity.sources.join(", ")}
      </span>

      {/* Tags */}
      <span style={{ width: 80, display: "flex", gap: 3, overflow: "hidden" }}>
        {entity.tags.slice(0, 2).map((tag: string) => (
          <span
            key={tag}
            style={{
              background: "#222",
              color: "#888",
              padding: "0 4px",
              borderRadius: 2,
              fontSize: 9,
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </span>
        ))}
        {entity.tags.length > 2 && (
          <span style={{ color: "#555", fontSize: 9 }}>+{entity.tags.length - 2}</span>
        )}
      </span>

      {/* First seen */}
      <span style={{ color: "#555", width: 70, fontSize: 9 }}>
        {new Date(entity.firstSeen).toLocaleDateString()}
      </span>
    </div>
  );
}
