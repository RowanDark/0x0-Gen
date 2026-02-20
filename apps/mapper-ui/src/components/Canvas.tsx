import React, { useRef, useCallback } from "react";
import type { MapperCanvas, MapperNode, MapperEdge, MapperViewport } from "@0x0-gen/sdk";
import { NodeComponent } from "./Node.js";
import { EdgeComponent } from "./Edge.js";

interface CanvasProps {
  canvas: MapperCanvas;
  viewport: MapperViewport;
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onNodeMouseDown: (nodeId: string, e: React.MouseEvent) => void;
  onNodeClick: (nodeId: string, e: React.MouseEvent) => void;
  onNodeDoubleClick: (nodeId: string, e: React.MouseEvent) => void;
  onNodeContextMenu: (nodeId: string, e: React.MouseEvent) => void;
  onEdgeClick: (edgeId: string, e: React.MouseEvent) => void;
  onCanvasClick: (e: React.MouseEvent) => void;
}

export function Canvas({
  canvas,
  viewport,
  selectedNodeIds,
  selectedEdgeIds,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onNodeMouseDown,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onEdgeClick,
  onCanvasClick,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const nodeMap = new Map<string, MapperNode>();
  for (const node of canvas.nodes) {
    nodeMap.set(node.id, node);
  }

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{
        background: "#0a0a0a",
        display: "block",
      }}
      onWheel={onWheel}
      onMouseDown={(e) => {
        if (e.target === svgRef.current || (e.target as SVGElement).classList?.contains("canvas-bg")) {
          onMouseDown(e);
        }
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={(e) => {
        if (e.target === svgRef.current || (e.target as SVGElement).classList?.contains("canvas-bg")) {
          onCanvasClick(e);
        }
      }}
      data-testid="mapper-canvas"
    >
      {/* Grid pattern */}
      <defs>
        <pattern
          id="grid"
          width={40 * viewport.zoom}
          height={40 * viewport.zoom}
          patternUnits="userSpaceOnUse"
          x={viewport.x % (40 * viewport.zoom)}
          y={viewport.y % (40 * viewport.zoom)}
        >
          <circle
            cx={1}
            cy={1}
            r={0.5}
            fill="#1a1a1a"
          />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#grid)"
        className="canvas-bg"
      />

      {/* Transform group for pan/zoom */}
      <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
        {/* Edges (rendered first, behind nodes) */}
        {canvas.edges.map((edge) => {
          const fromNode = nodeMap.get(edge.fromNodeId);
          const toNode = nodeMap.get(edge.toNodeId);
          if (!fromNode || !toNode) return null;

          return (
            <EdgeComponent
              key={edge.id}
              edge={edge}
              fromNode={fromNode}
              toNode={toNode}
              selected={selectedEdgeIds.has(edge.id)}
              onClick={(e) => onEdgeClick(edge.id, e)}
            />
          );
        })}

        {/* Nodes */}
        {canvas.nodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            selected={selectedNodeIds.has(node.id)}
            onMouseDown={(e) => onNodeMouseDown(node.id, e)}
            onClick={(e) => onNodeClick(node.id, e)}
            onDoubleClick={(e) => onNodeDoubleClick(node.id, e)}
            onContextMenu={(e) => onNodeContextMenu(node.id, e)}
          />
        ))}
      </g>
    </svg>
  );
}
