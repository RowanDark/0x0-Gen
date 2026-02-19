import React from "react";
import type { ReconImport } from "@0x0-gen/sdk";

export interface ImportHistoryProps {
  imports: ReconImport[];
}

export function ImportHistory({ imports }: ImportHistoryProps) {
  const sorted = [...imports].sort((a, b) => b.importedAt - a.importedAt);

  if (sorted.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#555", fontFamily: "monospace", fontSize: 12 }}>
        No import history
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 400, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>SOURCE</th>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>FILE</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>TOTAL</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>NEW</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>DUPES</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>ERRORS</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#666", fontWeight: 400, fontSize: 10 }}>DATE</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((imp) => (
            <tr key={imp.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
              <td style={{ padding: "6px 8px", color: "#22c55e" }}>{imp.source}</td>
              <td style={{ padding: "6px 8px", color: "#ccc", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {imp.filename}
              </td>
              <td style={{ padding: "6px 8px", color: "#ccc", textAlign: "right" }}>{imp.stats.total}</td>
              <td style={{ padding: "6px 8px", color: "#22c55e", textAlign: "right" }}>{imp.stats.new}</td>
              <td style={{ padding: "6px 8px", color: "#888", textAlign: "right" }}>{imp.stats.duplicates}</td>
              <td style={{ padding: "6px 8px", color: imp.stats.errors > 0 ? "#ef4444" : "#888", textAlign: "right" }}>
                {imp.stats.errors}
              </td>
              <td style={{ padding: "6px 8px", color: "#555", textAlign: "right" }}>
                {new Date(imp.importedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
