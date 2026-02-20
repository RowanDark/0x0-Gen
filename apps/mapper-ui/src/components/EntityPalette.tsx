import React, { useState, useEffect, useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { ReconEntity } from "@0x0-gen/sdk";
import { TYPE_COLORS } from "./Node.js";

interface EntityPaletteProps {
  gateway: GatewayClient;
  projectId: string;
  onAddEntities: (entityIds: string[]) => void;
}

export function EntityPalette({ gateway, projectId, onAddEntities }: EntityPaletteProps) {
  const [entities, setEntities] = useState<ReconEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const result = await gateway.listReconEntities(projectId, {
        search: search || undefined,
        type: typeFilter || undefined,
        limit: 100,
      });
      setEntities(result.entities);
      setTotal(result.total);
    } catch (error) {
      console.error("[EntityPalette] Failed to load entities:", error);
    } finally {
      setLoading(false);
    }
  }, [gateway, projectId, search, typeFilter]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedIds.size > 0) {
      onAddEntities(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div
      style={{
        width: 280,
        background: "#111",
        borderLeft: "1px solid #222",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #222" }}>
        <div style={{ color: "#22c55e", fontWeight: 600, marginBottom: 6 }}>
          Entity Palette
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entities..."
          style={{
            width: "100%",
            padding: "4px 8px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 3,
            color: "#e5e7eb",
            fontFamily: "monospace",
            fontSize: 11,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            width: "100%",
            marginTop: 4,
            padding: "4px 8px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 3,
            color: "#e5e7eb",
            fontFamily: "monospace",
            fontSize: 11,
            outline: "none",
          }}
        >
          <option value="">All types</option>
          {["domain", "subdomain", "ip", "url", "port", "service", "technology", "email", "vulnerability", "certificate"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {loading && <div style={{ color: "#6b7280", padding: "8px 12px" }}>Loading...</div>}
        {entities.map((entity) => (
          <div
            key={entity.id}
            onClick={() => toggleSelect(entity.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              cursor: "pointer",
              background: selectedIds.has(entity.id) ? "#22c55e15" : "transparent",
              borderLeft: selectedIds.has(entity.id) ? "2px solid #22c55e" : "2px solid transparent",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: TYPE_COLORS[entity.type] || "#6b7280",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#9ca3af", fontSize: 9, width: 60, flexShrink: 0 }}>
              {entity.type}
            </span>
            <span
              style={{
                color: "#e5e7eb",
                fontSize: 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entity.value}
            </span>
          </div>
        ))}
        {!loading && entities.length === 0 && (
          <div style={{ color: "#6b7280", padding: "8px 12px" }}>No entities found</div>
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #222", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#6b7280", fontSize: 10 }}>
          {selectedIds.size} selected / {total} total
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleAdd}
          disabled={selectedIds.size === 0}
          style={{
            padding: "4px 12px",
            background: selectedIds.size > 0 ? "#22c55e" : "#333",
            color: selectedIds.size > 0 ? "#000" : "#6b7280",
            border: "none",
            borderRadius: 3,
            cursor: selectedIds.size > 0 ? "pointer" : "default",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Add to Canvas
        </button>
      </div>
    </div>
  );
}
