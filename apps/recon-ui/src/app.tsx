import React, { useState, useEffect, useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { EventMessage } from "@0x0-gen/sdk";
import type { ConnectionState } from "@0x0-gen/ui";
import { NotificationToast } from "@0x0-gen/ui";
import {
  useReconProject,
  useReconProjectProvider,
  ProjectContextProvider,
} from "./hooks/useReconProject.js";
import { MapperView } from "@0x0-gen/mapper-components";
import type { EntityToAdd } from "@0x0-gen/mapper-components";
import { Dashboard } from "./components/Dashboard.js";
import { EntityBrowser } from "./components/EntityBrowser.js";
import { ImportModal } from "./components/ImportModal.js";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

type View = "dashboard" | "entities" | "imports" | "graph";

interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error";
}

function AppContent() {
  const { activeProject, gateway } = useReconProject();
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string | undefined>();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingMapperEntity, setPendingMapperEntity] = useState<EntityToAdd | null>(null);

  // Health check
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        await gateway.healthz();
        if (!cancelled) setConnectionState("connected");
      } catch {
        if (!cancelled) setConnectionState("disconnected");
      }
    }
    check();
    const interval = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // WebSocket
  useEffect(() => {
    if (connectionState !== "connected") return;
    gateway.connectWebSocket();

    const unsubscribe = gateway.onEvent((event: EventMessage) => {
      if (event.type === "recon:import:completed") {
        addToast("Import completed", "success");
      }
    });

    return () => { gateway.disconnect(); unsubscribe(); };
  }, [connectionState]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+I: Open import modal
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        setImportModalOpen(true);
      }
      // Ctrl+F: Focus search (handled by entity browser)
      if (e.ctrlKey && e.key === "f" && activeView === "entities") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search values..."]');
        searchInput?.focus();
      }
      // Escape: Close modals
      if (e.key === "Escape") {
        setImportModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNavigate = useCallback((view: string, filter?: string) => {
    if (view === "entities") {
      setEntityFilter(filter);
      setActiveView("entities");
    } else if (view === "graph") {
      setActiveView("graph");
    } else {
      setActiveView(view as View);
    }
  }, []);

  const handleImportComplete = useCallback(() => {
    addToast("Import completed successfully", "success");
  }, [addToast]);

  const handleAddToMapper = useCallback(
    async (entityId: string) => {
      if (!activeProject) return;
      try {
        const entity = await gateway.getReconEntity(activeProject.id, entityId);
        setPendingMapperEntity({
          id: entity.id,
          label: entity.value,
          type: entity.type,
          category: entity.category,
          confidence: entity.confidence,
        });
        setActiveView("graph");
        addToast("Entity added to graph", "success");
      } catch {
        addToast("Failed to add entity to graph", "error");
      }
    },
    [activeProject, gateway, addToast],
  );

  const handleEntityAdded = useCallback(() => {
    setPendingMapperEntity(null);
  }, []);

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#1a1a1a" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid #22c55e" : "2px solid transparent",
    color: active ? "#eee" : "#888",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 12,
    padding: "10px 16px",
    transition: "color 0.15s",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#ccc",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #222",
          background: "#0f0f0f",
          height: 42,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "monospace", fontSize: 14, color: "#eee", fontWeight: 700 }}>
            0x0 Recon
          </span>
          <nav style={{ display: "flex" }}>
            <button style={navBtnStyle(activeView === "dashboard")} onClick={() => setActiveView("dashboard")}>
              Dashboard
            </button>
            <button style={navBtnStyle(activeView === "entities")} onClick={() => { setEntityFilter(undefined); setActiveView("entities"); }}>
              Entities
            </button>
            <button style={navBtnStyle(activeView === "imports")} onClick={() => setImportModalOpen(true)}>
              Import
            </button>
            <button style={navBtnStyle(activeView === "graph")} onClick={() => setActiveView("graph")}>
              Graph
            </button>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                connectionState === "connected"
                  ? "#22c55e"
                  : connectionState === "connecting"
                    ? "#f59e0b"
                    : "#ef4444",
            }}
          />
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#555" }}>
            Ctrl+I Import &middot; Ctrl+F Search &middot; Esc Close
          </span>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {activeView === "dashboard" && (
          <Dashboard onNavigate={handleNavigate} onOpenImport={() => setImportModalOpen(true)} />
        )}
        {activeView === "entities" && (
          <EntityBrowser initialCategory={entityFilter} onAddToMapper={handleAddToMapper} />
        )}
        {activeView === "graph" && activeProject && (
          <MapperView
            projectId={activeProject.id}
            gateway={gateway}
            entityToAdd={pendingMapperEntity}
            onEntityAdded={handleEntityAdded}
          />
        )}
      </main>

      {/* Import modal */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Toasts */}
      <NotificationToast
        toasts={toasts.map((t) => ({ id: t.id, message: t.message, type: t.type }))}
        onDismiss={dismissToast}
      />
    </div>
  );
}

export function App() {
  const projectCtx = useReconProjectProvider();

  return (
    <ProjectContextProvider value={projectCtx}>
      <AppContent />
    </ProjectContextProvider>
  );
}
