import React, { useState, useCallback } from "react";
import type { IntruderPayloadSet } from "@0x0-gen/sdk";

interface PayloadListProps {
  payloadSet: IntruderPayloadSet;
  index: number;
  onUpdate: (update: Partial<IntruderPayloadSet>) => void;
  onRemove?: () => void;
}

const BUILTIN_LISTS: Record<string, string[]> = {
  "SQL Injection": [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "\" OR \"1\"=\"1",
    "1 OR 1=1",
    "' UNION SELECT NULL--",
    "admin'--",
    "'; DROP TABLE users--",
  ],
  "XSS Payloads": [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "\"><script>alert(1)</script>",
    "javascript:alert(1)",
  ],
  "Path Traversal": [
    "../",
    "../../",
    "../../../",
    "/etc/passwd",
    "../../etc/passwd",
    "..%2f..%2f",
  ],
  "Common Directories": [
    "admin",
    "login",
    "api",
    "config",
    "backup",
    ".git",
    ".env",
    "robots.txt",
    "phpmyadmin",
  ],
};

export function PayloadList({ payloadSet, index: _index, onUpdate, onRemove }: PayloadListProps) {
  const [text, setText] = useState(payloadSet.payloads.join("\n"));
  const [urlEncode, setUrlEncode] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const syncPayloads = useCallback(
    (raw: string) => {
      setText(raw);
      let payloads = raw
        .split("\n")
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);

      if (prefix || suffix) {
        payloads = payloads.map((p) => `${prefix}${p}${suffix}`);
      }
      if (urlEncode) {
        payloads = payloads.map((p) => encodeURIComponent(p));
      }

      onUpdate({ payloads });
    },
    [onUpdate, prefix, suffix, urlEncode],
  );

  const handleLoadBuiltin = useCallback(
    (name: string) => {
      const list = BUILTIN_LISTS[name];
      if (list) {
        const newText = list.join("\n");
        syncPayloads(newText);
      }
    },
    [syncPayloads],
  );

  const handleDeduplicate = useCallback(() => {
    const unique = [...new Set(text.split("\n").filter((l) => l.length > 0))];
    syncPayloads(unique.join("\n"));
  }, [text, syncPayloads]);

  const handleSort = useCallback(() => {
    const sorted = text
      .split("\n")
      .filter((l) => l.length > 0)
      .sort();
    syncPayloads(sorted.join("\n"));
  }, [text, syncPayloads]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
        <input
          value={payloadSet.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          style={{
            background: "#111",
            border: "1px solid #333",
            borderRadius: 2,
            color: "#ccc",
            fontSize: "11px",
            padding: "1px 4px",
            width: 120,
          }}
        />
        <span style={{ color: "#666", fontSize: "10px" }}>
          {payloadSet.payloads.length} items
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              background: "#5a2a2a",
              border: "1px solid #7a3a3a",
              borderRadius: 3,
              color: "#ffaaaa",
              cursor: "pointer",
              fontSize: "9px",
              marginLeft: "auto",
              padding: "1px 6px",
            }}
          >
            Remove
          </button>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => syncPayloads(e.target.value)}
        placeholder="Enter payloads (one per line)"
        rows={6}
        style={{
          background: "#111",
          border: "1px solid #333",
          borderRadius: 3,
          color: "#ccc",
          fontFamily: "monospace",
          fontSize: "11px",
          padding: 4,
          resize: "vertical",
          width: "100%",
        }}
        spellCheck={false}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <select
          onChange={(e) => {
            if (e.target.value) handleLoadBuiltin(e.target.value);
            e.target.value = "";
          }}
          style={{
            background: "#222",
            border: "1px solid #333",
            borderRadius: 2,
            color: "#aaa",
            fontSize: "10px",
            padding: "1px 4px",
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Load built-in...
          </option>
          {Object.keys(BUILTIN_LISTS).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button onClick={handleDeduplicate} style={smallBtnStyle}>
          Dedup
        </button>
        <button onClick={handleSort} style={smallBtnStyle}>
          Sort
        </button>
      </div>

      <div style={{ alignItems: "center", display: "flex", gap: 6, fontSize: "10px" }}>
        <label style={{ color: "#888" }}>
          <input
            type="checkbox"
            checked={urlEncode}
            onChange={(e) => {
              setUrlEncode(e.target.checked);
              syncPayloads(text);
            }}
          />{" "}
          URL encode
        </label>
        <input
          value={prefix}
          onChange={(e) => {
            setPrefix(e.target.value);
            syncPayloads(text);
          }}
          placeholder="Prefix"
          style={smallInputStyle}
        />
        <input
          value={suffix}
          onChange={(e) => {
            setSuffix(e.target.value);
            syncPayloads(text);
          }}
          placeholder="Suffix"
          style={smallInputStyle}
        />
      </div>
    </div>
  );
}

const smallBtnStyle: React.CSSProperties = {
  background: "#222",
  border: "1px solid #333",
  borderRadius: 2,
  color: "#aaa",
  cursor: "pointer",
  fontSize: "10px",
  padding: "1px 6px",
};

const smallInputStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 2,
  color: "#ccc",
  fontSize: "10px",
  padding: "1px 4px",
  width: 60,
};
