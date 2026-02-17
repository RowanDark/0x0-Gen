import React, { useState } from "react";

interface ProxyControlsProps {
  running: boolean;
  port: number;
  captureCount: number;
  loading: boolean;
  error: string | null;
  onStart: (config?: { port?: number }) => Promise<void>;
  onStop: () => Promise<void>;
  onClearHistory: () => Promise<void>;
}

export function ProxyControls({
  running,
  port,
  captureCount,
  loading,
  error,
  onStart,
  onStop,
  onClearHistory,
}: ProxyControlsProps) {
  const [portInput, setPortInput] = useState(String(port));

  const handleToggle = async () => {
    if (running) {
      await onStop();
    } else {
      const p = parseInt(portInput, 10);
      await onStart({ port: isNaN(p) ? 8080 : p });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        borderBottom: "1px solid #333",
        backgroundColor: "#111",
      }}
    >
      <button
        onClick={handleToggle}
        disabled={loading}
        style={{
          padding: "6px 16px",
          backgroundColor: running ? "#c0392b" : "#27ae60",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "monospace",
          fontSize: "13px",
          fontWeight: "bold",
        }}
      >
        {loading ? "..." : running ? "Stop" : "Start"}
      </button>

      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
        <span style={{ color: "#888" }}>Port:</span>
        <input
          type="number"
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          disabled={running}
          style={{
            width: "70px",
            padding: "4px 8px",
            backgroundColor: "#1a1a1a",
            color: "#ccc",
            border: "1px solid #444",
            borderRadius: "3px",
            fontFamily: "monospace",
            fontSize: "13px",
          }}
        />
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: running ? "#27ae60" : "#c0392b",
            display: "inline-block",
          }}
        />
        <span style={{ color: "#888" }}>{running ? "Running" : "Stopped"}</span>
      </div>

      <span style={{ color: "#888", fontSize: "13px" }}>
        Captures: <span style={{ color: "#ccc" }}>{captureCount}</span>
      </span>

      <div style={{ flex: 1 }} />

      <button
        onClick={onClearHistory}
        style={{
          padding: "4px 12px",
          backgroundColor: "transparent",
          color: "#888",
          border: "1px solid #444",
          borderRadius: "3px",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        Clear History
      </button>

      {error && <span style={{ color: "#e74c3c", fontSize: "12px" }}>{error}</span>}
    </div>
  );
}
