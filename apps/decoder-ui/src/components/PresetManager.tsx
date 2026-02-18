import React, { useState } from "react";
import type { DecoderPreset, TransformStep } from "@0x0-gen/sdk";

interface PresetManagerProps {
  presets: (DecoderPreset & { isBuiltin?: boolean })[];
  currentSteps: TransformStep[];
  onSavePreset: (name: string, steps: TransformStep[]) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onLoadPreset: (steps: TransformStep[]) => void;
}

export function PresetManager({
  presets,
  currentSteps,
  onSavePreset,
  onDeletePreset,
  onLoadPreset,
}: PresetManagerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const customPresets = presets.filter((p) => !p.isBuiltin);

  const handleSave = async () => {
    if (!newName.trim() || currentSteps.length === 0) return;
    setSaving(true);
    try {
      await onSavePreset(newName.trim(), currentSteps);
      setNewName("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await onDeletePreset(id);
    setConfirmDelete(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 3,
          color: "#aaa",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "11px",
          padding: "4px 12px",
        }}
      >
        Manage
      </button>
    );
  }

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #333",
        borderRadius: 4,
        padding: 12,
        position: "absolute",
        right: 0,
        top: "100%",
        minWidth: 280,
        zIndex: 100,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ color: "#888", fontSize: "11px" }}>Manage Presets</span>
        <button
          onClick={() => {
            setOpen(false);
            setConfirmDelete(null);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#555",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ×
        </button>
      </div>

      {/* Save current pipeline as preset */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
          }}
          placeholder="Preset name..."
          style={{
            background: "#0a0a0a",
            border: "1px solid #333",
            borderRadius: 3,
            color: "#ccc",
            flex: 1,
            fontFamily: "monospace",
            fontSize: "11px",
            outline: "none",
            padding: "4px 6px",
          }}
        />
        <button
          onClick={() => void handleSave()}
          disabled={saving || !newName.trim() || currentSteps.length === 0}
          style={{
            background: "#0a2a1a",
            border: "1px solid #1a4a2a",
            borderRadius: 3,
            color: currentSteps.length > 0 ? "#44cc88" : "#555",
            cursor: currentSteps.length > 0 ? "pointer" : "default",
            fontFamily: "monospace",
            fontSize: "10px",
            padding: "4px 10px",
          }}
        >
          {saving ? "..." : "Save"}
        </button>
      </div>

      {/* Custom presets list */}
      {customPresets.length === 0 ? (
        <div style={{ color: "#444", fontSize: "11px", textAlign: "center", padding: 8 }}>
          No custom presets
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflow: "auto" }}>
          {customPresets.map((preset) => (
            <div
              key={preset.id}
              style={{
                alignItems: "center",
                borderBottom: "1px solid #1a1a1a",
                display: "flex",
                gap: 6,
                padding: "4px 0",
              }}
            >
              <button
                onClick={() => onLoadPreset(preset.steps)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#aaa",
                  cursor: "pointer",
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: "11px",
                  textAlign: "left",
                }}
              >
                {preset.name}
              </button>
              <button
                onClick={() => void handleDelete(preset.id)}
                style={{
                  background: confirmDelete === preset.id ? "#2a0a0a" : "transparent",
                  border: confirmDelete === preset.id ? "1px solid #4a1a1a" : "none",
                  borderRadius: 3,
                  color: confirmDelete === preset.id ? "#cc4444" : "#555",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  padding: "2px 6px",
                }}
              >
                {confirmDelete === preset.id ? "Confirm?" : "Del"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
