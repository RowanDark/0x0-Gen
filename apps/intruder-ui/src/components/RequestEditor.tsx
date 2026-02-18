import React, { useCallback, useRef } from "react";
import type { IntruderPosition } from "@0x0-gen/sdk";

interface RequestEditorProps {
  value: string;
  onChange: (value: string) => void;
  positions: IntruderPosition[];
  onAddPosition: (start: number, end: number) => void;
  onRemovePosition: (id: string) => void;
  onClearPositions: () => void;
}

const MARKER = "\u00A7";

export function RequestEditor({
  value,
  onChange,
  positions,
  onAddPosition,
  onRemovePosition,
  onClearPositions,
}: RequestEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAddPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return; // No selection

    // Insert markers around selection
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const newValue = `${before}${MARKER}${selected}${MARKER}${after}`;
    onChange(newValue);

    // Add position with marker-inclusive indices
    onAddPosition(start, end + 2);
  }, [value, onChange, onAddPosition]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 8,
          marginBottom: 8,
          paddingBottom: 8,
        }}
      >
        <span style={{ color: "#888", fontSize: "11px" }}>Request</span>
        <button
          onClick={handleAddPosition}
          style={{
            background: "#2a5a2a",
            border: "1px solid #3a7a3a",
            borderRadius: 3,
            color: "#aaffaa",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px 8px",
          }}
          title="Select text in the editor then click to mark as position"
        >
          Add Position
        </button>
        <button
          onClick={onClearPositions}
          style={{
            background: "#333",
            border: "1px solid #444",
            borderRadius: 3,
            color: "#aaa",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px 8px",
          }}
        >
          Clear All
        </button>
        <span style={{ color: "#666", fontSize: "10px", marginLeft: "auto" }}>
          {positions.length} position{positions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {positions.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: 8,
          }}
        >
          {positions.map((pos, i) => (
            <span
              key={pos.id}
              style={{
                alignItems: "center",
                background: `hsl(${i * 60}, 40%, 20%)`,
                border: `1px solid hsl(${i * 60}, 40%, 35%)`,
                borderRadius: 3,
                color: `hsl(${i * 60}, 70%, 70%)`,
                display: "inline-flex",
                fontSize: "10px",
                gap: 4,
                padding: "1px 6px",
              }}
            >
              {pos.name ?? `pos${i + 1}`}
              <button
                onClick={() => onRemovePosition(pos.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: "10px",
                  padding: 0,
                }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Paste raw HTTP request here...\n\nExample:\nGET /search?q=${MARKER}test${MARKER} HTTP/1.1\nHost: example.com\n\nUse ${MARKER} markers or select text and click "Add Position"`}
        style={{
          background: "#111",
          border: "1px solid #333",
          borderRadius: 3,
          color: "#ccc",
          flex: 1,
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: 1.4,
          minHeight: 200,
          padding: 8,
          resize: "none",
          width: "100%",
        }}
        spellCheck={false}
      />
    </div>
  );
}
