import React from "react";
import { ConnectionStatus, type ConnectionState } from "@0x0-gen/ui";
import { useProject } from "../hooks/use-project.js";

interface HeaderProps {
  connectionState: ConnectionState;
  uptime: number | null;
}

export function Header({ connectionState, uptime }: HeaderProps) {
  const { activeProject } = useProject();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: "48px",
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: "#111",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>0x0-Gen Hub</span>
        {activeProject && (
          <span style={{ fontSize: "13px", color: "#888" }}>/ {activeProject.name}</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <ConnectionStatus state={connectionState} />
        {uptime !== null && (
          <span style={{ fontSize: "11px", color: "#666" }}>
            {Math.round(uptime / 1000)}s
          </span>
        )}
      </div>
    </header>
  );
}
