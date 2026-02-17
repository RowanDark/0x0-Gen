import React, { useEffect, useState } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import { ConnectionStatus, type ConnectionState } from "@0x0-gen/ui";

const gateway = new GatewayClient({
  baseUrl: window.location.origin,
});

export function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [uptime, setUptime] = useState<number | null>(null);

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
    <div style={{ padding: "24px", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>0x0-Gen Hub</h1>
      <ConnectionStatus state={connectionState} />
      {uptime !== null && (
        <p style={{ marginTop: "8px", fontSize: "12px", color: "#888" }}>
          Gateway uptime: {Math.round(uptime / 1000)}s
        </p>
      )}
    </div>
  );
}
