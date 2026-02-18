import React, { useMemo } from "react";

interface ProgressBarProps {
  completed: number;
  total: number;
  startedAt: number | null;
}

export function ProgressBar({ completed, total, startedAt }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const { rate, eta } = useMemo(() => {
    if (!startedAt || completed === 0) {
      return { rate: 0, eta: "" };
    }

    const elapsed = (Date.now() - startedAt) / 1000;
    const rps = elapsed > 0 ? completed / elapsed : 0;
    const remaining = total - completed;
    const etaSeconds = rps > 0 ? remaining / rps : 0;

    let etaStr = "";
    if (etaSeconds > 3600) {
      etaStr = `${Math.floor(etaSeconds / 3600)}h ${Math.floor((etaSeconds % 3600) / 60)}m`;
    } else if (etaSeconds > 60) {
      etaStr = `${Math.floor(etaSeconds / 60)}m ${Math.floor(etaSeconds % 60)}s`;
    } else {
      etaStr = `${Math.ceil(etaSeconds)}s`;
    }

    return { rate: Math.round(rps * 10) / 10, eta: etaStr };
  }, [completed, total, startedAt]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Progress bar */}
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: 3,
          height: 6,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            background: percentage === 100 ? "#4a8" : "#38a",
            borderRadius: 3,
            height: "100%",
            transition: "width 0.3s ease",
            width: `${percentage}%`,
          }}
        />
      </div>

      {/* Stats */}
      <div
        style={{
          color: "#666",
          display: "flex",
          fontSize: "10px",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <span>
          {completed.toLocaleString()} / {total.toLocaleString()} ({percentage}%)
        </span>
        {rate > 0 && <span>{rate} req/s</span>}
        {eta && completed < total && <span>ETA: {eta}</span>}
      </div>
    </div>
  );
}
