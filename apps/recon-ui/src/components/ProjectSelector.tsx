import React, { useState } from "react";
import type { ReconProject } from "@0x0-gen/sdk";

export interface ProjectSelectorProps {
  projects: ReconProject[];
  activeProject: ReconProject | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

export function ProjectSelector({ projects, activeProject, onSelect, onCreate }: ProjectSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName("");
      setCreating(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>Project:</label>
      <select
        value={activeProject?.id ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          background: "#111",
          border: "1px solid #333",
          borderRadius: 3,
          color: "#ccc",
          fontFamily: "monospace",
          fontSize: 12,
          padding: "4px 8px",
          outline: "none",
        }}
      >
        {projects.length === 0 && <option value="">No projects</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 3,
            color: "#888",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 10,
            padding: "3px 8px",
          }}
        >
          + New
        </button>
      ) : (
        <div style={{ display: "flex", gap: 4 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Project name"
            autoFocus
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 3,
              color: "#ccc",
              fontFamily: "monospace",
              fontSize: 11,
              padding: "3px 6px",
              outline: "none",
              width: 140,
            }}
          />
          <button
            onClick={handleCreate}
            style={{
              background: "#22c55e22",
              border: "1px solid #22c55e44",
              borderRadius: 3,
              color: "#22c55e",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "3px 8px",
            }}
          >
            Create
          </button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 3,
              color: "#888",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "3px 8px",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
