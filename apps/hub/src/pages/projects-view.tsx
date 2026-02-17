import React from "react";
import { useProject } from "../hooks/use-project.js";

export function ProjectsView() {
  const { activeProject } = useProject();

  if (!activeProject) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#666",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      >
        Create or select a project to get started
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", fontFamily: "monospace" }}>
      <h2 style={{ fontSize: "18px", color: "#fff", marginBottom: "16px" }}>
        {activeProject.name}
      </h2>
      <div style={{ fontSize: "12px", color: "#666" }}>
        <p>ID: {activeProject.id}</p>
        <p>Created: {new Date(activeProject.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(activeProject.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
