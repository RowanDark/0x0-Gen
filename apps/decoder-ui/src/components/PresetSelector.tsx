import React, { useState } from "react";
import type { DecoderPreset, TransformStep } from "@0x0-gen/sdk";

interface PresetSelectorProps {
  presets: (DecoderPreset & { isBuiltin?: boolean })[];
  onLoadPreset: (steps: TransformStep[]) => void;
}

export function PresetSelector({ presets, onLoadPreset }: PresetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const builtinPresets = presets.filter((p) => p.isBuiltin);
  const customPresets = presets.filter((p) => !p.isBuiltin);

  const filtered = (list: typeof presets) =>
    list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
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
        Presets ▾
      </button>

      {open && (
        <div
          style={{
            background: "#111",
            border: "1px solid #333",
            borderRadius: 4,
            left: 0,
            maxHeight: 300,
            minWidth: 220,
            overflow: "auto",
            position: "absolute",
            top: "100%",
            zIndex: 100,
          }}
        >
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              style={{
                background: "#0a0a0a",
                border: "1px solid #333",
                borderRadius: 3,
                color: "#ccc",
                fontFamily: "monospace",
                fontSize: "11px",
                outline: "none",
                padding: "3px 6px",
                width: "100%",
              }}
            />
          </div>

          {filtered(builtinPresets).length > 0 && (
            <>
              <div style={{ color: "#555", fontSize: "9px", padding: "6px 8px 2px" }}>
                BUILT-IN
              </div>
              {filtered(builtinPresets).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadPreset(preset.steps);
                    setOpen(false);
                    setSearch("");
                  }}
                  style={presetItemStyle}
                >
                  {preset.name}
                  <span style={{ color: "#444", fontSize: "9px", marginLeft: 6 }}>
                    {preset.steps.length} step{preset.steps.length !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </>
          )}

          {filtered(customPresets).length > 0 && (
            <>
              <div style={{ color: "#555", fontSize: "9px", padding: "6px 8px 2px" }}>
                CUSTOM
              </div>
              {filtered(customPresets).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadPreset(preset.steps);
                    setOpen(false);
                    setSearch("");
                  }}
                  style={presetItemStyle}
                >
                  {preset.name}
                  <span style={{ color: "#444", fontSize: "9px", marginLeft: 6 }}>
                    {preset.steps.length} step{preset.steps.length !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </>
          )}

          {presets.length === 0 && (
            <div style={{ color: "#444", fontSize: "11px", padding: 12, textAlign: "center" }}>
              No presets available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const presetItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderBottom: "1px solid #1a1a1a",
  color: "#aaa",
  cursor: "pointer",
  display: "block",
  fontFamily: "monospace",
  fontSize: "11px",
  padding: "6px 8px",
  textAlign: "left",
  width: "100%",
};
