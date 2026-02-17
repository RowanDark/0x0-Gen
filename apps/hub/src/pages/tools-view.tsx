import React, { useState } from "react";
import { ToolCard } from "@0x0-gen/ui";
import { useTools } from "../hooks/use-tools.js";

export function ToolsView() {
  const { tools, attachToken, generateToken, detachTool } = useTools();
  const [showToken, setShowToken] = useState(false);

  async function handleGenerateToken() {
    await generateToken();
    setShowToken(true);
  }

  return (
    <div style={{ padding: "24px", fontFamily: "monospace" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "18px", color: "#fff", margin: 0 }}>Tools</h2>
        <button
          onClick={handleGenerateToken}
          style={{
            padding: "6px 14px",
            background: "#1a1a2e",
            border: "1px solid #333",
            color: "#ccc",
            fontSize: "12px",
            fontFamily: "monospace",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Generate Attach Token
        </button>
      </div>

      {showToken && attachToken && (
        <div
          style={{
            padding: "12px",
            marginBottom: "16px",
            backgroundColor: "#111",
            border: "1px solid #333",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <div style={{ color: "#888", marginBottom: "4px" }}>Attach Token (single-use):</div>
          <code style={{ color: "#5a5aff", wordBreak: "break-all" }}>{attachToken}</code>
          <div style={{ color: "#555", marginTop: "8px", fontSize: "11px" }}>
            Use this token to attach a standalone tool instance to the Hub.
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}
      >
        {tools.map((tool) => (
          <ToolCard
            key={tool.name}
            name={tool.name}
            status={tool.status}
            onLaunch={() => {
              if (tool.devPort) {
                window.open(`http://localhost:${tool.devPort}`, "_blank");
              }
            }}
            onDetach={tool.status === "attached" ? () => detachTool(tool.name) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
