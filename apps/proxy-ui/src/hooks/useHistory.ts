import { useState, useCallback, useEffect, useRef } from "react";
import type { CapturedExchange, EventMessage } from "@0x0-gen/sdk";
import { GatewayClient } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useHistory(projectId?: string) {
  const [exchanges, setExchanges] = useState<CapturedExchange[]>([]);
  const [loading, setLoading] = useState(false);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  const loadHistory = useCallback(
    async (options?: { limit?: number; offset?: number }) => {
      setLoading(true);
      try {
        const data = await gateway.getProxyHistory({
          projectId,
          limit: options?.limit ?? 200,
          offset: options?.offset ?? 0,
        });
        setExchanges(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Subscribe to real-time updates
  useEffect(() => {
    gateway.connectWebSocket();

    const unsubscribe = gateway.onEvent((event: EventMessage) => {
      if (event.type === "proxy:response") {
        // Reload history when a response is captured
        gateway
          .getProxyHistory({
            projectId: projectIdRef.current,
            limit: 200,
          })
          .then((data) => {
            setExchanges(data);
          })
          .catch(() => {});
      }
    });

    return () => {
      unsubscribe();
      gateway.disconnect();
    };
  }, []);

  const clearHistory = useCallback(async () => {
    await gateway.clearProxyHistory(projectId);
    setExchanges([]);
  }, [projectId]);

  return {
    exchanges,
    loading,
    loadHistory,
    clearHistory,
  };
}
