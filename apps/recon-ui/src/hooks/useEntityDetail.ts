import { useState, useCallback } from "react";
import type { ReconEntity, ReconRelationship } from "@0x0-gen/sdk";
import { useReconProject } from "./useReconProject.js";

export interface EntityDetailState {
  entity: (ReconEntity & { relationships: ReconRelationship[] }) | null;
  loading: boolean;
  error: string | null;
}

export function useEntityDetail() {
  const { activeProject, gateway } = useReconProject();
  const [entity, setEntity] = useState<(ReconEntity & { relationships: ReconRelationship[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntity = useCallback(
    async (entityId: string) => {
      if (!activeProject) return;
      setLoading(true);
      setError(null);
      try {
        const detail = await gateway.getReconEntity(activeProject.id, entityId);
        setEntity(detail);
      } catch (err) {
        console.error("[useEntityDetail] Failed to load entity:", err);
        setError(err instanceof Error ? err.message : "Failed to load entity");
      } finally {
        setLoading(false);
      }
    },
    [activeProject, gateway],
  );

  const updateTags = useCallback(
    async (tags: string[]) => {
      if (!activeProject || !entity) return;
      try {
        const updated = await gateway.updateReconEntity(activeProject.id, entity.id, { tags });
        setEntity((prev) => (prev ? { ...prev, tags: updated.tags } : null));
      } catch (err) {
        console.error("[useEntityDetail] Failed to update tags:", err);
        setError(err instanceof Error ? err.message : "Failed to update tags");
      }
    },
    [activeProject, entity, gateway],
  );

  const updateNotes = useCallback(
    async (notes: string) => {
      if (!activeProject || !entity) return;
      try {
        const updated = await gateway.updateReconEntity(activeProject.id, entity.id, { notes });
        setEntity((prev) => (prev ? { ...prev, notes: updated.notes } : null));
      } catch (err) {
        console.error("[useEntityDetail] Failed to update notes:", err);
        setError(err instanceof Error ? err.message : "Failed to update notes");
      }
    },
    [activeProject, entity, gateway],
  );

  const deleteEntity = useCallback(async () => {
    if (!activeProject || !entity) return;
    await gateway.deleteReconEntity(activeProject.id, entity.id);
    setEntity(null);
  }, [activeProject, entity, gateway]);

  const close = useCallback(() => {
    setEntity(null);
    setError(null);
  }, []);

  return {
    entity,
    loading,
    error,
    loadEntity,
    updateTags,
    updateNotes,
    deleteEntity,
    close,
  };
}
