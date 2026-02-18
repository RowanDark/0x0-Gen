import { useState, useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useHistory(tabId: string | null) {
  const [history, setHistory] = useState<RepeaterHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<RepeaterHistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!tabId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const tab = await gateway.getRepeaterTab(tabId);
      setHistory(tab.history);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tabId]);

  const addEntry = useCallback((entry: RepeaterHistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const clearHistory = useCallback(async () => {
    if (!tabId) return;
    try {
      await gateway.clearRepeaterHistory(tabId);
      setHistory([]);
      setSelectedEntry(null);
    } catch {
      // ignore
    }
  }, [tabId]);

  return {
    history,
    setHistory,
    selectedEntry,
    setSelectedEntry,
    loading,
    loadHistory,
    addEntry,
    clearHistory,
  };
}
