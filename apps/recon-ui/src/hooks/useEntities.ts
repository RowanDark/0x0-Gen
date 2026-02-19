import { useState, useCallback, useEffect, useRef } from "react";
import type { ReconEntity, EntityCategory, EntityType } from "@0x0-gen/sdk";
import { useReconProject } from "./useReconProject.js";

export interface EntityFilters {
  categories: EntityCategory[];
  types: EntityType[];
  sources: string[];
  tags: string[];
  search: string;
  dateFrom: number | null;
  dateTo: number | null;
  sort: "value" | "firstSeen" | "lastSeen" | "confidence";
}

const defaultFilters: EntityFilters = {
  categories: [],
  types: [],
  sources: [],
  tags: [],
  search: "",
  dateFrom: null,
  dateTo: null,
  sort: "firstSeen",
};

export function useEntities() {
  const { activeProject, gateway } = useReconProject();
  const [entities, setEntities] = useState<ReconEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EntityFilters>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 100;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchEntities = useCallback(
    async (currentFilters: EntityFilters, currentPage: number) => {
      if (!activeProject) return;
      setLoading(true);
      setError(null);
      try {
        const result = await gateway.listReconEntities(activeProject.id, {
          category: currentFilters.categories.length === 1 ? currentFilters.categories[0] : undefined,
          type: currentFilters.types.length === 1 ? currentFilters.types[0] : undefined,
          source: currentFilters.sources.length === 1 ? currentFilters.sources[0] : undefined,
          tag: currentFilters.tags.length === 1 ? currentFilters.tags[0] : undefined,
          search: currentFilters.search || undefined,
          sort: currentFilters.sort,
          limit: pageSize,
          offset: currentPage * pageSize,
        });
        setEntities(result.entities);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entities");
      } finally {
        setLoading(false);
      }
    },
    [activeProject, gateway],
  );

  const updateFilters = useCallback(
    (update: Partial<EntityFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...update };
        setPage(0);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          fetchEntities(next, 0);
        }, update.search !== undefined ? 300 : 0);
        return next;
      });
    },
    [fetchEntities],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(0);
    fetchEntities(defaultFilters, 0);
  }, [fetchEntities]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntities(filters, nextPage);
  }, [page, filters, fetchEntities]);

  const refresh = useCallback(() => {
    fetchEntities(filters, page);
  }, [filters, page, fetchEntities]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(entities.map((e) => e.id)));
  }, [entities]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (activeProject) {
      setFilters(defaultFilters);
      setPage(0);
      fetchEntities(defaultFilters, 0);
    }
  }, [activeProject?.id]);

  return {
    entities,
    total,
    loading,
    error,
    filters,
    selectedIds,
    page,
    pageSize,
    updateFilters,
    clearFilters,
    loadMore,
    refresh,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
