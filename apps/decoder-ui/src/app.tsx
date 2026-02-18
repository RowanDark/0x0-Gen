import React, { useEffect, useCallback } from "react";
import type { TransformType, TransformDirection } from "@0x0-gen/sdk";
import { useDecoder } from "./hooks/useDecoder.js";
import { usePresets } from "./hooks/usePresets.js";
import { useTransformTypes } from "./hooks/useTransformTypes.js";
import { InputPane } from "./components/InputPane.js";
import { OutputPane } from "./components/OutputPane.js";
import { TransformPicker } from "./components/TransformPicker.js";
import { PipelineBuilder } from "./components/PipelineBuilder.js";
import { PresetSelector } from "./components/PresetSelector.js";
import { PresetManager } from "./components/PresetManager.js";
import { QuickActions, detectEncoding } from "./components/QuickActions.js";

export function App() {
  const {
    input,
    setInput,
    steps,
    result,
    running,
    error,
    autoRun,
    setAutoRun,
    isLargeInput,
    execute,
    addStep,
    removeStep,
    toggleDirection,
    reorderSteps,
    clearSteps,
    loadSteps,
    useOutputAsInput,
    clearAll,
  } = useDecoder();

  const { types } = useTransformTypes();
  const { presets, createPreset, deletePreset } = usePresets();

  // Quick action: run a single transform directly
  const handleQuickAction = useCallback(
    async (type: TransformType, direction: TransformDirection) => {
      await execute(input, [{ type, direction }]);
    },
    [execute, input],
  );

  // Smart decode: detect encoding and execute
  const handleSmartDecode = useCallback(async () => {
    const detected = detectEncoding(input);
    if (detected) {
      await execute(input, [detected]);
    }
  }, [execute, input]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void execute();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (result?.output) {
          void navigator.clipboard.writeText(result.output);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        clearAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [execute, result, clearAll]);

  const handleSavePreset = useCallback(
    async (name: string, presetSteps: typeof steps) => {
      await createPreset(name, presetSteps);
    },
    [createPreset],
  );

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
            Decoder
          </span>
          <PresetSelector presets={presets} onLoadPreset={loadSteps} />
          <div style={{ position: "relative" }}>
            <PresetManager
              presets={presets}
              currentSteps={steps}
              onSavePreset={handleSavePreset}
              onDeletePreset={deletePreset}
              onLoadPreset={loadSteps}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <QuickActions
            input={input}
            onExecuteQuick={handleQuickAction}
            onSmartDecode={handleSmartDecode}
          />
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Input */}
        <div
          style={{
            borderRight: "1px solid #222",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            minWidth: 0,
            padding: 12,
          }}
        >
          <InputPane value={input} onChange={setInput} isLargeInput={isLargeInput} />
        </div>

        {/* Center: Pipeline + Transform Picker */}
        <div
          style={{
            borderRight: "1px solid #222",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            width: 240,
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 8 }}>
            <PipelineBuilder
              steps={steps}
              autoRun={autoRun}
              running={running}
              onToggleDirection={toggleDirection}
              onRemoveStep={removeStep}
              onReorder={reorderSteps}
              onClear={clearSteps}
              onExecute={() => void execute()}
              onToggleAutoRun={() => setAutoRun(!autoRun)}
            />
          </div>
          <div
            style={{
              borderTop: "1px solid #222",
              flexShrink: 0,
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            <TransformPicker types={types} onAdd={addStep} />
          </div>
        </div>

        {/* Right: Output */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            minWidth: 0,
            padding: 12,
          }}
        >
          <OutputPane result={result} running={running} onUseAsInput={useOutputAsInput} />
        </div>
      </div>

      {/* Footer: keyboard shortcuts hint */}
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
        <span>Ctrl+Enter: Run</span>
        <span>Ctrl+Shift+C: Copy output</span>
        <span>Ctrl+D: Clear all</span>
        {error && <span style={{ color: "#cc4444" }}>{error}</span>}
      </div>
    </div>
  );
}
