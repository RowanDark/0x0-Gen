import React, { useState, useCallback } from "react";

type BodyFormat = "none" | "json" | "xml" | "form" | "multipart";

interface BodyEditorProps {
  body: string | null;
  onBodyChange: (body: string | null) => void;
  onContentTypeChange?: (contentType: string | null) => void;
}

const FORMAT_CONTENT_TYPES: Record<BodyFormat, string | null> = {
  none: null,
  json: "application/json",
  xml: "application/xml",
  form: "application/x-www-form-urlencoded",
  multipart: "multipart/form-data",
};

function tryPrettifyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function tryPrettifyXml(text: string): string {
  // Basic XML prettifier — no external library
  let result = "";
  let indent = 0;
  const lines = text.replace(/>\s*</g, ">\n<").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("</")) {
      indent = Math.max(0, indent - 1);
    }
    result += "  ".repeat(indent) + trimmed + "\n";
    if (trimmed.startsWith("<") && !trimmed.startsWith("</") && !trimmed.endsWith("/>")) {
      indent++;
    }
  }
  return result.trim();
}

export function BodyEditor({ body, onBodyChange, onContentTypeChange }: BodyEditorProps) {
  const [format, setFormat] = useState<BodyFormat>("none");

  const handleFormatChange = (newFormat: BodyFormat) => {
    setFormat(newFormat);
    const ct = FORMAT_CONTENT_TYPES[newFormat];
    onContentTypeChange?.(ct);
  };

  const handlePrettify = () => {
    if (!body) return;
    if (format === "json") {
      onBodyChange(tryPrettifyJson(body));
    } else if (format === "xml") {
      onBodyChange(tryPrettifyXml(body));
    }
  };

  const charCount = body?.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ color: "#666", fontSize: "11px" }}>Format:</label>
        <select
          value={format}
          onChange={(e) => handleFormatChange(e.target.value as BodyFormat)}
          style={{
            background: "#1a1a1a",
            border: "1px solid #444",
            color: "#ccc",
            fontFamily: "monospace",
            fontSize: "11px",
            padding: "2px 4px",
            cursor: "pointer",
          }}
        >
          <option value="none">None</option>
          <option value="json">JSON</option>
          <option value="xml">XML</option>
          <option value="form">Form URL Encoded</option>
          <option value="multipart">Multipart</option>
        </select>
        {(format === "json" || format === "xml") && (
          <button
            onClick={handlePrettify}
            style={{
              background: "none",
              border: "1px solid #444",
              color: "#888",
              cursor: "pointer",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: 3,
            }}
          >
            Prettify
          </button>
        )}
        <span style={{ marginLeft: "auto", color: "#555", fontSize: "11px" }}>
          {charCount} chars
        </span>
      </div>
      <textarea
        value={body ?? ""}
        onChange={(e) => onBodyChange(e.target.value || null)}
        placeholder="Request body..."
        style={{
          background: "#111",
          border: "1px solid #333",
          color: "#ccc",
          fontFamily: "monospace",
          fontSize: "12px",
          height: 140,
          outline: "none",
          padding: 8,
          resize: "vertical",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
