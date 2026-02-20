import { useState, useCallback, useEffect } from "react";
import { useReconProject } from "./useReconProject.js";

export interface ReconStats {
  total: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  bySources: Record<string, number>;
  importCount: number;
  recentImportCount: number;
}

const emptyStats: ReconStats = {
  total: 0,
  byCategory: {},
  byType: {},
  bySources: {},
  importCount: 0,
  recentImportCount: 0,
};

export function useStats() {
  const { activeProject, gateway } = useReconProject();
  const [stats, setStats] = useState<ReconStats>(emptyStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await gateway.getReconStats(activeProject.id);
      setStats({
        total: (raw.total as number) ?? 0,
        byCategory: (raw.byCategory as Record<string, number>) ?? {},
        byType: (raw.byType as Record<string, number>) ?? {},
        bySources: (raw.bySources as Record<string, number>) ?? {},
        importCount: (raw.importCount as number) ?? 0,
        recentImportCount: (raw.recentImportCount as number) ?? 0,
      });
    } catch (err) {
      console.error("[useStats] Failed to load stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [activeProject, gateway]);

  useEffect(() => {
    loadStats();
  }, [activeProject?.id]);

  return { stats, loading, error, loadStats };
}
