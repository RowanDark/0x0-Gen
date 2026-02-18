import { useState, useCallback, useEffect } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { IntruderConfig } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useConfig() {
  const [configs, setConfigs] = useState<IntruderConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<IntruderConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async (projectId?: string) => {
    setLoading(true);
    try {
      const list = await gateway.listIntruderConfigs(projectId);
      setConfigs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createConfig = useCallback(async (config: Partial<IntruderConfig>) => {
    try {
      const created = await gateway.createIntruderConfig(config);
      setConfigs((prev) => [created, ...prev]);
      setCurrentConfig(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const updateConfig = useCallback(
    async (id: string, data: Partial<IntruderConfig>) => {
      try {
        const updated = await gateway.updateIntruderConfig(id, data);
        setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
        if (currentConfig?.id === id) {
          setCurrentConfig(updated);
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [currentConfig],
  );

  const deleteConfig = useCallback(
    async (id: string) => {
      try {
        await gateway.deleteIntruderConfig(id);
        setConfigs((prev) => prev.filter((c) => c.id !== id));
        if (currentConfig?.id === id) {
          setCurrentConfig(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [currentConfig],
  );

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  return {
    configs,
    currentConfig,
    setCurrentConfig,
    loading,
    error,
    loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
  };
}
