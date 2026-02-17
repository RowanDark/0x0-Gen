import React from "react";

export type ToolStatus = "running" | "stopped" | "attached";

interface ToolCardProps {
  name: string;
  status: ToolStatus;
  onLaunch?: () => void;
  onDetach?: () => void;
}

const STATUS_COLORS: Record<ToolStatus, string> = {
  running: "#22c55e",
  stopped: "#666",
  attached: "#5a5aff",
};

const STATUS_LABELS: Record<ToolStatus, string> = {
  running: "Running",
  stopped: "Stopped",
  attached: "Attached",
};

export function ToolCard({ name, status, onLaunch, onDetach }: ToolCardProps) {
  return React.createElement(
    "div",
    {
      style: {
        padding: "16px",
        backgroundColor: "#111",
        border: "1px solid #2a2a2a",
        borderRadius: "6px",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
      },
      React.createElement(
        "span",
        { style: { fontSize: "14px", fontWeight: "bold", color: "#fff" } },
        name,
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "6px",
          },
        },
        React.createElement("span", {
          style: {
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: STATUS_COLORS[status],
            display: "inline-block",
          },
        }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: "11px",
              color: STATUS_COLORS[status],
            },
          },
          STATUS_LABELS[status],
        ),
      ),
    ),
    React.createElement(
      "div",
      { style: { display: "flex", gap: "8px" } },
      onLaunch
        ? React.createElement(
            "button",
            {
              onClick: onLaunch,
              style: {
                padding: "4px 12px",
                background: "#1a1a2e",
                border: "1px solid #333",
                color: "#ccc",
                fontSize: "11px",
                fontFamily: "monospace",
                borderRadius: "3px",
                cursor: "pointer",
              },
            },
            "Open Standalone",
          )
        : null,
      status === "attached" && onDetach
        ? React.createElement(
            "button",
            {
              onClick: onDetach,
              style: {
                padding: "4px 12px",
                background: "transparent",
                border: "1px solid #444",
                color: "#888",
                fontSize: "11px",
                fontFamily: "monospace",
                borderRadius: "3px",
                cursor: "pointer",
              },
            },
            "Detach",
          )
        : null,
    ),
  );
}
