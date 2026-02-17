import React, { useState } from "react";
import { useProject } from "../hooks/use-project.js";

type View = "projects" | "tools" | "settings";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { projects, activeProject, selectProject, createProject, deleteProject, updateProject } =
    useProject();
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    await createProject(name);
    setNewName("");
    setShowCreateInput(false);
  }

  async function handleRename(id: string) {
    const name = renameName.trim();
    if (!name) return;
    await updateProject(id, name);
    setRenameId(null);
    setRenameName("");
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setConfirmDeleteId(null);
  }

  const navItems: { key: View; label: string }[] = [
    { key: "projects", label: "Projects" },
    { key: "tools", label: "Tools" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: "#0d0d0d",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <nav style={{ padding: "12px 0" }}>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onViewChange(item.key)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 16px",
              border: "none",
              background: activeView === item.key ? "#1a1a2e" : "transparent",
              color: activeView === item.key ? "#fff" : "#888",
              fontSize: "13px",
              fontFamily: "monospace",
              textAlign: "left",
              cursor: "pointer",
              borderLeft: activeView === item.key ? "2px solid #5a5aff" : "2px solid transparent",
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div
        style={{
          borderTop: "1px solid #2a2a2a",
          padding: "12px",
          flex: 1,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase" }}>
            Projects
          </span>
          <button
            onClick={() => setShowCreateInput(true)}
            style={{
              background: "none",
              border: "1px solid #333",
              color: "#888",
              fontSize: "12px",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "3px",
              fontFamily: "monospace",
            }}
          >
            +
          </button>
        </div>

        {showCreateInput && (
          <div style={{ marginBottom: "8px" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setShowCreateInput(false);
                  setNewName("");
                }
              }}
              placeholder="Project name"
              autoFocus
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "#fff",
                fontSize: "12px",
                fontFamily: "monospace",
                borderRadius: "3px",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {projects.map((project) => (
          <div
            key={project.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              background: activeProject?.id === project.id ? "#1a1a2e" : "transparent",
              marginBottom: "2px",
            }}
            onClick={() => selectProject(project.id)}
          >
            {renameId === project.id ? (
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(project.id);
                  if (e.key === "Escape") {
                    setRenameId(null);
                    setRenameName("");
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  flex: 1,
                  padding: "2px 4px",
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  color: "#fff",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  borderRadius: "3px",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: "12px",
                  color: activeProject?.id === project.id ? "#fff" : "#aaa",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {project.name}
              </span>
            )}

            {confirmDeleteId === project.id ? (
              <div
                style={{ display: "flex", gap: "4px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleDelete(project.id)}
                  style={{
                    background: "#ff4444",
                    border: "none",
                    color: "#fff",
                    fontSize: "10px",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    background: "#333",
                    border: "none",
                    color: "#aaa",
                    fontSize: "10px",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <div
                style={{ display: "flex", gap: "4px", opacity: 0.5 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setRenameId(project.id);
                    setRenameName(project.name);
                  }}
                  title="Rename"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888",
                    fontSize: "10px",
                    cursor: "pointer",
                    padding: "2px",
                    fontFamily: "monospace",
                  }}
                >
                  ren
                </button>
                <button
                  onClick={() => setConfirmDeleteId(project.id)}
                  title="Delete"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888",
                    fontSize: "10px",
                    cursor: "pointer",
                    padding: "2px",
                    fontFamily: "monospace",
                  }}
                >
                  del
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
