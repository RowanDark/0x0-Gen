import React, { useRef } from "react";

interface InputPaneProps {
  value: string;
  onChange: (value: string) => void;
  isLargeInput: boolean;
}

export function InputPane({ value, onChange, isLargeInput }: InputPaneProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const byteCount = new TextEncoder().encode(value).length;

  const handleClear = () => onChange("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch {
      // Clipboard not available
    }
  };

  const handleLoadFile = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#555", fontSize: "10px", textTransform: "uppercase", letterSpacing: 1 }}>
          Input
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handlePaste} style={btnStyle} title="Paste from clipboard">
            Paste
          </button>
          <button onClick={handleLoadFile} style={btnStyle} title="Load from file">
            File
          </button>
          <button onClick={handleClear} style={btnStyle} title="Clear input">
            Clear
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text to transform..."
        style={{
          background: "#111",
          border: "1px solid #333",
          borderRadius: 4,
          color: "#eee",
          flex: 1,
          fontFamily: "monospace",
          fontSize: "13px",
          minHeight: 0,
          outline: "none",
          padding: 10,
          resize: "none",
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: "10px", color: "#555", flexShrink: 0 }}>
        <span>{value.length} chars</span>
        <span>{byteCount} bytes</span>
        {isLargeInput && (
          <span style={{ color: "#cc8800" }}>Large input - auto-run disabled</span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.json,.xml,.html,.csv,.log,*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: 3,
  color: "#888",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "2px 8px",
};
