import React from "react";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";

interface HistoryEntryProps {
  entry: RepeaterHistoryEntry;
  selected: boolean;
  onClick: () => void;
}

function statusColor(code: number | undefined): string {
  if (!code) return "#cc4444";
  if (code >= 500) return "#cc4444";
  if (code >= 400) return "#cc8844";
  if (code >= 300) return "#cccc44";
  if (code >= 200) return "#44cc88";
  return "#888";
}

function methodColor(method: string): string {
  switch (method) {
    case "GET": return "#44cc88";
    case "POST": return "#4488ff";
    case "PUT": return "#ccaa44";
    case "DELETE": return "#cc4444";
    case "PATCH": return "#cc88ff";
    default: return "#888";
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

function truncateUrl(url: string, max = 40): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > max ? path.slice(0, max) + "…" : path;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

export function HistoryEntryRow({ entry, selected, onClick }: HistoryEntryProps) {
  return (
    <div
      onClick={onClick}
      title={entry.request.url}
      style={{
        alignItems: "center",
        backgroundColor: selected ? "#1a2a22" : "transparent",
        borderBottom: "1px solid #1a1a1a",
        cursor: "pointer",
        display: "grid",
        fontFamily: "monospace",
        fontSize: "11px",
        gap: 6,
        gridTemplateColumns: "40px 40px 1fr 45px",
        padding: "4px 8px",
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#111";
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
      }}
    >
      <span style={{ color: methodColor(entry.request.method), fontWeight: "bold" }}>
        {entry.request.method.slice(0, 4)}
      </span>
      <span style={{ color: statusColor(entry.response?.statusCode) }}>
        {entry.response?.statusCode ?? (entry.error ? "ERR" : "---")}
      </span>
      <span
        style={{ color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {truncateUrl(entry.request.url)}
      </span>
      <span style={{ color: "#555", textAlign: "right" }}>{entry.duration}ms</span>
    </div>
  );
}
