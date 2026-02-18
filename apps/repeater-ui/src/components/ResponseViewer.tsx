import React, { useState } from "react";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";

interface ResponseViewerProps {
  entry: RepeaterHistoryEntry | null;
  loading?: boolean;
}

function detectContentType(headers: Record<string, string>): string {
  const ct = headers["content-type"] ?? headers["Content-Type"] ?? "";
  if (ct.includes("json")) return "json";
  if (ct.includes("html")) return "html";
  if (ct.includes("xml")) return "xml";
  return "text";
}

function tryFormatJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusColor(code: number): string {
  if (code >= 500) return "#cc4444";
  if (code >= 400) return "#cc8844";
  if (code >= 300) return "#cccc44";
  if (code >= 200) return "#44cc88";
  return "#888";
}

function highlightJson(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "color:#c0a0ff"; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "color:#88aaff"; // key
          } else {
            cls = "color:#88cc88"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "color:#cc8844"; // boolean
        } else if (/null/.test(match)) {
          cls = "color:#888"; // null
        }
        return `<span style="${cls}">${match}</span>`;
      },
    );
}

export function ResponseViewer({ entry, loading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<"headers" | "body" | "raw">("body");

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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#555",
          fontFamily: "monospace",
        }}
      >
        <span>Sending request...</span>
      </div>
    );
  }

  if (!entry) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#444",
          fontFamily: "monospace",
          fontSize: "13px",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span>No response yet</span>
        <span style={{ fontSize: "11px", color: "#333" }}>
          Press Send or Ctrl+Enter to send the request
        </span>
      </div>
    );
  }

  if (entry.error && !entry.response) {
    return (
      <div
        style={{
          padding: 16,
          color: "#cc4444",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>Request Failed</div>
        <div>{entry.error}</div>
        <div style={{ marginTop: 8, color: "#666" }}>
          Duration: {entry.duration}ms
        </div>
      </div>
    );
  }

  const response = entry.response!;
  const contentType = detectContentType(response.headers);

  const getBodyDisplay = () => {
    if (!response.body) return "(empty body)";
    if (contentType === "json") return tryFormatJson(response.body);
    return response.body;
  };

  const getBodyHtml = () => {
    const body = getBodyDisplay();
    if (contentType === "json") return highlightJson(body);
    return body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const getRawResponse = () => {
    const statusLine = `HTTP/1.1 ${response.statusCode} ${response.statusMessage}`;
    const headerLines = Object.entries(response.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    return `${statusLine}\r\n${headerLines}\r\n\r\n${response.body ?? ""}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "6px 12px",
          borderBottom: "1px solid #333",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: statusColor(response.statusCode),
            fontFamily: "monospace",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {response.statusCode} {response.statusMessage}
        </span>
        <span style={{ color: "#555", fontSize: "12px" }}>{entry.duration}ms</span>
        <span style={{ color: "#555", fontSize: "12px" }}>
          {formatSize(response.contentLength)}
        </span>
      </div>

      {/* Tab strip */}
      <div style={{ display: "flex", borderBottom: "1px solid #333", flexShrink: 0 }}>
        <button style={tabStyle(activeTab === "body")} onClick={() => setActiveTab("body")}>
          Body
        </button>
        <button style={tabStyle(activeTab === "headers")} onClick={() => setActiveTab("headers")}>
          Headers ({Object.keys(response.headers).length})
        </button>
        <button style={tabStyle(activeTab === "raw")} onClick={() => setActiveTab("raw")}>
          Raw
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {activeTab === "body" && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => copyToClipboard(getBodyDisplay())}
              title="Copy body"
              style={{
                position: "sticky",
                top: 8,
                right: 8,
                float: "right",
                background: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: 3,
                color: "#888",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 8px",
                margin: "8px 8px 0 0",
              }}
            >
              Copy
            </button>
            {response.body ? (
              <pre
                dangerouslySetInnerHTML={{ __html: getBodyHtml() }}
                style={{
                  color: "#ccc",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  margin: 0,
                  padding: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              />
            ) : (
              <div
                style={{
                  color: "#555",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: 16,
                }}
              >
                (empty body)
              </div>
            )}
          </div>
        )}

        {activeTab === "headers" && (
          <div style={{ padding: 12 }}>
            <button
              onClick={() =>
                copyToClipboard(
                  Object.entries(response.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n"),
                )
              }
              style={{
                float: "right",
                background: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: 3,
                color: "#888",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 8px",
              }}
            >
              Copy
            </button>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                {Object.entries(response.headers).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td
                      style={{
                        color: "#88aaff",
                        fontFamily: "monospace",
                        padding: "3px 12px 3px 0",
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k}
                    </td>
                    <td
                      style={{
                        color: "#ccc",
                        fontFamily: "monospace",
                        padding: "3px 0",
                        wordBreak: "break-all",
                      }}
                    >
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "raw" && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => copyToClipboard(getRawResponse())}
              style={{
                position: "sticky",
                top: 8,
                right: 8,
                float: "right",
                background: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: 3,
                color: "#888",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 8px",
                margin: "8px 8px 0 0",
              }}
            >
              Copy
            </button>
            <pre
              style={{
                color: "#ccc",
                fontFamily: "monospace",
                fontSize: "12px",
                margin: 0,
                padding: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {getRawResponse()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
