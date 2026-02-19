import React, { useState, useCallback } from "react";

const commonTags = ["interesting", "critical", "reviewed", "in-scope", "out-of-scope", "follow-up", "confirmed"];

export interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagManager({ tags, onChange }: TagManagerProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInput("");
      setShowSuggestions(false);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const suggestions = commonTags.filter(
    (t) => !tags.includes(t) && t.includes(input.toLowerCase()),
  );

  return (
    <div>
      {/* Current tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 3,
              padding: "2px 6px",
              fontSize: 10,
              fontFamily: "monospace",
              color: "#ccc",
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 11,
                padding: 0,
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>No tags</span>
        )}
      </div>

      {/* Input */}
      <div style={{ position: "relative" }}>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Add tag..."
          style={{
            background: "#111",
            border: "1px solid #333",
            borderRadius: 3,
            color: "#ccc",
            fontFamily: "monospace",
            fontSize: 10,
            padding: "4px 6px",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#111",
              border: "1px solid #333",
              borderRadius: 3,
              marginTop: 2,
              zIndex: 10,
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s}
                onMouseDown={() => addTag(s)}
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "#ccc",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1a1a1a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
