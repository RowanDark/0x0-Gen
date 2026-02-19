import { useState, useCallback, useEffect } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperTransform } from "@0x0-gen/sdk";

export function useTransforms(
  gateway: GatewayClient,
  activeCanvas: MapperCanvas | null,
  setActiveCanvas: (updater: (prev: MapperCanvas | null) => MapperCanvas | null) => void,
) {
  const [transforms, setTransforms] = useState<MapperTransform[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    gateway.listMapperTransforms().then(setTransforms).catch(() => {});
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
    } catch {
      // fail silently
    } finally {
      setRunning(false);
    }
  }, [gateway, activeCanvas, setActiveCanvas]);

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
