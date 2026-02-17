import React, { useState, useMemo, useEffect } from "react";
import type { CapturedExchange } from "@0x0-gen/sdk";
import { useProxy } from "./hooks/useProxy.js";
import { useHistory } from "./hooks/useHistory.js";
import { ProxyControls } from "./components/ProxyControls.js";
import { MitmControls } from "./components/MitmControls.js";
import { FilterBar, applyFilters, type FilterState } from "./components/FilterBar.js";
import { HistoryTable } from "./components/HistoryTable.js";
import { ExchangeDetail } from "./components/ExchangeDetail.js";

export function App() {
  const { running, port, captureCount, loading, error, startProxy, stopProxy, gateway } =
    useProxy();
  const { exchanges, clearHistory } = useHistory();
  const [selectedExchange, setSelectedExchange] = useState<CapturedExchange | null>(null);
  const [mitmEnabled, setMitmEnabled] = useState(false);
  const [mitmHosts, setMitmHosts] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    method: null,
    statusGroup: null,
  });

  const filteredExchanges = useMemo(
    () => applyFilters(exchanges, filters) as CapturedExchange[],
    [exchanges, filters],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search"]',
        );
        searchInput?.focus();
      }
      if (e.key === "Escape") {
        setSelectedExchange(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleStart = async (config?: { port?: number }) => {
    const hosts = mitmHosts
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    await startProxy({
      ...config,
      mitmEnabled,
      mitmHosts: hosts,
    });
  };

  const handleStop = async () => {
    await stopProxy();
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setSelectedExchange(null);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#ccc",
        fontFamily: "monospace",
      }}
    >
      <ProxyControls
        running={running}
        port={port}
        captureCount={captureCount}
        loading={loading}
        error={error}
        onStart={handleStart}
        onStop={handleStop}
        onClearHistory={handleClearHistory}
      />
      <MitmControls
        mitmEnabled={mitmEnabled}
        mitmHosts={mitmHosts}
        running={running}
        onMitmEnabledChange={setMitmEnabled}
        onMitmHostsChange={setMitmHosts}
        gateway={gateway}
      />
      <FilterBar filters={filters} onFilterChange={setFilters} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div
          style={{
            flex: selectedExchange ? 1 : 1,
            minWidth: 0,
            borderRight: selectedExchange ? "1px solid #333" : "none",
          }}
        >
          <HistoryTable
            exchanges={filteredExchanges}
            selectedId={selectedExchange?.id ?? null}
            onSelect={setSelectedExchange}
          />
        </div>
        {selectedExchange && (
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <ExchangeDetail exchange={selectedExchange} />
          </div>
        )}
      </div>
    </div>
  );
}
