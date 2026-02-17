import React from "react";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const STATUS_GROUPS = [
  { label: "2xx", min: 200, max: 299 },
  { label: "3xx", min: 300, max: 399 },
  { label: "4xx", min: 400, max: 499 },
  { label: "5xx", min: 500, max: 599 },
];

export interface FilterState {
  search: string;
  method: string | null;
  statusGroup: string | null;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 16px",
        borderBottom: "1px solid #333",
        backgroundColor: "#0d0d0d",
      }}
    >
      <input
        type="text"
        placeholder="Search host, path, headers..."
        value={filters.search}
        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        style={{
          flex: 1,
          maxWidth: "300px",
          padding: "4px 8px",
          backgroundColor: "#1a1a1a",
          color: "#ccc",
          border: "1px solid #444",
          borderRadius: "3px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      />

      <select
        value={filters.method ?? ""}
        onChange={(e) =>
          onFilterChange({ ...filters, method: e.target.value || null })
        }
        style={{
          padding: "4px 8px",
          backgroundColor: "#1a1a1a",
          color: "#ccc",
          border: "1px solid #444",
          borderRadius: "3px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <option value="">All Methods</option>
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={filters.statusGroup ?? ""}
        onChange={(e) =>
          onFilterChange({ ...filters, statusGroup: e.target.value || null })
        }
        style={{
          padding: "4px 8px",
          backgroundColor: "#1a1a1a",
          color: "#ccc",
          border: "1px solid #444",
          borderRadius: "3px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <option value="">All Status</option>
        {STATUS_GROUPS.map((g) => (
          <option key={g.label} value={g.label}>
            {g.label}
          </option>
        ))}
      </select>

      {(filters.search || filters.method || filters.statusGroup) && (
        <button
          onClick={() =>
            onFilterChange({ search: "", method: null, statusGroup: null })
          }
          style={{
            padding: "4px 8px",
            backgroundColor: "transparent",
            color: "#888",
            border: "1px solid #444",
            borderRadius: "3px",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "11px",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

export function applyFilters(
  exchanges: { request: { method: string; host: string; path: string; headers: Record<string, string>; body: string | null }; response: { statusCode: number } | null }[],
  filters: FilterState,
) {
  return exchanges.filter((ex) => {
    if (filters.method && ex.request.method !== filters.method) return false;

    if (filters.statusGroup && ex.response) {
      const code = ex.response.statusCode;
      const group = STATUS_GROUPS.find((g) => g.label === filters.statusGroup);
      if (group && (code < group.min || code > group.max)) return false;
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const searchable = [
        ex.request.host,
        ex.request.path,
        ex.request.body ?? "",
        ...Object.entries(ex.request.headers).map(([k, v]) => `${k}: ${v}`),
      ].join(" ").toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    return true;
  });
}
