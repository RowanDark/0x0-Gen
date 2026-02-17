import { useState, useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { RepeaterTab, RepeaterRequest } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useTabs() {
  const [tabs, setTabs] = useState<RepeaterTab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTabs = useCallback(async (projectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gateway.listRepeaterTabs(projectId);
      setTabs(result);
      return result;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTab = useCallback(
    async (name?: string, projectId?: string): Promise<RepeaterTab | null> => {
      setError(null);
      try {
        const tab = await gateway.createRepeaterTab(projectId);
        if (name) {
          const renamed = await gateway.updateRepeaterTab(tab.id, { name });
          setTabs((prev) => [...prev, renamed]);
          return renamed;
        }
        setTabs((prev) => {
          const newName = `Tab ${prev.length + 1}`;
          const namedTab = { ...tab, name: newName };
          gateway.updateRepeaterTab(tab.id, { name: newName }).catch(() => {});
          return [...prev, namedTab];
        });
        return tab;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [],
  );

  const updateTab = useCallback(
    async (
      id: string,
      data: { name?: string; request?: RepeaterRequest },
    ): Promise<RepeaterTab | null> => {
      setError(null);
      try {
        const updated = await gateway.updateRepeaterTab(id, data);
        setTabs((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [],
  );

  const deleteTab = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await gateway.deleteRepeaterTab(id);
      setTabs((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }, []);

  return {
    tabs,
    setTabs,
    loading,
    error,
    loadTabs,
    createTab,
    updateTab,
    deleteTab,
    gateway,
  };
}
