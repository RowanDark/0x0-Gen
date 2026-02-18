import React from "react";
import type { IntruderOptions } from "@0x0-gen/sdk";

interface AttackOptionsProps {
  options: IntruderOptions;
  onChange: (options: IntruderOptions) => void;
}

export function AttackOptions({ options, onChange }: AttackOptionsProps) {
  const update = (partial: Partial<IntruderOptions>) => {
    onChange({ ...options, ...partial });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ borderBottom: "1px solid #333", paddingBottom: 8 }}>
        <span style={{ color: "#888", fontSize: "11px" }}>Options</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Concurrency */}
        <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
          <label style={{ color: "#aaa", fontSize: "11px", width: 100 }}>
            Concurrency
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={options.concurrency}
            onChange={(e) => update({ concurrency: parseInt(e.target.value, 10) })}
            style={{ flex: 1 }}
          />
          <span style={{ color: "#ccc", fontSize: "11px", width: 24, textAlign: "right" }}>
            {options.concurrency}
          </span>
        </div>

        {/* Delay */}
        <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
          <label style={{ color: "#aaa", fontSize: "11px", width: 100 }}>
            Delay (ms)
          </label>
          <input
            type="number"
            min={0}
            value={options.delayMs}
            onChange={(e) => update({ delayMs: parseInt(e.target.value, 10) || 0 })}
            style={numInputStyle}
          />
        </div>

        {/* Timeout */}
        <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
          <label style={{ color: "#aaa", fontSize: "11px", width: 100 }}>
            Timeout (ms)
          </label>
          <input
            type="number"
            min={0}
            value={options.timeout}
            onChange={(e) => update({ timeout: parseInt(e.target.value, 10) || 30000 })}
            style={numInputStyle}
          />
        </div>

        {/* Follow redirects */}
        <label style={{ alignItems: "center", color: "#aaa", display: "flex", fontSize: "11px", gap: 8 }}>
          <input
            type="checkbox"
            checked={options.followRedirects}
            onChange={(e) => update({ followRedirects: e.target.checked })}
          />
          Follow redirects
        </label>

        {/* Stop on error */}
        <label style={{ alignItems: "center", color: "#aaa", display: "flex", fontSize: "11px", gap: 8 }}>
          <input
            type="checkbox"
            checked={options.stopOnError}
            onChange={(e) => update({ stopOnError: e.target.checked })}
          />
          Stop on error
        </label>
      </div>
    </div>
  );
}

const numInputStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 2,
  color: "#ccc",
  fontSize: "11px",
  padding: "2px 4px",
  width: 80,
};
