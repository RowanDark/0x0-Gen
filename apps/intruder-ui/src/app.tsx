import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { IntruderPayloadSet, IntruderOptions, AttackType } from "@0x0-gen/sdk";
import { useIntruder } from "./hooks/useIntruder.js";
import { useConfig } from "./hooks/useConfig.js";
import { usePositions } from "./hooks/usePositions.js";
import { useResults } from "./hooks/useResults.js";
import { RequestEditor } from "./components/RequestEditor.js";
import { PayloadManager } from "./components/PayloadManager.js";
import { AttackTypeSelector } from "./components/AttackTypeSelector.js";
import { AttackOptions } from "./components/AttackOptions.js";
import { ResultsTable } from "./components/ResultsTable.js";
import { ResultDetail } from "./components/ResultDetail.js";
import { ProgressBar } from "./components/ProgressBar.js";
import { AttackControls } from "./components/AttackControls.js";

type Tab = "request" | "payloads" | "attack" | "results";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("request");
  const [baseRequest, setBaseRequest] = useState("");
  const [payloadSets, setPayloadSets] = useState<IntruderPayloadSet[]>([
    {
      id: crypto.randomUUID(),
      name: "Payload Set 1",
      payloads: [],
      source: "manual",
    },
  ]);
  const [attackType, setAttackType] = useState<AttackType>("sniper");
  const [options, setOptions] = useState<IntruderOptions>({
    concurrency: 1,
    delayMs: 0,
    followRedirects: false,
    timeout: 30000,
    stopOnError: false,
  });

  const { positions, addPosition, removePosition, clearPositions } = usePositions();
  const { createConfig } = useConfig();
  const {
    attack,
    results,
    status,
    error,
    startAttack,
    pauseAttack,
    resumeAttack,
    cancelAttack,
    reset,
  } = useIntruder();

  const {
    sortField,
    sortDirection,
    toggleSort,
    sortedResults,
    selectedResultId,
    setSelectedResultId,
    selectedResult,
  } = useResults(results);

  const payloadCounts = useMemo(
    () => payloadSets.map((s) => s.payloads.length),
    [payloadSets],
  );

  const canStart =
    baseRequest.length > 0 &&
    positions.length > 0 &&
    payloadSets.some((s) => s.payloads.length > 0) &&
    (status === "idle" || status === "completed" || status === "cancelled");

  const handleStart = useCallback(async () => {
    const config = await createConfig({
      name: `Attack ${new Date().toLocaleTimeString()}`,
      baseRequest,
      positions,
      payloadSets,
      attackType,
      options,
    });
    if (config) {
      reset();
      await startAttack(config.id);
      setActiveTab("results");
    }
  }, [baseRequest, positions, payloadSets, attackType, options, createConfig, startAttack, reset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (canStart) void handleStart();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (status === "running" || status === "paused") void cancelAttack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canStart, handleStart, status, cancelAttack]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "request", label: "Request" },
    { key: "payloads", label: "Payloads" },
    { key: "attack", label: "Attack" },
    { key: "results", label: `Results${results.length > 0 ? ` (${results.length})` : ""}` },
  ];

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        color: "#ccc",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #222",
          display: "flex",
          flexShrink: 0,
          gap: 12,
          justifyContent: "space-between",
          padding: "8px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#666", fontSize: "13px", fontWeight: "bold" }}>
            Intruder
          </span>

          {/* Tab buttons */}
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? "#1a2a3a" : "transparent",
                border: `1px solid ${activeTab === tab.key ? "#2a4a6a" : "#333"}`,
                borderRadius: 3,
                color: activeTab === tab.key ? "#aaf" : "#888",
                cursor: "pointer",
                fontSize: "11px",
                padding: "3px 10px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AttackControls
          status={status}
          canStart={canStart}
          onStart={handleStart}
          onPause={pauseAttack}
          onResume={resumeAttack}
          onCancel={cancelAttack}
        />
      </div>

      {/* Progress bar (shown when active) */}
      {(status === "running" || status === "paused") && attack && (
        <div style={{ flexShrink: 0, padding: "4px 12px" }}>
          <ProgressBar
            completed={attack.completedRequests}
            total={attack.totalRequests}
            startedAt={attack.startedAt}
          />
        </div>
      )}

      {/* Main content area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {activeTab === "request" && (
            <RequestEditor
              value={baseRequest}
              onChange={setBaseRequest}
              positions={positions}
              onAddPosition={addPosition}
              onRemovePosition={removePosition}
              onClearPositions={clearPositions}
            />
          )}

          {activeTab === "payloads" && (
            <PayloadManager
              payloadSets={payloadSets}
              onUpdate={setPayloadSets}
              attackType={attackType}
            />
          )}

          {activeTab === "attack" && (
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <AttackTypeSelector
                  value={attackType}
                  onChange={setAttackType}
                  positionCount={positions.length}
                  payloadCounts={payloadCounts}
                />
              </div>
              <div style={{ flex: 1 }}>
                <AttackOptions options={options} onChange={setOptions} />
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {selectedResult ? (
                <ResultDetail
                  result={selectedResult}
                  onClose={() => setSelectedResultId(null)}
                />
              ) : (
                <ResultsTable
                  results={sortedResults}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  onSelect={setSelectedResultId}
                  selectedId={selectedResultId}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #222",
          color: "#333",
          display: "flex",
          flexShrink: 0,
          fontSize: "9px",
          gap: 16,
          padding: "4px 12px",
        }}
      >
        <span>Ctrl+Enter: Start attack</span>
        <span>Escape: Cancel</span>
        {error && <span style={{ color: "#cc4444" }}>{error}</span>}
      </div>
    </div>
  );
}
