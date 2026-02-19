import React from "react";
import type { ImportProgress as Progress } from "../hooks/useImport.js";

export interface ImportProgressProps {
  progress: Progress;
}

export function ImportProgress({ progress }: ImportProgressProps) {
  if (!progress.active && progress.percent === 0) return null;

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ccc" }}>
          {progress.active ? `Importing: ${progress.currentFile}` : "Import complete"}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}>
          {progress.processed}/{progress.total} files
        </span>
      </div>
      <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress.percent}%`,
            background: progress.active ? "#22c55e" : "#22c55e88",
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      {progress.active && (
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#555", marginTop: 4 }}>
          {progress.percent}% complete
        </div>
      )}
    </div>
  );
}
