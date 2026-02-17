import React from "react";
import { EventLog, type EventLogEntry } from "@0x0-gen/ui";
import type { EventMessage } from "@0x0-gen/sdk";

interface EventPanelProps {
  events: EventMessage[];
  eventTypes: string[];
  isOpen: boolean;
  onToggle: () => void;
  onFilterChange: (type: string | null) => void;
}

export function EventPanel({ events, eventTypes, isOpen, onToggle, onFilterChange }: EventPanelProps) {
  const logEntries: EventLogEntry[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    payload: e.payload,
    timestamp: e.timestamp,
  }));

  return (
    <div
      style={{
        borderTop: "1px solid #2a2a2a",
        backgroundColor: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        height: isOpen ? "250px" : "32px",
        transition: "height 0.2s ease",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "none",
          border: "none",
          borderBottom: isOpen ? "1px solid #2a2a2a" : "none",
          color: "#888",
          fontSize: "11px",
          fontFamily: "monospace",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
        }}
      >
        <span>Event Log ({events.length})</span>
        <span>{isOpen ? "v" : "^"}</span>
      </button>
      {isOpen && (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <EventLog
            events={logEntries}
            eventTypes={eventTypes}
            onFilterChange={onFilterChange}
          />
        </div>
      )}
    </div>
  );
}
