import React, { useState, useCallback } from "react";
import { useReconProject } from "../hooks/useReconProject.js";

export interface BulkActionsProps {
  selectedCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onRefresh: () => void;
  addToast?: (message: string, type: "info" | "success" | "error") => void;
}

export function BulkActions({ selectedCount, selectedIds, onClearSelection, onRefresh, addToast }: BulkActionsProps) {
  const { activeProject, gateway } = useReconProject();
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const ids = Array.from(selectedIds);

  const handleAddTag = useCallback(async () => {
    if (!activeProject || !tagInput.trim()) return;
    setBusy(true);
    try {
      await gateway.bulkTagEntities(activeProject.id, ids, tagInput.trim());
      addToast?.(`Added tag "${tagInput}" to ${ids.length} entities`, "success");
      setTagInput("");
      setShowTagInput(false);
      onRefresh();
    } catch (error) {
      console.error("[BulkActions] Failed to add tag:", error);
      addToast?.("Failed to add tag", "error");
    } finally {
      setBusy(false);
    }
  }, [activeProject, gateway, ids, tagInput, onRefresh, addToast]);

  const handleDelete = useCallback(async () => {
    if (!activeProject) return;
    setBusy(true);
    try {
      await gateway.bulkDeleteEntities(activeProject.id, ids);
      addToast?.(`Deleted ${ids.length} entities`, "success");
      setShowDeleteConfirm(false);
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error("[BulkActions] Failed to delete entities:", error);
      addToast?.("Failed to delete entities", "error");
    } finally {
      setBusy(false);
    }
  }, [activeProject, gateway, ids, onClearSelection, onRefresh, addToast]);

  const handleExport = useCallback(async (format: "json" | "csv") => {
    if (!activeProject) return;
    setBusy(true);
    try {
      const data = await gateway.exportEntities(activeProject.id, ids, format);
      const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entities-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast?.(`Exported ${ids.length} entities as ${format.toUpperCase()}`, "success");
    } catch (error) {
      console.error("[BulkActions] Failed to export entities:", error);
      addToast?.(`Failed to export as ${format.toUpperCase()}`, "error");
    } finally {
      setBusy(false);
    }
  }, [activeProject, gateway, ids, addToast]);

  const btnStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 3,
    color: "#ccc",
    cursor: busy ? "wait" : "pointer",
    fontFamily: "monospace",
    fontSize: 10,
    padding: "4px 10px",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#111",
        borderBottom: "1px solid #222",
        fontSize: 11,
        fontFamily: "monospace",
      }}
    >
      <span style={{ color: "#22c55e" }}>{selectedCount} selected</span>
      <button onClick={onClearSelection} style={{ ...btnStyle, fontSize: 9, color: "#888" }}>
        Clear
      </button>

      <div style={{ width: 1, height: 16, background: "#333" }} />

      {/* Tag action */}
      {!showTagInput ? (
        <button onClick={() => setShowTagInput(true)} style={btnStyle}>
          Add Tag
        </button>
      ) : (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="Tag name"
            autoFocus
            style={{
              background: "#0a0a0a",
              border: "1px solid #333",
              borderRadius: 3,
              color: "#ccc",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "3px 6px",
              outline: "none",
              width: 100,
            }}
          />
          <button onClick={handleAddTag} style={{ ...btnStyle, color: "#22c55e" }} disabled={busy}>
            Apply
          </button>
          <button onClick={() => { setShowTagInput(false); setTagInput(""); }} style={btnStyle}>
            Cancel
          </button>
        </div>
      )}

      {/* Delete action */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{ ...btnStyle, color: "#ef4444" }}
        >
          Delete
        </button>
      ) : (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ color: "#ef4444", fontSize: 10 }}>Delete {selectedCount} entities?</span>
          <button onClick={handleDelete} style={{ ...btnStyle, background: "#ef444422", color: "#ef4444" }} disabled={busy}>
            Confirm
          </button>
          <button onClick={() => setShowDeleteConfirm(false)} style={btnStyle}>
            Cancel
          </button>
        </div>
      )}

      {/* Export */}
      <button onClick={() => handleExport("json")} style={btnStyle} disabled={busy}>
        Export JSON
      </button>
      <button onClick={() => handleExport("csv")} style={btnStyle} disabled={busy}>
        Export CSV
      </button>
    </div>
  );
}
