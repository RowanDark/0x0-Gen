import React, { useState } from "react";
import type { RepeaterRequest } from "@0x0-gen/sdk";
import { HeadersEditor } from "./HeadersEditor.js";
import { BodyEditor } from "./BodyEditor.js";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] as const;

interface RequestEditorProps {
  request: RepeaterRequest;
  onChange: (request: RepeaterRequest) => void;
  onParseRaw: (raw: string) => Promise<RepeaterRequest | null>;
  onSerialize: (request: RepeaterRequest) => Promise<string | null>;
}

export function RequestEditor({ request, onChange, onParseRaw, onSerialize }: RequestEditorProps) {
  const [mode, setMode] = useState<"pretty" | "raw">("pretty");
  const [rawText, setRawText] = useState("");
  const [activeTab, setActiveTab] = useState<"headers" | "body">("headers");
  const [parseError, setParseError] = useState<string | null>(null);

  const handleMethodChange = (method: string) => {
    onChange({ ...request, method: method as RepeaterRequest["method"] });
  };

  const handleUrlChange = (url: string) => {
    onChange({ ...request, url });
  };

  const handleHeadersChange = (headers: Record<string, string>) => {
    onChange({ ...request, headers });
  };

  const handleBodyChange = (body: string | null) => {
    onChange({ ...request, body });
  };

  const handleContentTypeChange = (contentType: string | null) => {
    const headers = { ...request.headers };
    if (contentType) {
      headers["content-type"] = contentType;
    } else {
      delete headers["content-type"];
    }
    onChange({ ...request, headers });
  };

  const switchToRaw = async () => {
    setParseError(null);
    const serialized = await onSerialize(request);
    if (serialized !== null) {
      setRawText(serialized);
    }
    setMode("raw");
  };

  const switchToPretty = async () => {
    setParseError(null);
    if (!rawText.trim()) {
      setMode("pretty");
      return;
    }
    const parsed = await onParseRaw(rawText);
    if (parsed) {
      onChange(parsed);
      setMode("pretty");
    } else {
      setParseError("Failed to parse raw HTTP");
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #00cc88" : "2px solid transparent",
    color: active ? "#ccc" : "#666",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "4px 12px",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Method + URL + Mode Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <select
          value={request.method}
          onChange={(e) => handleMethodChange(e.target.value)}
          style={{
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: 3,
            color: "#00cc88",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "13px",
            fontWeight: "bold",
            padding: "6px 8px",
            flexShrink: 0,
          }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={request.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com/api/endpoint"
          style={{
            background: "#111",
            border: "1px solid #444",
            borderRadius: 3,
            color: "#ccc",
            fontFamily: "monospace",
            fontSize: "13px",
            flex: 1,
            outline: "none",
            padding: "6px 10px",
          }}
          onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#555")}
          onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#444")}
        />
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => (mode === "pretty" ? switchToRaw() : switchToPretty())}
            title={mode === "pretty" ? "Switch to Raw mode" : "Parse Raw to Pretty"}
            style={{
              background: "none",
              border: "1px solid #444",
              borderRadius: 3,
              color: "#888",
              cursor: "pointer",
              fontSize: "11px",
              padding: "4px 10px",
            }}
          >
            {mode === "pretty" ? "Raw" : "Pretty"}
          </button>
        </div>
      </div>

      {parseError && (
        <div style={{ color: "#cc4444", fontSize: "11px", padding: "4px 0" }}>
          {parseError}
        </div>
      )}

      {mode === "raw" ? (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"GET /api HTTP/1.1\r\nHost: example.com\r\n\r\n"}
          style={{
            background: "#111",
            border: "1px solid #333",
            color: "#ccc",
            flex: 1,
            fontFamily: "monospace",
            fontSize: "12px",
            outline: "none",
            padding: 8,
            resize: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* Tab strip */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #333",
              flexShrink: 0,
            }}
          >
            <button style={tabStyle(activeTab === "headers")} onClick={() => setActiveTab("headers")}>
              Headers {Object.keys(request.headers).length > 0 && `(${Object.keys(request.headers).length})`}
            </button>
            <button style={tabStyle(activeTab === "body")} onClick={() => setActiveTab("body")}>
              Body {request.body && `(${request.body.length})`}
            </button>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
            {activeTab === "headers" ? (
              <HeadersEditor headers={request.headers} onChange={handleHeadersChange} />
            ) : (
              <BodyEditor
                body={request.body}
                onBodyChange={handleBodyChange}
                onContentTypeChange={handleContentTypeChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
