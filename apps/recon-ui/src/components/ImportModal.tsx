import React, { useState, useEffect } from "react";
import type { ImportSourceType } from "@0x0-gen/sdk";
import { useImport } from "../hooks/useImport.js";
import { ImportDropzone } from "./ImportDropzone.js";
import { ImportProgress as ImportProgressDisplay } from "./ImportProgress.js";
import { ParserSelector } from "./ParserSelector.js";
import { ImportHistory } from "./ImportHistory.js";

export interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Tab = "file" | "paste" | "history";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ImportModal({ open, onClose, onImportComplete }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("file");
  const {
    files,
    pasteContent,
    selectedSource,
    autoDetectedSource,
    options,
    progress,
    result,
    imports,
    error,
    largeImportWarning,
    addFiles,
    removeFile,
    setPasteContent,
    setSelectedSource,
    detectPasteFormat,
    setOptions,
    importFiles,
    importText,
    loadImports,
    reset,
  } = useImport();

  useEffect(() => {
    if (open) loadImports();
  }, [open]);

  useEffect(() => {
    if (result) onImportComplete();
  }, [result]);

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#1a1a1a" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid #22c55e" : "2px solid transparent",
    color: active ? "#eee" : "#888",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 12,
    padding: "8px 16px",
  });

  const checkboxStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontFamily: "monospace",
    color: "#ccc",
    cursor: "pointer",
  };

  const importBtnStyle: React.CSSProperties = {
    background: "#22c55e22",
    border: "1px solid #22c55e44",
    borderRadius: 4,
    color: "#22c55e",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 12,
    padding: "8px 20px",
    width: "100%",
    marginTop: 12,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #333",
          borderRadius: 8,
          width: 640,
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #222" }}>
          <span style={{ fontFamily: "monospace", fontSize: 14, color: "#eee", fontWeight: 600 }}>Import Data</span>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 16,
              padding: "0 4px",
            }}
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #222" }}>
          <button style={tabStyle(activeTab === "file")} onClick={() => setActiveTab("file")}>File Upload</button>
          <button style={tabStyle(activeTab === "paste")} onClick={() => setActiveTab("paste")}>Paste Text</button>
          <button style={tabStyle(activeTab === "history")} onClick={() => setActiveTab("history")}>History</button>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          {activeTab === "file" && (
            <>
              <ImportDropzone onFilesAdded={addFiles} />

              {/* File list */}
              {files.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {files.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        background: "#111",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: "#ccc" }}>{f.name}</span>
                        <span style={{ color: "#555" }}>{formatFileSize(f.size)}</span>
                        {f.detectedSource && (
                          <span style={{ color: "#22c55e", fontSize: 10 }}>({f.detectedSource})</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Parser selector */}
              <div style={{ marginTop: 12 }}>
                <ParserSelector
                  selected={selectedSource}
                  autoDetected={autoDetectedSource}
                  onChange={setSelectedSource}
                />
              </div>

              {/* Options */}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <label style={checkboxStyle}>
                  <input
                    type="checkbox"
                    checked={options.deduplicate}
                    onChange={(e) => setOptions({ ...options, deduplicate: e.target.checked })}
                    style={{ accentColor: "#22c55e" }}
                  />
                  Deduplicate
                </label>
                <label style={checkboxStyle}>
                  <input
                    type="checkbox"
                    checked={options.createRelationships}
                    onChange={(e) => setOptions({ ...options, createRelationships: e.target.checked })}
                    style={{ accentColor: "#22c55e" }}
                  />
                  Create Relationships
                </label>
              </div>

              {/* Import button */}
              <button
                onClick={importFiles}
                disabled={files.length === 0 || progress.active}
                style={{
                  ...importBtnStyle,
                  opacity: files.length === 0 || progress.active ? 0.5 : 1,
                  cursor: files.length === 0 || progress.active ? "not-allowed" : "pointer",
                }}
              >
                {progress.active ? "Importing..." : `Import ${files.length} File${files.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}

          {activeTab === "paste" && (
            <>
              <textarea
                value={pasteContent}
                onChange={(e) => {
                  setPasteContent(e.target.value);
                  detectPasteFormat(e.target.value);
                }}
                placeholder="Paste JSON, CSV, or tool output here..."
                style={{
                  width: "100%",
                  minHeight: 200,
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: 4,
                  color: "#ccc",
                  fontFamily: "monospace",
                  fontSize: 11,
                  padding: 10,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />

              {/* Parser selector */}
              <div style={{ marginTop: 12 }}>
                <ParserSelector
                  selected={selectedSource}
                  autoDetected={autoDetectedSource}
                  onChange={setSelectedSource}
                />
              </div>

              {/* Options */}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <label style={checkboxStyle}>
                  <input
                    type="checkbox"
                    checked={options.deduplicate}
                    onChange={(e) => setOptions({ ...options, deduplicate: e.target.checked })}
                    style={{ accentColor: "#22c55e" }}
                  />
                  Deduplicate
                </label>
                <label style={checkboxStyle}>
                  <input
                    type="checkbox"
                    checked={options.createRelationships}
                    onChange={(e) => setOptions({ ...options, createRelationships: e.target.checked })}
                    style={{ accentColor: "#22c55e" }}
                  />
                  Create Relationships
                </label>
              </div>

              {/* Import button */}
              <button
                onClick={importText}
                disabled={!pasteContent.trim() || progress.active}
                style={{
                  ...importBtnStyle,
                  opacity: !pasteContent.trim() || progress.active ? 0.5 : 1,
                  cursor: !pasteContent.trim() || progress.active ? "not-allowed" : "pointer",
                }}
              >
                {progress.active ? "Importing..." : "Import Text"}
              </button>
            </>
          )}

          {activeTab === "history" && <ImportHistory imports={imports} />}

          {/* Progress */}
          <ImportProgressDisplay progress={progress} />

          {/* Large import warning */}
          {largeImportWarning && (
            <div style={{
              marginTop: 8,
              padding: "8px 12px",
              background: "#f59e0b15",
              border: "1px solid #f59e0b33",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#f59e0b",
            }}>
              Large import detected (&gt;10,000 entities). This may affect performance.
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 8,
              padding: "8px 12px",
              background: "#ef444415",
              border: "1px solid #ef444433",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#ef4444",
            }}>
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "#22c55e10",
              border: "1px solid #22c55e33",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 11,
            }}>
              <div style={{ color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>Import Complete</div>
              <div style={{ display: "flex", gap: 12, color: "#ccc" }}>
                <span>Total: {result.stats.total}</span>
                <span style={{ color: "#22c55e" }}>New: {result.stats.new}</span>
                <span>Updated: {result.stats.updated}</span>
                <span style={{ color: "#888" }}>Duplicates: {result.stats.duplicates}</span>
                {result.stats.errors > 0 && (
                  <span style={{ color: "#ef4444" }}>Errors: {result.stats.errors}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
