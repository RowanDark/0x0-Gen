import React, { useState, useEffect, useCallback, useRef } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { MapperNode } from "@0x0-gen/sdk";
import { NotificationToast } from "@0x0-gen/ui";
import { useCanvas } from "./hooks/useCanvas.js";
import { useNodes } from "./hooks/useNodes.js";
import { useEdges } from "./hooks/useEdges.js";
import { useViewport } from "./hooks/useViewport.js";
import { useSelection } from "./hooks/useSelection.js";
import { useTransforms } from "./hooks/useTransforms.js";
import { Canvas } from "./components/Canvas.js";
import { Toolbar } from "./components/Toolbar.js";
import { CanvasSelector } from "./components/CanvasSelector.js";
import { EntityPalette } from "./components/EntityPalette.js";
import { NodeDetail } from "./components/NodeDetail.js";
import { NodeContextMenu } from "./components/NodeContextMenu.js";
import { MiniMap } from "./components/MiniMap.js";
import { Legend } from "./components/Legend.js";
import { ExportMenu } from "./components/ExportMenu.js";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

// Get projectId from URL params or default
function getProjectId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("projectId");
}

interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error";
}

export function App() {
  const [projectId, setProjectId] = useState<string | null>(getProjectId);
  const [connected, setConnected] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleError = useCallback((message: string) => {
    addToast(message, "error");
  }, [addToast]);

  const handleSuccess = useCallback((message: string) => {
    addToast(message, "success");
  }, [addToast]);

  // Health check
  useEffect(() => {
    gateway.healthz().then(() => setConnected(true)).catch(() => setConnected(false));
    const interval = setInterval(() => {
      gateway.healthz().then(() => setConnected(true)).catch(() => setConnected(false));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // If no projectId, try loading first recon project
  useEffect(() => {
    if (projectId || !connected) return;
    gateway.listReconProjects().then((projects) => {
      if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }).catch(() => {});
  }, [projectId, connected]);

  const {
    canvases,
    activeCanvas,
    setActiveCanvas,
    loading,
    error,
    loadCanvas,
    createCanvas,
    deleteCanvas,
    saveViewport,
    autoLayout,
  } = useCanvas(gateway, projectId, handleError);

  const setActiveCanvasUpdater = useCallback(
    (updater: (prev: any) => any) => setActiveCanvas(updater as any),
    [setActiveCanvas],
  );

  const { viewport, setViewport, zoom, zoomIn, zoomOut, resetViewport, startPan, movePan, endPan, screenToWorld, isPanning } = useViewport(
    activeCanvas?.viewport,
  );

  const { selectedNodeIds, selectedEdgeIds, selectNode, selectEdge, selectAll, clearSelection } = useSelection();

  const { addNodes, addFromEntities, updateNodePosition, updateNode, deleteNode, startDrag, moveDrag, endDrag, isDragging } = useNodes(
    gateway,
    activeCanvas,
    setActiveCanvasUpdater,
    handleError,
  );

  const { addEdge, deleteEdge } = useEdges(gateway, activeCanvas, setActiveCanvasUpdater, handleError);

  const { transforms, running, runTransform, getTransformsForType } = useTransforms(
    gateway,
    activeCanvas,
    setActiveCanvasUpdater,
    handleError,
    handleSuccess,
  );

  // Update viewport on changes and save
  useEffect(() => {
    if (activeCanvas) {
      setViewport(activeCanvas.viewport);
    }
  }, [activeCanvas?.id]);

  // Save viewport changes (debounced in hook)
  useEffect(() => {
    if (activeCanvas) {
      saveViewport(viewport);
    }
  }, [viewport.x, viewport.y, viewport.zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCanvas) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        for (const nodeId of selectedNodeIds) {
          deleteNode(nodeId);
        }
        for (const edgeId of selectedEdgeIds) {
          deleteEdge(edgeId);
        }
        clearSelection();
      }

      if (e.key === "Escape") {
        clearSelection();
        setContextMenu(null);
      }

      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAll(activeCanvas.nodes.map((n) => n.id));
      }

      if (e.key === "=" || e.key === "+") {
        zoomIn();
      }
      if (e.key === "-") {
        zoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCanvas, selectedNodeIds, selectedEdgeIds, deleteNode, deleteEdge, clearSelection, selectAll, zoomIn, zoomOut]);

  // Canvas event handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    zoom(e.deltaY, e.clientX - rect.left, e.clientY - rect.top);
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      startPan(e.clientX, e.clientY);
    }
  }, [startPan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging()) {
      moveDrag(e.clientX, e.clientY, viewport.zoom);
      return;
    }
    movePan(e.clientX, e.clientY);
  }, [movePan, moveDrag, isDragging, viewport.zoom]);

  const handleMouseUp = useCallback(() => {
    endPan();
    endDrag();
  }, [endPan, endDrag]);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button === 0) {
      startDrag(nodeId, e.clientX, e.clientY);
    }
  }, [startDrag]);

  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(nodeId, e.shiftKey);
  }, [selectNode]);

  const handleNodeDoubleClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Show transforms for this node type
    if (!activeCanvas) return;
    const node = activeCanvas.nodes.find((n) => n.id === nodeId);
    if (node) {
      const applicable = getTransformsForType(node.type);
      if (applicable.length > 0) {
        setContextMenu({ nodeId, position: { x: e.clientX, y: e.clientY } });
      }
    }
  }, [activeCanvas, getTransformsForType]);

  const handleNodeContextMenu = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectNode(nodeId);
    setContextMenu({ nodeId, position: { x: e.clientX, y: e.clientY } });
  }, [selectNode]);

  const handleEdgeClick = useCallback((edgeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectEdge(edgeId, e.shiftKey);
  }, [selectEdge]);

  const handleCanvasClick = useCallback(() => {
    clearSelection();
    setContextMenu(null);
  }, [clearSelection]);

  // Get selected node for detail panel
  const selectedNode = activeCanvas && selectedNodeIds.size === 1
    ? activeCanvas.nodes.find((n) => selectedNodeIds.has(n.id)) ?? null
    : null;

  // Get visible entity types for legend
  const visibleTypes = activeCanvas
    ? [...new Set(activeCanvas.nodes.map((n) => n.type))]
    : [];

  if (!connected) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
        color: "#ef4444",
        fontFamily: "monospace",
        fontSize: 14,
      }}>
        Connecting to gateway...
      </div>
    );
  }

  if (!projectId) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
        color: "#6b7280",
        fontFamily: "monospace",
        fontSize: 14,
      }}>
        No recon project found. Create a project first.
      </div>
    );
  }

  if (!activeCanvas) {
    return (
      <CanvasSelector
        canvases={canvases}
        activeCanvasId={null}
        onSelect={loadCanvas}
        onCreate={createCanvas}
        onDelete={deleteCanvas}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      <Toolbar
        canvasName={activeCanvas.name}
        nodeCount={activeCanvas.nodes.length}
        edgeCount={activeCanvas.edges.length}
        zoom={viewport.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetViewport}
        onAutoLayout={autoLayout}
        onExport={() => setExportOpen(true)}
        onTogglePalette={() => setPaletteOpen(!paletteOpen)}
        paletteOpen={paletteOpen}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Main canvas area */}
        <div style={{ flex: 1, position: "relative" }}>
          <Canvas
            canvas={activeCanvas}
            viewport={viewport}
            selectedNodeIds={selectedNodeIds}
            selectedEdgeIds={selectedEdgeIds}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onNodeMouseDown={handleNodeMouseDown}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeClick={handleEdgeClick}
            onCanvasClick={handleCanvasClick}
          />

          <MiniMap
            nodes={activeCanvas.nodes}
            edges={activeCanvas.edges}
            viewport={viewport}
            containerWidth={containerRef.current?.clientWidth ?? 800}
            containerHeight={containerRef.current?.clientHeight ?? 600}
          />

          <Legend visibleTypes={visibleTypes} />

          {running && (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#22c55e20",
                border: "1px solid #22c55e",
                borderRadius: 4,
                padding: "4px 12px",
                fontFamily: "monospace",
                fontSize: 11,
                color: "#22c55e",
              }}
            >
              Running transform...
            </div>
          )}
        </div>

        {/* Entity palette sidebar */}
        {paletteOpen && (
          <EntityPalette
            gateway={gateway}
            projectId={projectId}
            onAddEntities={addFromEntities}
          />
        )}

        {/* Node detail panel */}
        {selectedNode && !paletteOpen && (
          <NodeDetail
            node={selectedNode}
            edges={activeCanvas.edges}
            allNodes={activeCanvas.nodes}
            transforms={transforms}
            onPin={() => updateNode(selectedNode.id, { pinned: !selectedNode.pinned })}
            onDelete={() => { deleteNode(selectedNode.id); clearSelection(); }}
            onRunTransform={(tid) => runTransform(selectedNode.id, tid)}
            onClose={clearSelection}
          />
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (() => {
        const node = activeCanvas.nodes.find((n) => n.id === contextMenu.nodeId);
        if (!node) return null;
        return (
          <NodeContextMenu
            node={node}
            position={contextMenu.position}
            transforms={transforms}
            onRunTransform={(tid) => runTransform(node.id, tid)}
            onPin={() => updateNode(node.id, { pinned: !node.pinned })}
            onDelete={() => { deleteNode(node.id); clearSelection(); }}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}

      {/* Export menu */}
      {exportOpen && (
        <ExportMenu canvas={activeCanvas} onClose={() => setExportOpen(false)} />
      )}

      {/* Error display */}
      {error && (
        <div
          style={{
            position: "fixed",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ef444420",
            border: "1px solid #ef4444",
            borderRadius: 4,
            padding: "6px 16px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Toast notifications */}
      <NotificationToast
        toasts={toasts.map((t) => ({ id: t.id, message: t.message, type: t.type }))}
        onDismiss={dismissToast}
      />
    </div>
  );
}
