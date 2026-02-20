import { useState, useCallback, useEffect } from "react";
import { useReconProject } from "./useReconProject.js";

export interface TimelineEntry {
  date: string;
  count: number;
  category: string;
}

export type TimelineRange = "day" | "week" | "month";

export function useTimeline() {
  const { activeProject, gateway } = useReconProject();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [range, setRange] = useState<TimelineRange>("week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const data = await gateway.getReconTimeline(activeProject.id);
      setTimeline(data);
    } catch (err) {
      console.error("[useTimeline] Failed to load timeline:", err);
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, [activeProject, gateway]);

  useEffect(() => {
    loadTimeline();
  }, [activeProject?.id]);

  // Aggregate timeline by range
  const aggregated = aggregateByRange(timeline, range);

  return { timeline: aggregated, range, setRange, loading, error, loadTimeline };
}

function aggregateByRange(entries: TimelineEntry[], range: TimelineRange): TimelineEntry[] {
  if (entries.length === 0) return [];

  const bucketMap = new Map<string, number>();

  for (const entry of entries) {
    const d = new Date(entry.date);
    let key: string;
    if (range === "day") {
      key = entry.date.slice(0, 10);
    } else if (range === "week") {
      const day = d.getDay();
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - day);
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = entry.date.slice(0, 7);
    }
    bucketMap.set(key, (bucketMap.get(key) ?? 0) + entry.count);
  }

  return Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count, category: "all" }));
}
