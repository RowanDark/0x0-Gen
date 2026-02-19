import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EdgeComponent } from "./Edge.js";
import type { MapperEdge, MapperNode } from "@0x0-gen/sdk";

const fromNode: MapperNode = {
  id: "node-1",
  entityId: null,
  type: "domain",
  label: "example.com",
  x: 0,
  y: 0,
  pinned: false,
  style: {},
  data: {},
};

const toNode: MapperNode = {
  id: "node-2",
  entityId: null,
  type: "ip",
  label: "1.2.3.4",
  x: 200,
  y: 0,
  pinned: false,
  style: {},
  data: {},
};

const mockEdge: MapperEdge = {
  id: "edge-1",
  relationshipId: null,
  fromNodeId: "node-1",
  toNodeId: "node-2",
  type: "resolves_to",
  label: "resolves to",
  style: {},
};

const defaultProps = {
  edge: mockEdge,
  fromNode,
  toNode,
  selected: false,
  onClick: vi.fn(),
};

function renderEdge(props = defaultProps) {
  return render(
    <svg>
      <EdgeComponent {...props} />
    </svg>,
  );
}

describe("EdgeComponent", () => {
  it("renders edge", () => {
    renderEdge();
    expect(screen.getByTestId("edge-edge-1")).toBeTruthy();
  });

  it("shows label", () => {
    renderEdge();
    expect(screen.getByText("resolves to")).toBeTruthy();
  });

  it("fires click handler", () => {
    const onClick = vi.fn();
    renderEdge({ ...defaultProps, onClick });
    fireEvent.click(screen.getByTestId("edge-edge-1"));
    expect(onClick).toHaveBeenCalled();
  });

  it("does not render when nodes overlap", () => {
    const overlapping: MapperNode = { ...toNode, x: 0, y: 0 };
    const { container } = renderEdge({ ...defaultProps, toNode: overlapping });
    // When nodes are at same position, distance is 0, returns null
    const g = container.querySelector("[data-testid='edge-edge-1']");
    expect(g).toBeNull();
  });

  it("renders with dashed style", () => {
    const dashedEdge = { ...mockEdge, style: { dashed: true } };
    renderEdge({ ...defaultProps, edge: dashedEdge });
    expect(screen.getByTestId("edge-edge-1")).toBeTruthy();
  });
});
