import { useState, useCallback, useEffect, useRef } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperNode, MapperEdge, MapperViewport } from "@0x0-gen/sdk";

export function useCanvas(
  gateway: GatewayClient,
  projectId: string | null,
  onError?: (message: string) => void,
) {
  const [canvases, setCanvases] = useState<MapperCanvas[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<MapperCanvas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCanvases = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await gateway.listMapperCanvases(projectId);
      setCanvases(list);
    } catch (err) {
      console.error("[useCanvas] Failed to load canvases:", err);
      setError("Failed to load canvases");
      onError?.("Failed to load canvases");
    }
  }, [gateway, projectId, onError]);

  const loadCanvas = useCallback(async (canvasId: string) => {
    setLoading(true);
    setError(null);
    try {
      const canvas = await gateway.getMapperCanvas(canvasId);
      setActiveCanvas(canvas);
    } catch (err) {
      console.error("[useCanvas] Failed to load canvas:", err);
      setError("Failed to load canvas");
      onError?.("Failed to load canvas");
    } finally {
      setLoading(false);
    }
  }, [gateway, onError]);

  const createCanvas = useCallback(async (name: string) => {
    if (!projectId) return null;
    try {
      const canvas = await gateway.createMapperCanvas(projectId, name);
      setCanvases((prev) => [canvas, ...prev]);
      setActiveCanvas(canvas);
      return canvas;
    } catch (err) {
      console.error("[useCanvas] Failed to create canvas:", err);
      setError("Failed to create canvas");
      onError?.("Failed to create canvas");
      return null;
    }
  }, [gateway, projectId, onError]);

  const deleteCanvas = useCallback(async (canvasId: string) => {
    try {
      await gateway.deleteMapperCanvas(canvasId);
      setCanvases((prev) => prev.filter((c) => c.id !== canvasId));
      if (activeCanvas?.id === canvasId) {
        setActiveCanvas(null);
      }
    } catch (err) {
      console.error("[useCanvas] Failed to delete canvas:", err);
      setError("Failed to delete canvas");
      onError?.("Failed to delete canvas");
    }
  }, [gateway, activeCanvas, onError]);

  const saveViewport = useCallback((viewport: MapperViewport) => {
    if (!activeCanvas) return;
    // Debounced save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await gateway.updateMapperCanvas(activeCanvas.id, { viewport });
      } catch (error) {
        console.error("[useCanvas] Failed to save viewport:", error);
      }
    }, 1000);

    setActiveCanvas((prev) => prev ? { ...prev, viewport } : null);
  }, [gateway, activeCanvas]);

  const autoLayout = useCallback(async () => {
    if (!activeCanvas) return;
    try {
      const updated = await gateway.autoLayoutCanvas(activeCanvas.id);
      setActiveCanvas(updated);
    } catch (err) {
      console.error("[useCanvas] Failed to auto-layout:", err);
      setError("Failed to auto-layout");
      onError?.("Failed to auto-layout canvas");
    }
  }, [gateway, activeCanvas, onError]);

  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases]);

  return {
    canvases,
    activeCanvas,
    setActiveCanvas,
    loading,
    error,
    fetchCanvases,
    loadCanvas,
    createCanvas,
    deleteCanvas,
    saveViewport,
    autoLayout,
  };
}
