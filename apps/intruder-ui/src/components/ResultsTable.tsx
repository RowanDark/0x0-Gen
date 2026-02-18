import React, { useRef, useCallback, useMemo } from "react";
import type { IntruderResult } from "@0x0-gen/sdk";
import type { SortField, SortDirection } from "../hooks/useResults.js";

interface ResultsTableProps {
  results: IntruderResult[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return "#4a8";
  if (code >= 300 && code < 400) return "#88f";
  if (code >= 400 && code < 500) return "#c84";
  if (code >= 500) return "#c44";
  return "#888";
}

const ROW_HEIGHT = 26;
const VISIBLE_BUFFER = 10;

export function ResultsTable({
  results,
  sortField,
  sortDirection,
  onSort,
  onSelect,
  selectedId,
}: ResultsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { visibleResults, startIndex, totalHeight } = useMemo(() => {
    const container = containerRef.current;
    const viewportHeight = container?.clientHeight ?? 400;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + VISIBLE_BUFFER * 2;
    const end = Math.min(results.length, start + visibleCount);

    return {
      visibleResults: results.slice(start, end),
      startIndex: start,
      totalHeight: results.length * ROW_HEIGHT,
    };
  }, [results, scrollTop]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " +" : " -";
  };

  const handleExportCSV = useCallback(() => {
    const headers = ["#", "Payloads", "Status", "Length", "Duration (ms)", "Error"];
    const rows = results.map((r) => [
      r.requestIndex,
      Object.values(r.payloads).join(", "),
      r.response?.statusCode ?? "",
      r.response?.contentLength ?? "",
      r.duration,
      r.error ?? "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intruder-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 8,
          marginBottom: 4,
          paddingBottom: 4,
        }}
      >
        <span style={{ color: "#888", fontSize: "11px" }}>
          Results ({results.length})
        </span>
        <button onClick={handleExportCSV} style={smallBtnStyle}>
          Export CSV
        </button>
      </div>

      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #333",
          color: "#888",
          display: "flex",
          fontSize: "10px",
          fontWeight: "bold",
          padding: "4px 0",
        }}
      >
        <span
          onClick={() => onSort("requestIndex")}
          style={{ ...colStyle, cursor: "pointer", width: 40 }}
        >
          #{sortIndicator("requestIndex")}
        </span>
        <span style={{ ...colStyle, flex: 2 }}>Payloads</span>
        <span
          onClick={() => onSort("statusCode")}
          style={{ ...colStyle, cursor: "pointer", width: 60 }}
        >
          Status{sortIndicator("statusCode")}
        </span>
        <span
          onClick={() => onSort("contentLength")}
          style={{ ...colStyle, cursor: "pointer", width: 70 }}
        >
          Length{sortIndicator("contentLength")}
        </span>
        <span
          onClick={() => onSort("duration")}
          style={{ ...colStyle, cursor: "pointer", width: 60 }}
        >
          Time{sortIndicator("duration")}
        </span>
      </div>

      {/* Virtual scrolling container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: "auto" }}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleResults.map((result, i) => (
            <div
              key={result.id}
              onClick={() => onSelect(result.id)}
              style={{
                alignItems: "center",
                background:
                  selectedId === result.id ? "#1a2a3a" : "transparent",
                borderBottom: "1px solid #1a1a1a",
                cursor: "pointer",
                display: "flex",
                fontSize: "11px",
                height: ROW_HEIGHT,
                left: 0,
                position: "absolute",
                right: 0,
                top: (startIndex + i) * ROW_HEIGHT,
              }}
            >
              <span style={{ ...colStyle, color: "#666", width: 40 }}>
                {result.requestIndex}
              </span>
              <span
                style={{
                  ...colStyle,
                  color: "#aaa",
                  flex: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {Object.values(result.payloads).join(", ")}
              </span>
              <span
                style={{
                  ...colStyle,
                  color: result.response
                    ? statusColor(result.response.statusCode)
                    : "#c44",
                  width: 60,
                }}
              >
                {result.response?.statusCode ?? (result.error ? "ERR" : "-")}
              </span>
              <span style={{ ...colStyle, color: "#888", width: 70 }}>
                {result.response?.contentLength?.toLocaleString() ?? "-"}
              </span>
              <span style={{ ...colStyle, color: "#888", width: 60 }}>
                {result.duration}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const colStyle: React.CSSProperties = {
  padding: "0 4px",
};

const smallBtnStyle: React.CSSProperties = {
  background: "#222",
  border: "1px solid #333",
  borderRadius: 2,
  color: "#aaa",
  cursor: "pointer",
  fontSize: "10px",
  marginLeft: "auto",
  padding: "1px 6px",
};
