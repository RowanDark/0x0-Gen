import React, { useEffect, useCallback, useState } from "react";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";
import { useRepeater } from "./hooks/useRepeater.js";
import { TabBar } from "./components/TabBar.js";
import { RequestEditor } from "./components/RequestEditor.js";
import { ResponseViewer } from "./components/ResponseViewer.js";
import { HistoryPanel } from "./components/HistoryPanel.js";
import { SendButton } from "./components/SendButton.js";

export function App() {
  const {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    sending,
    error,
    lastEntry,
    setLastEntry,
    createTab,
    closeTab,
    renameTab,
    updateRequest,
    sendRequest,
    clearHistory,
    parseRaw,
    serializeReq,
  } = useRepeater();

  const [viewedEntry, setViewedEntry] = useState<RepeaterHistoryEntry | null>(null);

  // When a new entry arrives, auto-show it
  useEffect(() => {
    if (lastEntry) {
      setViewedEntry(lastEntry);
    }
  }, [lastEntry]);

  // When switching tabs, reset viewed entry to last history item
  useEffect(() => {
    if (activeTab && activeTab.history.length > 0) {
      setViewedEntry(activeTab.history[0]);
    } else {
      setViewedEntry(null);
    }
  }, [activeTabId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!sending && activeTab?.request.url) {
          void sendRequest();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        void createTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          void closeTab(activeTabId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length > 1 && activeTabId) {
          const idx = tabs.findIndex((t) => t.id === activeTabId);
          const next = tabs[(idx + 1) % tabs.length];
          setActiveTabId(next.id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sending, activeTab, activeTabId, tabs]);

  const handleSend = useCallback(async () => {
    const entry = await sendRequest();
    if (entry) {
      setViewedEntry(entry);
    }
  }, [sendRequest]);

  const handleHistorySelect = useCallback((entry: RepeaterHistoryEntry) => {
    setViewedEntry(entry);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    setViewedEntry(null);
    setLastEntry(null);
  }, [clearHistory, setLastEntry]);

  const history = activeTab?.history ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#ccc",
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={closeTab}
        onTabRename={renameTab}
        onNewTab={createTab}
      />

      {tabs.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            color: "#444",
          }}
        >
          <div style={{ fontSize: "16px" }}>No tabs open</div>
          <button
            onClick={createTab}
            style={{
              background: "#1a2a22",
              border: "1px solid #00cc88",
              borderRadius: 4,
              color: "#00cc88",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "13px",
              padding: "8px 20px",
            }}
          >
            New Tab (Ctrl+T)
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Main workspace */}
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Send bar */}
            <div
              style={{
                alignItems: "center",
                borderBottom: "1px solid #333",
                display: "flex",
                flexShrink: 0,
                gap: 12,
                justifyContent: "flex-end",
                padding: "8px 12px",
              }}
            >
              {error && (
                <span style={{ color: "#cc4444", fontSize: "11px", flex: 1 }}>
                  {error}
                </span>
              )}
              <SendButton
                onSend={handleSend}
                loading={sending}
                disabled={!activeTab?.request.url}
              />
            </div>

            {/* Request / Response split */}
            <div
              style={{
                display: "flex",
                flex: 1,
                overflow: "hidden",
              }}
            >
              {/* Request pane */}
              <div
                style={{
                  borderRight: "1px solid #333",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    color: "#555",
                    fontSize: "10px",
                    letterSpacing: 1,
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  Request
                </div>
                {activeTab && (
                  <RequestEditor
                    request={activeTab.request}
                    onChange={updateRequest}
                    onParseRaw={parseRaw}
                    onSerialize={serializeReq}
                  />
                )}
              </div>

              {/* Response pane */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    color: "#555",
                    fontSize: "10px",
                    letterSpacing: 1,
                    padding: "12px 12px 4px",
                    textTransform: "uppercase",
                  }}
                >
                  Response
                </div>
                <ResponseViewer entry={viewedEntry} loading={sending} />
              </div>
            </div>
          </div>

          {/* History panel */}
          <HistoryPanel
            history={history}
            selectedId={viewedEntry?.id ?? null}
            onSelect={handleHistorySelect}
            onClear={handleClearHistory}
          />
        </div>
      )}
    </div>
  );
}
