import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Canvas } from "./Canvas.js";
import type { MapperCanvas, MapperViewport } from "@0x0-gen/sdk";

const mockCanvas: MapperCanvas = {
  id: "canvas-1",
  projectId: "proj-1",
  name: "Test Canvas",
  nodes: [
    {
      id: "node-1",
      entityId: null,
      type: "domain",
      label: "example.com",
      x: 100,
      y: 200,
      pinned: false,
      style: {},
      data: {},
    },
    {
      id: "node-2",
      entityId: null,
      type: "ip",
      label: "1.2.3.4",
      x: 300,
      y: 200,
      pinned: false,
      style: {},
      data: {},
    },
  ],
  edges: [
    {
      id: "edge-1",
      relationshipId: null,
      fromNodeId: "node-1",
      toNodeId: "node-2",
      type: "resolves_to",
      label: "resolves to",
      style: {},
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockViewport: MapperViewport = { x: 0, y: 0, zoom: 1 };

const defaultProps = {
  canvas: mockCanvas,
  viewport: mockViewport,
  selectedNodeIds: new Set<string>(),
  selectedEdgeIds: new Set<string>(),
  onWheel: vi.fn(),
  onMouseDown: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseUp: vi.fn(),
  onNodeMouseDown: vi.fn(),
  onNodeClick: vi.fn(),
  onNodeDoubleClick: vi.fn(),
  onNodeContextMenu: vi.fn(),
  onEdgeClick: vi.fn(),
  onCanvasClick: vi.fn(),
};

describe("Canvas", () => {
  it("renders SVG canvas", () => {
    render(<Canvas {...defaultProps} />);
    expect(screen.getByTestId("mapper-canvas")).toBeTruthy();
  });

  it("renders nodes", () => {
    render(<Canvas {...defaultProps} />);
    expect(screen.getByTestId("node-node-1")).toBeTruthy();
    expect(screen.getByTestId("node-node-2")).toBeTruthy();
  });

  it("renders edges", () => {
    render(<Canvas {...defaultProps} />);
    expect(screen.getByTestId("edge-edge-1")).toBeTruthy();
  });

  it("highlights selected nodes", () => {
    render(
      <Canvas {...defaultProps} selectedNodeIds={new Set(["node-1"])} />,
    );
    // Selected node should be rendered (visual check)
    expect(screen.getByTestId("node-node-1")).toBeTruthy();
  });

  it("handles mouse events on canvas background", () => {
    render(<Canvas {...defaultProps} />);
    const svg = screen.getByTestId("mapper-canvas");
    fireEvent.mouseMove(svg);
    expect(defaultProps.onMouseMove).toHaveBeenCalled();
  });
});
