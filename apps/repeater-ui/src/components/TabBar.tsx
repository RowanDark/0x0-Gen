import React, { useState, useRef, useEffect } from "react";
import type { RepeaterTab } from "@0x0-gen/sdk";

interface TabBarProps {
  tabs: RepeaterTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabRename: (id: string, name: string) => void;
  onNewTab: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabRename,
  onNewTab,
}: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (tab: RepeaterTab) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onTabRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "#111",
        borderBottom: "1px solid #333",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 12px",
            borderRight: "1px solid #333",
            cursor: "pointer",
            backgroundColor: tab.id === activeTabId ? "#1a1a1a" : "transparent",
            borderBottom: tab.id === activeTabId ? "2px solid #00cc88" : "2px solid transparent",
            flexShrink: 0,
            minWidth: 80,
            maxWidth: 180,
          }}
        >
          {editingId === tab.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditValue("");
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "transparent",
                border: "1px solid #555",
                color: "#ccc",
                fontFamily: "monospace",
                fontSize: "12px",
                outline: "none",
                width: "100%",
                padding: "0 2px",
              }}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEdit(tab);
              }}
              style={{
                fontSize: "12px",
                color: tab.id === activeTabId ? "#fff" : "#999",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                userSelect: "none",
              }}
              title={tab.name}
            >
              {tab.name}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            title="Close tab"
            style={{
              marginLeft: 6,
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: "14px",
              lineHeight: 1,
              padding: "0 2px",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = "#ccc")}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = "#666")}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={onNewTab}
        title="New tab (Ctrl+T)"
        style={{
          background: "none",
          border: "none",
          color: "#666",
          cursor: "pointer",
          fontSize: "18px",
          padding: "4px 12px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = "#ccc")}
        onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = "#666")}
      >
        +
      </button>
    </div>
  );
}
