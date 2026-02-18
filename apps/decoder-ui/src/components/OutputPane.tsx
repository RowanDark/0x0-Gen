import React, { useState } from "react";
import type { TransformResult } from "@0x0-gen/sdk";

interface OutputPaneProps {
  result: TransformResult | null;
  running: boolean;
  onUseAsInput: () => void;
}

export function OutputPane({ result, running, onUseAsInput }: OutputPaneProps) {
  const [showSteps, setShowSteps] = useState(false);

  const output = result?.output ?? "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // Clipboard not available
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decoder-output.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isJson = (() => {
    try {
      if (output.startsWith("{") || output.startsWith("[")) {
        JSON.parse(output);
        return true;
      }
    } catch {
      // Not JSON
    }
    return false;
  })();

  const displayOutput = isJson ? JSON.stringify(JSON.parse(output), null, 2) : output;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#555", fontSize: "10px", textTransform: "uppercase", letterSpacing: 1 }}>
          Output
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleCopy} style={btnStyle} disabled={!output} title="Copy to clipboard">
            Copy
          </button>
          <button onClick={onUseAsInput} style={btnStyle} disabled={!output} title="Use output as input">
            Use as Input
          </button>
          <button onClick={handleDownload} style={btnStyle} disabled={!output} title="Download as file">
            Download
          </button>
        </div>
      </div>

      <textarea
        value={running ? "Running..." : displayOutput}
        readOnly
        placeholder="Output will appear here..."
        style={{
          background: "#0d0d0d",
          border: `1px solid ${result && !result.success ? "#cc4444" : "#333"}`,
          borderRadius: 4,
          color: result && !result.success ? "#cc6666" : "#eee",
          flex: 1,
          fontFamily: "monospace",
          fontSize: "13px",
          minHeight: 0,
          outline: "none",
          padding: 10,
          resize: "none",
        }}
      />

      {result && !result.success && result.error && (
        <div style={{ color: "#cc4444", fontSize: "11px", marginTop: 4, flexShrink: 0 }}>
          Error: {result.error}
        </div>
      )}

      {result && result.steps.length > 0 && (
        <div style={{ marginTop: 6, flexShrink: 0 }}>
          <button
            onClick={() => setShowSteps(!showSteps)}
            style={{
              ...btnStyle,
              marginBottom: 4,
            }}
          >
            {showSteps ? "Hide" : "Show"} Steps ({result.steps.length})
          </button>
          {showSteps && (
            <div style={{ maxHeight: 200, overflow: "auto" }}>
              {result.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    background: step.success ? "#0a1a0a" : "#1a0a0a",
                    border: `1px solid ${step.success ? "#1a3a1a" : "#3a1a1a"}`,
                    borderRadius: 3,
                    fontSize: "11px",
                    marginBottom: 3,
                    padding: "4px 8px",
                  }}
                >
                  <div style={{ color: "#888" }}>
                    Step {i + 1}: {step.type} ({step.direction})
                    {step.success ? (
                      <span style={{ color: "#4a4" }}> OK</span>
                    ) : (
                      <span style={{ color: "#a44" }}> FAIL: {step.error}</span>
                    )}
                  </div>
                  <div style={{ color: "#666", fontSize: "10px", marginTop: 2 }}>
                    {step.input.slice(0, 80)}
                    {step.input.length > 80 ? "..." : ""} → {step.output.slice(0, 80)}
                    {step.output.length > 80 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: 3,
  color: "#888",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "2px 8px",
};
