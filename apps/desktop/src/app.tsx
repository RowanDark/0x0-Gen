import React, { useEffect, useState } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import { ConnectionStatus, type ConnectionState } from "@0x0-gen/ui";

const GATEWAY_URL = "http://localhost:3100";

const gateway = new GatewayClient({ baseUrl: GATEWAY_URL });

export function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        await gateway.healthz();
        if (!cancelled) setConnectionState("connected");
      } catch {
        if (!cancelled) setConnectionState("disconnected");
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
    return () => gateway.disconnect();
  }, [connectionState]);

  return (
    <div style={{ padding: "24px", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>0x0-Gen Desktop</h1>
      <ConnectionStatus state={connectionState} />
    </div>
  );
}
