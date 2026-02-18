import React, { useState } from "react";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";
import { HistoryEntryRow } from "./HistoryEntry.js";

interface HistoryPanelProps {
  history: RepeaterHistoryEntry[];
  selectedId: string | null;
  onSelect: (entry: RepeaterHistoryEntry) => void;
  onClear: () => void;
}

export function HistoryPanel({ history, selectedId, onSelect, onClear }: HistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        borderLeft: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        width: collapsed ? 28 : 220,
        transition: "width 0.2s ease",
        flexShrink: 0,
        overflow: "hidden",
        backgroundColor: "#0d0d0d",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #333",
          display: "flex",
          flexShrink: 0,
          justifyContent: "space-between",
          padding: "6px 8px",
        }}
      >
        {!collapsed && (
          <>
            <span style={{ color: "#888", fontFamily: "monospace", fontSize: "11px" }}>
              History ({history.length})
            </span>
            <button
              onClick={onClear}
              title="Clear history"
              disabled={history.length === 0}
              style={{
                background: "none",
                border: "none",
                color: history.length === 0 ? "#333" : "#666",
                cursor: history.length === 0 ? "default" : "pointer",
                fontSize: "11px",
                padding: "0 4px",
              }}
            >
              Clear
            </button>
          </>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand history" : "Collapse history"}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            cursor: "pointer",
            fontSize: "14px",
            padding: "0 2px",
            transform: collapsed ? "rotate(180deg)" : "none",
          }}
        >
          ›
        </button>
      </div>

      {/* History list */}
      {!collapsed && (
        <div style={{ flex: 1, overflow: "auto" }}>
          {history.length === 0 ? (
            <div
              style={{
                color: "#444",
                fontFamily: "monospace",
                fontSize: "11px",
                padding: 12,
                textAlign: "center",
              }}
            >
              No history
            </div>
          ) : (
            history.map((entry) => (
              <HistoryEntryRow
                key={entry.id}
                entry={entry}
                selected={selectedId === entry.id}
                onClick={() => onSelect(entry)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
