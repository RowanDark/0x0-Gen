import { useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperEdge, MapperEdgeStyle } from "@0x0-gen/sdk";

export function useEdges(
  gateway: GatewayClient,
  activeCanvas: MapperCanvas | null,
  setActiveCanvas: (updater: (prev: MapperCanvas | null) => MapperCanvas | null) => void,
  onError?: (message: string) => void,
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
    } catch (error) {
      console.error("[useEdges] Failed to add edge:", error);
      onError?.("Failed to create connection");
      return null;
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError]);

  const deleteEdge = useCallback(async (edgeId: string) => {
    if (!activeCanvas) return;
    try {
      await gateway.deleteMapperEdge(activeCanvas.id, edgeId);
      setActiveCanvas((prev) =>
        prev
          ? { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }
          : null,
      );
    } catch (error) {
      console.error("[useEdges] Failed to delete edge:", error);
      onError?.("Failed to remove connection");
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError]);

  return {
    addEdge,
    deleteEdge,
  };
}
