import React, { useRef, useEffect } from "react";
import type { EntityCategory, EntityType } from "@0x0-gen/sdk";
import type { EntityFilters as Filters } from "../hooks/useEntities.js";

const allCategories: EntityCategory[] = [
  "infrastructure", "web_assets", "technology", "network",
  "people", "organizations", "credentials", "vulnerabilities", "files",
];

const categoryTypeMap: Record<string, EntityType[]> = {
  infrastructure: ["domain", "subdomain", "ip", "asn", "netblock"],
  web_assets: ["url", "endpoint", "parameter"],
  technology: ["technology", "service"],
  network: ["port"],
  people: ["email", "username", "person"],
  organizations: ["organization"],
  credentials: ["credential"],
  vulnerabilities: ["vulnerability"],
  files: ["file", "certificate"],
};

export interface EntityFiltersProps {
  filters: Filters;
  total: number;
  onUpdate: (update: Partial<Filters>) => void;
  onClear: () => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export function EntityFilters({ filters, total, onUpdate, onClear, searchRef }: EntityFiltersProps) {
  const availableTypes = filters.categories.length > 0
    ? filters.categories.flatMap((c) => categoryTypeMap[c] ?? [])
    : Object.values(categoryTypeMap).flat();

  const selectStyle: React.CSSProperties = {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 3,
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: 11,
    padding: "4px 6px",
    outline: "none",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "#888",
    fontFamily: "monospace",
    marginBottom: 3,
    display: "block",
  };

  const groupStyle: React.CSSProperties = {
    marginBottom: 12,
  };

  return (
    <div style={{ width: 200, padding: 12, borderRight: "1px solid #222", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "#ccc", fontWeight: 600 }}>Filters</span>
        <button
          onClick={onClear}
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            fontFamily: "monospace",
            fontSize: 10,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginBottom: 12, fontSize: 11, fontFamily: "monospace", color: "#888" }}>
        {total.toLocaleString()} entities
      </div>

      {/* Search */}
      <div style={groupStyle}>
        <span style={labelStyle}>Search</span>
        <input
          ref={searchRef}
          value={filters.search}
          onChange={(e) => onUpdate({ search: e.target.value })}
          placeholder="Search values..."
          style={{ ...selectStyle, padding: "5px 6px" }}
        />
      </div>

      {/* Category */}
      <div style={groupStyle}>
        <span style={labelStyle}>Category</span>
        <select
          multiple
          value={filters.categories}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value as EntityCategory);
            onUpdate({ categories: selected, types: [] });
          }}
          style={{ ...selectStyle, height: 80 }}
        >
          {allCategories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Type */}
      <div style={groupStyle}>
        <span style={labelStyle}>Type</span>
        <select
          multiple
          value={filters.types}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value as EntityType);
            onUpdate({ types: selected });
          }}
          style={{ ...selectStyle, height: 80 }}
        >
          {availableTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div style={groupStyle}>
        <span style={labelStyle}>Sort By</span>
        <select
          value={filters.sort}
          onChange={(e) => onUpdate({ sort: e.target.value as Filters["sort"] })}
          style={selectStyle}
        >
          <option value="firstSeen">First Seen</option>
          <option value="lastSeen">Last Seen</option>
          <option value="value">Value</option>
          <option value="confidence">Confidence</option>
        </select>
      </div>
    </div>
  );
}
