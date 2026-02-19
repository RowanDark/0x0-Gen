import React, { useEffect, useState, useCallback, useRef } from "react";
import type { GatewayClient } from "@0x0-gen/sdk";
import type { GraphData } from "./types.js";
import { useGraph } from "./hooks/useGraph.js";
import { useViewport } from "./hooks/useViewport.js";
import { Canvas } from "./Canvas.js";
import { Toolbar } from "./Toolbar.js";
import { NodeDetail } from "./NodeDetail.js";
import { Legend } from "./Legend.js";

export interface MapperViewProps {
  projectId: string;
  gateway: GatewayClient;
  onAddNodeRequest?: (nodeId: string) => void;
}

export function MapperView({ projectId, gateway }: MapperViewProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFit = useRef(false);

  const {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    moveNode,
    selectNode,
    addNode,
  } = useGraph(graphData);

  const {
    viewport,
    zoom,
    resetViewport,
    fitToScreen,
    startPan,
    updatePan,
    endPan,
  } = useViewport();

  // Load graph data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    gateway
      .getReconGraph(projectId)
      .then((data) => {
        if (!cancelled) {
          setGraphData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load graph");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, gateway]);

  // Auto-fit on first load
  useEffect(() => {
    if (nodes.length > 0 && !hasFit.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      fitToScreen(nodes, rect.width, rect.height);
      hasFit.current = true;
    }
  }, [nodes, fitToScreen]);

  const handleZoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoom(-100, rect.width / 2, rect.height / 2);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoom(100, rect.width / 2, rect.height / 2);
  }, [zoom]);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    fitToScreen(nodes, rect.width, rect.height);
  }, [nodes, fitToScreen]);

  const visibleCategories = new Set(nodes.map((n) => n.category));

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#555",
          fontFamily: "monospace",
          fontSize: 13,
        }}
      >
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#ef4444",
          fontFamily: "monospace",
          fontSize: 13,
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>Failed to load graph</div>
        <div style={{ color: "#888", fontSize: 11 }}>{error}</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#555",
          fontFamily: "monospace",
          fontSize: 13,
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>No graph data</div>
        <div style={{ fontSize: 11, color: "#444" }}>
          Import entities to see the relationship graph
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: "flex", height: "100%", position: "relative" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas
          nodes={nodes}
          edges={edges}
          viewport={viewport}
          selectedNodeId={selectedNodeId}
          onSelectNode={selectNode}
          onMoveNode={moveNode}
          onWheel={zoom}
          onPanStart={startPan}
          onPanMove={updatePan}
          onPanEnd={endPan}
        />
        <Toolbar
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onResetView={resetViewport}
          zoom={viewport.zoom}
        />
        <Legend visibleCategories={visibleCategories} />
      </div>

      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          edges={edges}
          nodes={nodes}
          onClose={() => selectNode(null)}
          onSelectNode={selectNode}
        />
      )}
    </div>
  );
}
