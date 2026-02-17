import { useState, useCallback } from "react";
import type { CapturedExchange } from "@0x0-gen/sdk";
import { GatewayClient } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useExchange() {
  const [exchange, setExchange] = useState<CapturedExchange | null>(null);
  const [loading, setLoading] = useState(false);

  const selectExchange = useCallback((ex: CapturedExchange | null) => {
    setExchange(ex);
  }, []);

  const loadExchange = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await gateway.getExchange(id);
      setExchange(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    exchange,
    loading,
    selectExchange,
    loadExchange,
  };
}
