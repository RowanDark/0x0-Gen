import React from "react";
import type { TransformType, TransformDirection } from "@0x0-gen/sdk";

interface QuickActionsProps {
  input: string;
  onExecuteQuick: (type: TransformType, direction: TransformDirection) => void;
  onSmartDecode: () => void;
}

const QUICK_ACTIONS: {
  label: string;
  type: TransformType;
  direction: TransformDirection;
}[] = [
  { label: "URL Decode", type: "url", direction: "decode" },
  { label: "Base64 Decode", type: "base64", direction: "decode" },
  { label: "HTML Decode", type: "html", direction: "decode" },
  { label: "MD5", type: "md5", direction: "encode" },
];

export function QuickActions({ input, onExecuteQuick, onSmartDecode }: QuickActionsProps) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={`${action.type}-${action.direction}`}
          onClick={() => onExecuteQuick(action.type, action.direction)}
          disabled={!input}
          style={quickBtnStyle}
        >
          {action.label}
        </button>
      ))}
      <button
        onClick={onSmartDecode}
        disabled={!input}
        style={{
          ...quickBtnStyle,
          background: "#1a1520",
          borderColor: "#2a2040",
          color: input ? "#bb88dd" : "#555",
        }}
      >
        Smart Decode
      </button>
    </div>
  );
}

// Smart detection logic
export function detectEncoding(input: string): { type: TransformType; direction: TransformDirection } | null {
  // JWT: three dot-separated base64 segments
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(input.trim())) {
    return { type: "jwt", direction: "decode" };
  }

  // URL encoded: contains %XX sequences
  if (/%[0-9A-Fa-f]{2}/.test(input)) {
    return { type: "url", direction: "decode" };
  }

  // Base64: only base64 chars, length multiple of 4 or with padding
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (
    base64Regex.test(input.trim()) &&
    input.trim().length >= 4 &&
    input.trim().length % 4 === 0
  ) {
    return { type: "base64", direction: "decode" };
  }

  // URL-safe base64
  const urlSafeBase64 = /^[A-Za-z0-9_-]+$/;
  if (urlSafeBase64.test(input.trim()) && input.trim().length >= 4) {
    return { type: "base64", direction: "decode" };
  }

  // Hex: continuous hex chars, even length
  if (/^(0x)?[0-9a-fA-F]+$/.test(input.trim()) && input.replace(/^0x/, "").length % 2 === 0) {
    return { type: "hex", direction: "decode" };
  }

  // HTML entities
  if (/&(?:lt|gt|amp|quot|#\d+|#x[0-9a-fA-F]+);/.test(input)) {
    return { type: "html", direction: "decode" };
  }

  // Unicode escapes
  if (/\\u[0-9a-fA-F]{4}/.test(input)) {
    return { type: "unicode", direction: "decode" };
  }

  return null;
}

const quickBtnStyle: React.CSSProperties = {
  background: "#151520",
  border: "1px solid #252540",
  borderRadius: 3,
  color: "#8888bb",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "3px 10px",
};
