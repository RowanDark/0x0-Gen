import { useCallback, useRef } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperCanvas, MapperNode, MapperNodeStyle } from "@0x0-gen/sdk";

export function useNodes(
  gateway: GatewayClient,
  activeCanvas: MapperCanvas | null,
  setActiveCanvas: (updater: (prev: MapperCanvas | null) => MapperCanvas | null) => void,
  onError?: (message: string) => void,
) {
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number } | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addNodes = useCallback(async (
    nodes: Array<{
      entityId?: string;
      type: string;
      label: string;
      x?: number;
      y?: number;
    }>,
  ) => {
    if (!activeCanvas) return [];
    try {
      const added = await gateway.addMapperNodes(activeCanvas.id, nodes);
      setActiveCanvas((prev) =>
        prev ? { ...prev, nodes: [...prev.nodes, ...added] } : null,
      );
      return added;
    } catch (error) {
      console.error("[useNodes] Failed to add nodes:", error);
      onError?.("Failed to add nodes to canvas");
      return [];
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError]);

  const addFromEntities = useCallback(async (entityIds: string[]) => {
    if (!activeCanvas) return;
    try {
      const { nodes, edges } = await gateway.addNodesFromEntities(
        activeCanvas.id,
        entityIds,
      );
      setActiveCanvas((prev) =>
        prev
          ? {
              ...prev,
              nodes: [...prev.nodes, ...nodes],
              edges: [...prev.edges, ...edges],
            }
          : null,
      );
    } catch (error) {
      console.error("[useNodes] Failed to add nodes from entities:", error);
      onError?.("Failed to add entities to canvas");
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError]);

  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setActiveCanvas((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, x, y } : n,
        ),
      };
    });

    // Debounced save to server
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (!activeCanvas) return;
      try {
        await gateway.updateMapperNode(activeCanvas.id, nodeId, { x, y });
      } catch (error) {
        console.error("[useNodes] Failed to save node position:", error);
      }
    }, 500);
  }, [gateway, activeCanvas, setActiveCanvas]);

  const updateNode = useCallback(async (
    nodeId: string,
    data: { pinned?: boolean; label?: string; style?: MapperNodeStyle },
  ) => {
    if (!activeCanvas) return;
    try {
      const updated = await gateway.updateMapperNode(activeCanvas.id, nodeId, data);
      setActiveCanvas((prev) =>
        prev
          ? {
              ...prev,
              nodes: prev.nodes.map((n) => (n.id === nodeId ? updated : n)),
            }
          : null,
      );
    } catch (error) {
      console.error("[useNodes] Failed to update node:", error);
      onError?.("Failed to update node");
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError]);

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!activeCanvas) return;
    try {
      await gateway.deleteMapperNode(activeCanvas.id, nodeId);
      setActiveCanvas((prev) =>
        prev
          ? {
              ...prev,
              nodes: prev.nodes.filter((n) => n.id !== nodeId),
              edges: prev.edges.filter(
                (e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId,
              ),
            }
          : null,
      );
    } catch (error) {
      console.error("[useNodes] Failed to delete node:", error);
      onError?.("Failed to delete node");
    }
  }, [gateway, activeCanvas, setActiveCanvas, onError]);

  const startDrag = useCallback((nodeId: string, clientX: number, clientY: number) => {
    dragRef.current = { nodeId, startX: clientX, startY: clientY };
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number, zoom: number) => {
    if (!dragRef.current) return false;
    const { nodeId, startX, startY } = dragRef.current;
    const dx = (clientX - startX) / zoom;
    const dy = (clientY - startY) / zoom;
    dragRef.current = { nodeId, startX: clientX, startY: clientY };

    setActiveCanvas((prev) => {
      if (!prev) return null;
      const node = prev.nodes.find((n) => n.id === nodeId);
      if (!node) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n,
        ),
      };
    });
    return true;
  }, [setActiveCanvas]);

  const endDrag = useCallback(() => {
    if (!dragRef.current || !activeCanvas) {
      dragRef.current = null;
      return;
    }
    const { nodeId } = dragRef.current;
    dragRef.current = null;

    // Save final position
    const node = activeCanvas.nodes.find((n) => n.id === nodeId);
    if (node) {
      gateway.updateMapperNode(activeCanvas.id, nodeId, { x: node.x, y: node.y }).catch((error) => {
        console.error("[useNodes] Failed to save drag position:", error);
      });
    }
  }, [gateway, activeCanvas]);

  return {
    addNodes,
    addFromEntities,
    updateNodePosition,
    updateNode,
    deleteNode,
    startDrag,
    moveDrag,
    endDrag,
    isDragging: () => dragRef.current !== null,
    draggingNodeId: () => dragRef.current?.nodeId ?? null,
  };
}
