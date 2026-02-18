import React from "react";
import type { IntruderResult } from "@0x0-gen/sdk";

interface ResultDetailProps {
  result: IntruderResult;
  onClose: () => void;
}

export function ResultDetail({ result, onClose }: ResultDetailProps) {
  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid #333",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 8,
          padding: "6px 8px",
        }}
      >
        <span style={{ color: "#888", fontSize: "11px", fontWeight: "bold" }}>
          Request #{result.requestIndex}
        </span>
        <span style={{ color: "#666", fontSize: "10px" }}>
          {result.duration}ms
        </span>
        {result.response && (
          <span
            style={{
              color:
                result.response.statusCode < 400 ? "#4a8" : "#c44",
              fontSize: "11px",
            }}
          >
            {result.response.statusCode} {result.response.statusMessage}
          </span>
        )}
        {result.error && (
          <span style={{ color: "#c44", fontSize: "11px" }}>
            {result.error}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: "12px",
            marginLeft: "auto",
          }}
        >
          x
        </button>
      </div>

      {/* Payloads */}
      <div style={{ borderBottom: "1px solid #222", padding: "4px 8px" }}>
        <span style={{ color: "#666", fontSize: "10px" }}>Payloads: </span>
        {Object.entries(result.payloads).map(([name, value]) => (
          <span
            key={name}
            style={{
              background: "#1a1a2a",
              border: "1px solid #2a2a4a",
              borderRadius: 2,
              color: "#aaf",
              fontSize: "10px",
              marginLeft: 4,
              padding: "0 4px",
            }}
          >
            {name}={value}
          </span>
        ))}
      </div>

      {/* Request / Response panels */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Request */}
        <div
          style={{
            borderRight: "1px solid #222",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid #222",
              color: "#888",
              fontSize: "10px",
              padding: "4px 8px",
            }}
          >
            Request
          </div>
          <pre
            style={{
              color: "#aaa",
              flex: 1,
              fontSize: "10px",
              margin: 0,
              overflow: "auto",
              padding: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {result.request}
          </pre>
        </div>

        {/* Response */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid #222",
              color: "#888",
              fontSize: "10px",
              padding: "4px 8px",
            }}
          >
            Response
          </div>
          <pre
            style={{
              color: "#aaa",
              flex: 1,
              fontSize: "10px",
              margin: 0,
              overflow: "auto",
              padding: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {result.response
              ? `HTTP ${result.response.statusCode} ${result.response.statusMessage}\n${Object.entries(result.response.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}\n\n${result.response.body ?? ""}`
              : result.error ?? "No response"}
          </pre>
        </div>
      </div>
    </div>
  );
}
