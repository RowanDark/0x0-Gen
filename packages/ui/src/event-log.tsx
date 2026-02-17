import React, { useRef, useEffect, useState } from "react";

export interface EventLogEntry {
  id: string;
  type: string;
  source: string;
  payload: unknown;
  timestamp: string;
}

interface EventLogProps {
  events: EventLogEntry[];
  eventTypes: string[];
  onFilterChange?: (type: string | null) => void;
}

export function EventLog({ events, eventTypes, onFilterChange }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }

  function handleFilterClick(type: string) {
    const newFilter = activeFilter === type ? null : type;
    setActiveFilter(newFilter);
    onFilterChange?.(newFilter);
  }

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "monospace",
        fontSize: "12px",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          gap: "4px",
          padding: "6px 8px",
          borderBottom: "1px solid #2a2a2a",
          flexWrap: "wrap",
        },
      },
      eventTypes.map((type) =>
        React.createElement(
          "button",
          {
            key: type,
            onClick: () => handleFilterClick(type),
            style: {
              padding: "2px 8px",
              border: "1px solid " + (activeFilter === type ? "#5a5aff" : "#333"),
              background: activeFilter === type ? "#1a1a2e" : "transparent",
              color: activeFilter === type ? "#fff" : "#888",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "monospace",
            },
          },
          type,
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        ref: scrollRef,
        onScroll: handleScroll,
        onMouseEnter: () => setAutoScroll(false),
        onMouseLeave: () => setAutoScroll(true),
        style: {
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
        },
      },
      events.length === 0
        ? React.createElement(
            "div",
            { style: { padding: "12px", color: "#555", textAlign: "center" } },
            "No events",
          )
        : events.map((event) =>
            React.createElement(
              "div",
              {
                key: event.id,
                onClick: () => setExpandedId(expandedId === event.id ? null : event.id),
                style: {
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderBottom: "1px solid #1a1a1a",
                  backgroundColor: expandedId === event.id ? "#111" : "transparent",
                },
              },
              React.createElement(
                "div",
                { style: { display: "flex", gap: "8px", alignItems: "center" } },
                React.createElement(
                  "span",
                  { style: { color: "#555", minWidth: "80px" } },
                  new Date(event.timestamp).toLocaleTimeString(),
                ),
                React.createElement(
                  "span",
                  { style: { color: "#5a5aff" } },
                  event.type,
                ),
                React.createElement(
                  "span",
                  { style: { color: "#666" } },
                  event.source,
                ),
              ),
              expandedId === event.id
                ? React.createElement(
                    "pre",
                    {
                      style: {
                        margin: "4px 0 0 88px",
                        color: "#888",
                        fontSize: "11px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      },
                    },
                    JSON.stringify(event.payload, null, 2),
                  )
                : null,
            ),
          ),
    ),
  );
}
