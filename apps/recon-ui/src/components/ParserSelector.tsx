import React from "react";
import type { ImportSourceType } from "@0x0-gen/sdk";

const parserOptions: { value: ImportSourceType; label: string }[] = [
  { value: "spiderfoot", label: "SpiderFoot" },
  { value: "amass", label: "Amass" },
  { value: "subfinder", label: "Subfinder" },
  { value: "ffuf", label: "ffuf" },
  { value: "nuclei", label: "Nuclei" },
  { value: "nmap", label: "Nmap" },
  { value: "httpx", label: "httpx" },
  { value: "theharvester", label: "theHarvester" },
  { value: "shodan", label: "Shodan" },
  { value: "zap", label: "OWASP ZAP" },
  { value: "burp", label: "Burp Suite" },
  { value: "waybackurls", label: "waybackurls" },
  { value: "gau", label: "gau" },
  { value: "custom_json", label: "Custom JSON" },
  { value: "custom_csv", label: "Custom CSV" },
  { value: "custom_txt", label: "Custom TXT" },
];

export interface ParserSelectorProps {
  selected: ImportSourceType | null;
  autoDetected: string | null;
  onChange: (source: ImportSourceType | null) => void;
}

export function ParserSelector({ selected, autoDetected, onChange }: ParserSelectorProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <label style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>Parser:</label>
        {autoDetected && (
          <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "monospace" }}>
            Auto-detected: {autoDetected}
          </span>
        )}
      </div>
      <select
        value={selected ?? ""}
        onChange={(e) => onChange((e.target.value || null) as ImportSourceType | null)}
        style={{
          background: "#111",
          border: "1px solid #333",
          borderRadius: 3,
          color: "#ccc",
          fontFamily: "monospace",
          fontSize: 11,
          padding: "4px 6px",
          outline: "none",
          width: "100%",
        }}
      >
        <option value="">{autoDetected ? `Auto (${autoDetected})` : "Auto-detect"}</option>
        {parserOptions.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}
