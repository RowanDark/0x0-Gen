import React, { useState } from "react";
import type { ProxyResponse } from "@0x0-gen/sdk";

type Tab = "headers" | "body" | "hex";

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return "#27ae60";
  if (code >= 300 && code < 400) return "#3498db";
  if (code >= 400 && code < 500) return "#e67e22";
  if (code >= 500) return "#e74c3c";
  return "#888";
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

interface ResponsePaneProps {
  response: ProxyResponse;
}

export function ResponsePane({ response }: ResponsePaneProps) {
  const [activeTab, setActiveTab] = useState<Tab>("headers");

  const isJson = response.headers["content-type"]?.includes("application/json");
  const isHtml = response.headers["content-type"]?.includes("text/html");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          padding: "4px 8px",
          borderBottom: "1px solid #333",
          backgroundColor: "#111",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: statusColor(response.statusCode),
            marginRight: "12px",
          }}
        >
          Response {response.statusCode} {response.statusMessage}
        </span>
        {(["headers", "body", "hex"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "2px 10px",
              fontSize: "11px",
              fontFamily: "monospace",
              backgroundColor: activeTab === tab ? "#1a3a5c" : "transparent",
              color: activeTab === tab ? "#fff" : "#888",
              border: "1px solid",
              borderColor: activeTab === tab ? "#2980b9" : "#333",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "11px", color: "#555" }}>{response.duration}ms</span>
        <button
          onClick={() => {
            const text =
              activeTab === "headers"
                ? Object.entries(response.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")
                : response.body ?? "";
            navigator.clipboard.writeText(text);
          }}
          style={{
            padding: "2px 8px",
            fontSize: "10px",
            fontFamily: "monospace",
            backgroundColor: "transparent",
            color: "#666",
            border: "1px solid #333",
            borderRadius: "3px",
            cursor: "pointer",
            marginLeft: "8px",
          }}
        >
          Copy
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px", fontSize: "12px" }}>
        {activeTab === "headers" && (
          <div>
            <div
              style={{
                color: statusColor(response.statusCode),
                marginBottom: "8px",
              }}
            >
              HTTP/1.1 {response.statusCode} {response.statusMessage}
            </div>
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} style={{ marginBottom: "2px" }}>
                <span style={{ color: "#3498db" }}>{key}</span>
                <span style={{ color: "#555" }}>: </span>
                <span style={{ color: "#ccc" }}>{value}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "body" && (
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              color: isJson ? "#e67e22" : isHtml ? "#9b59b6" : "#ccc",
            }}
          >
            {response.body
              ? isJson
                ? formatJson(response.body)
                : response.body
              : "(empty body)"}
          </pre>
        )}
        {activeTab === "hex" && (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#888" }}>
            {response.body
              ? Array.from(new TextEncoder().encode(response.body))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join(" ")
                  .replace(/(.{48})/g, "$1\n")
              : "(empty body)"}
          </pre>
        )}
      </div>
    </div>
  );
}
