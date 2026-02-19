import React, { useEffect } from "react";
import type { ReconImport } from "@0x0-gen/sdk";

export interface RecentImportsProps {
  imports: ReconImport[];
  onLoadImports: () => void;
}

export function RecentImports({ imports, onLoadImports }: RecentImportsProps) {
  useEffect(() => {
    onLoadImports();
  }, []);

  const recent = imports
    .sort((a, b) => b.importedAt - a.importedAt)
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div style={{ padding: 12, color: "#555", fontFamily: "monospace", fontSize: 12 }}>
        No imports yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {recent.map((imp) => (
        <div
          key={imp.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 10px",
            background: "#111",
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#22c55e" }}>{imp.source}</span>
            <span style={{ color: "#888" }}>{imp.filename}</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#ccc" }}>
              {imp.stats.total} total / {imp.stats.new} new
            </span>
            {imp.stats.errors > 0 && (
              <span style={{ color: "#ef4444" }}>{imp.stats.errors} errors</span>
            )}
            <span style={{ color: "#555" }}>
              {formatDate(imp.importedAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}
