import React from "react";
import type { MapperCanvas } from "@0x0-gen/sdk";

interface ExportMenuProps {
  canvas: MapperCanvas;
  onClose: () => void;
}

export function ExportMenu({ canvas, onClose }: ExportMenuProps) {
  const exportAsJson = () => {
    const data = JSON.stringify(canvas, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${canvas.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportAsSvg = () => {
    const svgEl = document.querySelector("[data-testid='mapper-canvas']");
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Add background to export
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#0a0a0a");
    clone.insertBefore(bg, clone.firstChild);

    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${canvas.name.replace(/\s+/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 40,
          right: 12,
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 6,
          padding: 4,
          zIndex: 1000,
          fontFamily: "monospace",
          fontSize: 12,
          minWidth: 150,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={exportAsJson}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 12px",
            background: "transparent",
            color: "#e5e7eb",
            border: "none",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 12,
            borderRadius: 3,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#22c55e20"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
        >
          Export as JSON
        </button>
        <button
          onClick={exportAsSvg}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 12px",
            background: "transparent",
            color: "#e5e7eb",
            border: "none",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 12,
            borderRadius: 3,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#22c55e20"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
        >
          Export as SVG
        </button>
      </div>
    </>
  );
}
