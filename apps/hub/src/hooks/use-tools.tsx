import { useState, useEffect, useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { ToolStatus } from "@0x0-gen/ui";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export interface ToolInfo {
  name: string;
  status: ToolStatus;
  milestone?: string;
  devPort?: number;
}

const ALL_TOOLS: ToolInfo[] = [
  { name: "Proxy", status: "stopped", milestone: "Milestone 2", devPort: 3001 },
  { name: "Repeater", status: "stopped", milestone: "Milestone 3", devPort: 3002 },
  { name: "Decoder", status: "stopped", milestone: "Milestone 3", devPort: 3003 },
  { name: "Intruder", status: "stopped", milestone: "Milestone 4", devPort: 3004 },
];

export function useTools() {
  const [tools, setTools] = useState<ToolInfo[]>(ALL_TOOLS);
  const [attachToken, setAttachToken] = useState<string | null>(null);

  const refreshTools = useCallback(async () => {
    try {
      const connected = await gateway.getConnectedTools();
      const connectedNames = new Set(connected.map((t) => t.name));

      setTools(
        ALL_TOOLS.map((tool) => ({
          ...tool,
          status: connectedNames.has(tool.name.toLowerCase()) ? "attached" : tool.status,
        })),
      );
    } catch {
      setTools(ALL_TOOLS);
    }
  }, []);

  useEffect(() => {
    refreshTools();
    const interval = setInterval(refreshTools, 5000);
    return () => clearInterval(interval);
  }, [refreshTools]);

  const generateToken = useCallback(async () => {
    const { token } = await gateway.generateAttachToken();
    setAttachToken(token);
    return token;
  }, []);

  const detachTool = useCallback(
    async (name: string) => {
      await gateway.detachTool(name.toLowerCase());
      await refreshTools();
    },
    [refreshTools],
  );

  return {
    tools,
    attachToken,
    generateToken,
    detachTool,
    refreshTools,
  };
}
