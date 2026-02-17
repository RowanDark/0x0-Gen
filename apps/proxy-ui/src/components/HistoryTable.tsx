import React, { useRef, useEffect, useCallback, useState } from "react";
import type { CapturedExchange } from "@0x0-gen/sdk";

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return "#27ae60";
  if (code >= 300 && code < 400) return "#3498db";
  if (code >= 400 && code < 500) return "#e67e22";
  if (code >= 500) return "#e74c3c";
  return "#888";
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "#3498db";
    case "POST":
      return "#27ae60";
    case "PUT":
      return "#e67e22";
    case "DELETE":
      return "#e74c3c";
    case "PATCH":
      return "#9b59b6";
    default:
      return "#888";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 30;

interface HistoryTableProps {
  exchanges: CapturedExchange[];
  selectedId: string | null;
  onSelect: (exchange: CapturedExchange) => void;
}

export function HistoryTable({ exchanges, selectedId, onSelect }: HistoryTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setContainerHeight(el.clientHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = exchanges.length * ROW_HEIGHT;
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1);
  const endIndex = Math.min(exchanges.length, startIndex + visibleCount);
  const visibleExchanges = exchanges.slice(startIndex, endIndex);

  const headerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "40px 60px 1fr 1fr 60px 70px 70px 80px",
    gap: "4px",
    padding: "0 8px",
    height: `${HEADER_HEIGHT}px`,
    lineHeight: `${HEADER_HEIGHT}px`,
    fontSize: "11px",
    color: "#888",
    borderBottom: "1px solid #333",
    backgroundColor: "#111",
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={headerStyle}>
        <span>#</span>
        <span>Method</span>
        <span>Host</span>
        <span>Path</span>
        <span>Status</span>
        <span>Size</span>
        <span>Time</span>
        <span>Timestamp</span>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: "auto" }}
      >
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          {visibleExchanges.map((ex, i) => {
            const index = startIndex + i;
            const isSelected = ex.id === selectedId;
            return (
              <div
                key={ex.id}
                onClick={() => onSelect(ex)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 60px 1fr 1fr 60px 70px 70px 80px",
                  gap: "4px",
                  padding: "0 8px",
                  height: `${ROW_HEIGHT}px`,
                  lineHeight: `${ROW_HEIGHT}px`,
                  fontSize: "12px",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#1a3a5c" : index % 2 === 0 ? "#0a0a0a" : "#111",
                  borderBottom: "1px solid #1a1a1a",
                  position: "absolute",
                  top: `${index * ROW_HEIGHT}px`,
                  left: 0,
                  right: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#555" }}>{index + 1}</span>
                <span style={{ color: methodColor(ex.request.method), fontWeight: "bold" }}>
                  {ex.request.method}
                </span>
                <span
                  style={{ color: "#ccc", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {ex.request.host}
                </span>
                <span
                  style={{ color: "#999", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {ex.request.path}
                </span>
                <span
                  style={{
                    color: ex.response ? statusColor(ex.response.statusCode) : "#555",
                    fontWeight: "bold",
                  }}
                >
                  {ex.response?.statusCode ?? "---"}
                </span>
                <span style={{ color: "#888" }}>
                  {ex.response ? formatSize(ex.response.contentLength) : "-"}
                </span>
                <span style={{ color: "#888" }}>
                  {ex.response ? formatDuration(ex.response.duration) : "-"}
                </span>
                <span style={{ color: "#555" }}>{formatTime(ex.request.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
