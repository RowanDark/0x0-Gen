import { useState, useCallback } from "react";

export function useSelection() {
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

  const selectNode = useCallback((id: string, multi = false) => {
    setSelectedEdgeIds(new Set());
    setSelectedNodeIds((prev) => {
      if (multi) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const selectEdge = useCallback((id: string, multi = false) => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds((prev) => {
      if (multi) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const selectAll = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(new Set(nodeIds));
    setSelectedEdgeIds(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
  }, []);

  return {
    selectedNodeIds,
    selectedEdgeIds,
    selectNode,
    selectEdge,
    selectAll,
    clearSelection,
  };
}
