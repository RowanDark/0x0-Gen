import React, { useRef, useState, useCallback } from "react";

const ACCEPTED_TYPES = [".json", ".csv", ".xml", ".txt"];

export interface ImportDropzoneProps {
  onFilesAdded: (files: File[]) => void;
}

export function ImportDropzone({ onFilesAdded }: ImportDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      onFilesAdded(files);
    },
    [onFilesAdded],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      onFilesAdded(files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFilesAdded],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? "#22c55e" : "#333"}`,
        borderRadius: 6,
        padding: "32px 16px",
        textAlign: "center",
        cursor: "pointer",
        background: dragOver ? "#22c55e08" : "#0f0f0f",
        transition: "all 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileInput}
        style={{ display: "none" }}
      />
      <div style={{ fontSize: 24, marginBottom: 8, color: dragOver ? "#22c55e" : "#555" }}>
        {dragOver ? "\u2913" : "\u2191"}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 12, color: dragOver ? "#22c55e" : "#888", marginBottom: 4 }}>
        {dragOver ? "Drop files here" : "Drag & drop files or click to browse"}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#555" }}>
        Accepts: {ACCEPTED_TYPES.join(", ")} (max 100MB)
      </div>
    </div>
  );
}
