import { useState, useCallback, useEffect } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperTransform } from "@0x0-gen/sdk";

export function useTransforms(
  gateway: GatewayClient,
  activeCanvas: MapperCanvas | null,
  setActiveCanvas: (updater: (prev: MapperCanvas | null) => MapperCanvas | null) => void,
  onError?: (message: string) => void,
  onSuccess?: (message: string) => void,
) {
  const [transforms, setTransforms] = useState<MapperTransform[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    gateway.listMapperTransforms().then(setTransforms).catch((error) => {
      console.error("[useTransforms] Failed to load transforms:", error);
    });
  }, [gateway]);

  const runTransform = useCallback(async (nodeId: string, transformId: string) => {
    if (!activeCanvas) return;
    setRunning(true);
    try {
      const result = await gateway.runTransform(activeCanvas.id, nodeId, transformId);
      setActiveCanvas((prev) =>
        prev
          ? {
              ...prev,
              nodes: [...prev.nodes, ...result.nodes],
              edges: [...prev.edges, ...result.edges],
            }
          : null,
      );
      onSuccess?.(`Transform added ${result.nodes.length} nodes`);
    } catch (error) {
      console.error("[useTransforms] Transform failed:", error);
      onError?.("Transform failed - check console for details");
    } finally {
      setRunning(false);
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError, onSuccess]);

  const getTransformsForType = useCallback((entityType: string) => {
    return transforms.filter((t) => t.inputTypes.includes(entityType as any));
  }, [transforms]);

  return {
    transforms,
    running,
    runTransform,
    getTransformsForType,
  };
}
