import { useState, useCallback, useEffect } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { RepeaterTab, RepeaterRequest, RepeaterHistoryEntry } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

const ACTIVE_TAB_KEY = "repeater:activeTabId";

export function useRepeater() {
  const [tabs, setTabs] = useState<RepeaterTab[]>([]);
  const [activeTabId, setActiveTabIdRaw] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_TAB_KEY);
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEntry, setLastEntry] = useState<RepeaterHistoryEntry | null>(null);

  const setActiveTabId = useCallback((id: string | null) => {
    setActiveTabIdRaw(id);
    if (id) {
      localStorage.setItem(ACTIVE_TAB_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_TAB_KEY);
    }
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;

  const refreshTabs = useCallback(async () => {
    try {
      const result = await gateway.listRepeaterTabs();
      setTabs(result);
      return result;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    refreshTabs().then((result) => {
      if (result.length > 0 && !result.find((t) => t.id === activeTabId)) {
        setActiveTabId(result[0].id);
      }
    });
  }, []);

  const createTab = useCallback(async () => {
    try {
      const currentTabs = await gateway.listRepeaterTabs();
      const name = `Tab ${currentTabs.length + 1}`;
      const tab = await gateway.createRepeaterTab();
      const named = await gateway.updateRepeaterTab(tab.id, { name });
      setTabs((prev) => [named, ...prev]);
      setActiveTabId(named.id);
      return named;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  const closeTab = useCallback(
    async (id: string) => {
      try {
        await gateway.deleteRepeaterTab(id);
        setTabs((prev) => {
          const remaining = prev.filter((t) => t.id !== id);
          if (activeTabId === id) {
            const idx = prev.findIndex((t) => t.id === id);
            const next = remaining[Math.min(idx, remaining.length - 1)] ?? null;
            setActiveTabId(next?.id ?? null);
          }
          return remaining;
        });
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [activeTabId],
  );

  const renameTab = useCallback(async (id: string, name: string) => {
    try {
      const updated = await gateway.updateRepeaterTab(id, { name });
      setTabs((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const updateRequest = useCallback(
    async (request: RepeaterRequest) => {
      if (!activeTab) return;
      try {
        const updated = await gateway.updateRepeaterTab(activeTab.id, { request });
        setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [activeTab],
  );

  const sendRequest = useCallback(async () => {
    if (!activeTab) return;
    setSending(true);
    setError(null);
    try {
      const entry = await gateway.sendRepeaterRequest(activeTab.id);
      setLastEntry(entry);
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTab.id) return t;
          return {
            ...t,
            history: [entry, ...t.history].slice(0, 100),
          };
        }),
      );
      return entry;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }, [activeTab]);

  const clearHistory = useCallback(async () => {
    if (!activeTab) return;
    try {
      await gateway.clearRepeaterHistory(activeTab.id);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, history: [] } : t)),
      );
      setLastEntry(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [activeTab]);

  const parseRaw = useCallback(async (raw: string) => {
    try {
      return await gateway.parseRawRequest(raw);
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  const serializeReq = useCallback(async (request: RepeaterRequest) => {
    try {
      return await gateway.serializeRequest(request);
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    sending,
    error,
    lastEntry,
    setLastEntry,
    createTab,
    closeTab,
    renameTab,
    updateRequest,
    sendRequest,
    clearHistory,
    parseRaw,
    serializeReq,
  };
}
