import React, { useRef, useEffect, useCallback, useState } from "react";
import type { ReconEntity } from "@0x0-gen/sdk";
import { EntityRow } from "./EntityRow.js";

export interface EntityTableProps {
  entities: ReconEntity[];
  total: number;
  selectedIds: Set<string>;
  loading: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEntityClick: (id: string) => void;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 32;
const OVERSCAN = 10;

export function EntityTable({
  entities,
  total,
  selectedIds,
  loading,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onEntityClick,
  onLoadMore,
}: EntityTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);

    // Load more when near bottom
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 200) {
      if (entities.length < total && !loading) {
        onLoadMore();
      }
    }
  }, [entities.length, total, loading, onLoadMore]);

  const totalHeight = entities.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    entities.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleEntities = entities.slice(startIndex, endIndex);

  const allSelected = entities.length > 0 && selectedIds.size === entities.length;

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderBottom: "1px solid #333",
    fontSize: 10,
    fontFamily: "monospace",
    color: "#666",
    background: "#0f0f0f",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={headerStyle}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => (allSelected ? onClearSelection() : onSelectAll())}
          style={{ accentColor: "#22c55e" }}
        />
        <span style={{ width: 16 }} />
        <span style={{ flex: 1 }}>VALUE</span>
        <span style={{ width: 70 }}>TYPE</span>
        <span style={{ width: 80 }}>SOURCES</span>
        <span style={{ width: 80 }}>TAGS</span>
        <span style={{ width: 70 }}>FIRST SEEN</span>
      </div>

      {/* Virtual scrolled body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: "auto" }}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ position: "absolute", top: startIndex * ROW_HEIGHT, width: "100%" }}>
            {visibleEntities.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                selected={selectedIds.has(entity.id)}
                onToggleSelect={() => onToggleSelect(entity.id)}
                onClick={() => onEntityClick(entity.id)}
              />
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ padding: 12, textAlign: "center", color: "#555", fontFamily: "monospace", fontSize: 11 }}>
            Loading...
          </div>
        )}

        {!loading && entities.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#555", fontFamily: "monospace", fontSize: 12 }}>
            No entities found
          </div>
        )}
      </div>
    </div>
  );
}
