import { useState, useCallback, useEffect, useRef } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperNode, MapperEdge, MapperViewport } from "@0x0-gen/sdk";

export function useCanvas(gateway: GatewayClient, projectId: string | null) {
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
      setError("Failed to load canvases");
    }
  }, [gateway, projectId]);

  const loadCanvas = useCallback(async (canvasId: string) => {
    setLoading(true);
    setError(null);
    try {
      const canvas = await gateway.getMapperCanvas(canvasId);
      setActiveCanvas(canvas);
    } catch (err) {
      setError("Failed to load canvas");
    } finally {
      setLoading(false);
    }
  }, [gateway]);

  const createCanvas = useCallback(async (name: string) => {
    if (!projectId) return null;
    try {
      const canvas = await gateway.createMapperCanvas(projectId, name);
      setCanvases((prev) => [canvas, ...prev]);
      setActiveCanvas(canvas);
      return canvas;
    } catch (err) {
      setError("Failed to create canvas");
      return null;
    }
  }, [gateway, projectId]);

  const deleteCanvas = useCallback(async (canvasId: string) => {
    try {
      await gateway.deleteMapperCanvas(canvasId);
      setCanvases((prev) => prev.filter((c) => c.id !== canvasId));
      if (activeCanvas?.id === canvasId) {
        setActiveCanvas(null);
      }
    } catch (err) {
      setError("Failed to delete canvas");
    }
  }, [gateway, activeCanvas]);

  const saveViewport = useCallback((viewport: MapperViewport) => {
    if (!activeCanvas) return;
    // Debounced save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await gateway.updateMapperCanvas(activeCanvas.id, { viewport });
      } catch {
        // Silent fail on viewport save
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
      setError("Failed to auto-layout");
    }
  }, [gateway, activeCanvas]);

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
