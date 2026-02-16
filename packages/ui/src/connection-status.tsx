import React from "react";

export type ConnectionState = "connected" | "disconnected" | "connecting";

interface ConnectionStatusProps {
  state: ConnectionState;
}

const STATE_LABELS: Record<ConnectionState, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  connecting: "Connecting...",
};

const STATE_COLORS: Record<ConnectionState, string> = {
  connected: "#22c55e",
  disconnected: "#ef4444",
  connecting: "#eab308",
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "14px",
        fontFamily: "monospace",
      },
    },
    React.createElement("span", {
      style: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: STATE_COLORS[state],
        display: "inline-block",
      },
    }),
    React.createElement("span", null, STATE_LABELS[state]),
  );
}
