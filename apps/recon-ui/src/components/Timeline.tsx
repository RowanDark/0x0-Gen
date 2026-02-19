import React, { useState } from "react";
import type { TimelineEntry, TimelineRange } from "../hooks/useTimeline.js";

export interface TimelineProps {
  data: TimelineEntry[];
  range: TimelineRange;
  onRangeChange: (range: TimelineRange) => void;
}

const rangeOptions: TimelineRange[] = ["day", "week", "month"];

export function Timeline({ data, range, onRangeChange }: TimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const chartHeight = 120;
  const barWidth = data.length > 0 ? Math.max(8, Math.min(32, 500 / data.length)) : 16;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#333" : "#1a1a1a",
    border: `1px solid ${active ? "#555" : "#333"}`,
    borderRadius: 3,
    color: active ? "#eee" : "#888",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 10,
    padding: "2px 8px",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "#888" }}>Discovery Timeline</span>
        <div style={{ display: "flex", gap: 4 }}>
          {rangeOptions.map((r) => (
            <button key={r} style={btnStyle(r === range)} onClick={() => onRangeChange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ height: chartHeight, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontFamily: "monospace", fontSize: 12 }}>
          No timeline data
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            width="100%"
            height={chartHeight + 24}
            viewBox={`0 0 ${data.length * (barWidth + 4) + 8} ${chartHeight + 24}`}
            style={{ display: "block" }}
          >
            {/* grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
              <line
                key={frac}
                x1={0}
                y1={chartHeight - frac * chartHeight}
                x2={data.length * (barWidth + 4) + 8}
                y2={chartHeight - frac * chartHeight}
                stroke="#222"
                strokeWidth={1}
              />
            ))}
            {/* bars */}
            {data.map((entry, i) => {
              const h = (entry.count / maxCount) * chartHeight;
              const x = 4 + i * (barWidth + 4);
              const isHovered = hoveredIndex === i;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={chartHeight - h}
                    width={barWidth}
                    height={h}
                    rx={2}
                    fill={isHovered ? "#22c55e" : "#1a8a4a"}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: "pointer", transition: "fill 0.15s" }}
                  />
                  {/* x label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    fill="#555"
                    fontSize={8}
                    fontFamily="monospace"
                  >
                    {formatLabel(entry.date, range)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* tooltip */}
          {hoveredIndex !== null && data[hoveredIndex] && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 4 + hoveredIndex * (barWidth + 4),
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: 10,
                fontFamily: "monospace",
                color: "#eee",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                transform: "translateY(-100%)",
              }}
            >
              {data[hoveredIndex].date}: {data[hoveredIndex].count} entities
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatLabel(date: string, range: TimelineRange): string {
  if (range === "month") return date.slice(5, 7);
  if (range === "week") return date.slice(5);
  return date.slice(8);
}
