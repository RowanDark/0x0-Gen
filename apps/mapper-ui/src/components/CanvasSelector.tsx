import React, { useState } from "react";
import type { MapperCanvas } from "@0x0-gen/sdk";

interface CanvasSelectorProps {
  canvases: MapperCanvas[];
  activeCanvasId: string | null;
  onSelect: (canvasId: string) => void;
  onCreate: (name: string) => void;
  onDelete: (canvasId: string) => void;
}

export function CanvasSelector({
  canvases,
  activeCanvasId,
  onSelect,
  onCreate,
  onDelete,
}: CanvasSelectorProps) {
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    const name = newName.trim();
    if (name) {
      onCreate(name);
      setNewName("");
      setShowCreate(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        fontFamily: "monospace",
        color: "#e5e7eb",
        background: "#0a0a0a",
      }}
    >
      <div style={{ maxWidth: 400, width: "100%", padding: 24 }}>
        <h2 style={{ color: "#22c55e", fontSize: 18, marginBottom: 16 }}>
          Visual Mapper
        </h2>

        {canvases.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8 }}>
              Select a canvas:
            </div>
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: canvas.id === activeCanvasId ? "#22c55e15" : "#1a1a1a",
                  border: `1px solid ${canvas.id === activeCanvasId ? "#22c55e" : "#333"}`,
                  borderRadius: 4,
                  marginBottom: 4,
                  cursor: "pointer",
                }}
                onClick={() => onSelect(canvas.id)}
              >
                <span style={{ flex: 1 }}>{canvas.name}</span>
                <span style={{ color: "#6b7280", fontSize: 10, marginRight: 8 }}>
                  {new Date(canvas.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(canvas.id); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {showCreate ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Canvas name..."
              autoFocus
              style={{
                flex: 1,
                padding: "6px 10px",
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 4,
                color: "#e5e7eb",
                fontFamily: "monospace",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              onClick={handleCreate}
              style={{
                padding: "6px 16px",
                background: "#22c55e",
                color: "#000",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                padding: "6px 12px",
                background: "#333",
                color: "#e5e7eb",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              width: "100%",
              padding: "8px 16px",
              background: "#22c55e",
              color: "#000",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            New Canvas
          </button>
        )}
      </div>
    </div>
  );
}
