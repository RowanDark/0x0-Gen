import React, { useEffect, useState } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { ConnectionState } from "@0x0-gen/ui";
import { ProjectProvider } from "./hooks/use-project.js";
import { Header } from "./components/header.js";
import { Sidebar } from "./components/sidebar.js";
import { ProjectsView } from "./pages/projects-view.js";
import { ToolsView } from "./pages/tools-view.js";
import { SettingsView } from "./pages/settings-view.js";

const gateway = new GatewayClient({
  baseUrl: window.location.origin,
});

type View = "projects" | "tools" | "settings";

function AppContent() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [uptime, setUptime] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<View>("projects");

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const health = await gateway.healthz();
        if (!cancelled) {
          setConnectionState("connected");
          setUptime(health.uptime);
        }
      } catch {
        if (!cancelled) {
          setConnectionState("disconnected");
          setUptime(null);
        }
      }
    }

    checkHealth();

    const interval = setInterval(checkHealth, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (connectionState !== "connected") return;

    gateway.connectWebSocket();

    gateway.onEvent((event) => {
      // eslint-disable-next-line no-console
      console.log("[hub] event:", event.type, event);
    });

    return () => {
      gateway.disconnect();
    };
  }, [connectionState]);

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
      <Header connectionState={connectionState} uptime={uptime} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main style={{ flex: 1, overflow: "auto" }}>
          {activeView === "projects" && <ProjectsView />}
          {activeView === "tools" && <ToolsView />}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
