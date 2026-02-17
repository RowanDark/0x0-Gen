import React, { useState } from "react";
import type { ProxyRequest } from "@0x0-gen/sdk";

type Tab = "headers" | "body" | "hex";

interface RequestPaneProps {
  request: ProxyRequest;
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function RequestPane({ request }: RequestPaneProps) {
  const [activeTab, setActiveTab] = useState<Tab>("headers");

  const isJson = request.headers["content-type"]?.includes("application/json");

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
            color: "#3498db",
            marginRight: "12px",
          }}
        >
          Request
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
        <button
          onClick={() => {
            const text =
              activeTab === "headers"
                ? Object.entries(request.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")
                : request.body ?? "";
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
          }}
        >
          Copy
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px", fontSize: "12px" }}>
        {activeTab === "headers" && (
          <div>
            <div style={{ color: "#e67e22", marginBottom: "8px" }}>
              {request.method} {request.path} HTTP/1.1
            </div>
            {Object.entries(request.headers).map(([key, value]) => (
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
              color: isJson ? "#e67e22" : "#ccc",
            }}
          >
            {request.body
              ? isJson
                ? formatJson(request.body)
                : request.body
              : "(empty body)"}
          </pre>
        )}
        {activeTab === "hex" && (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#888" }}>
            {request.body
              ? Buffer.from(request.body).toString("hex").replace(/(.{2})/g, "$1 ").replace(/(.{48})/g, "$1\n")
              : "(empty body)"}
          </pre>
        )}
      </div>
    </div>
  );
}
