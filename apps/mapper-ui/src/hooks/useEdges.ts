import { useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperEdge, MapperEdgeStyle } from "@0x0-gen/sdk";

export function useEdges(
  gateway: GatewayClient,
  activeCanvas: MapperCanvas | null,
  setActiveCanvas: (updater: (prev: MapperCanvas | null) => MapperCanvas | null) => void,
) {
  const addEdge = useCallback(async (
    fromNodeId: string,
    toNodeId: string,
    type: string,
    label?: string,
  ) => {
    if (!activeCanvas) return null;
    try {
      const edge = await gateway.addMapperEdge(activeCanvas.id, {
        fromNodeId,
        toNodeId,
        type,
        label,
      });
      setActiveCanvas((prev) =>
        prev ? { ...prev, edges: [...prev.edges, edge] } : null,
      );
      return edge;
    } catch {
      return null;
    }
  }, [gateway, activeCanvas, setActiveCanvas]);

  const deleteEdge = useCallback(async (edgeId: string) => {
    if (!activeCanvas) return;
    try {
      await gateway.deleteMapperEdge(activeCanvas.id, edgeId);
      setActiveCanvas((prev) =>
        prev
          ? { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }
          : null,
      );
    } catch {
      // fail silently
    }
  }, [gateway, activeCanvas, setActiveCanvas]);

  return {
    addEdge,
    deleteEdge,
  };
}
