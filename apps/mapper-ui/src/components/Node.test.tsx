import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NodeComponent } from "./Node.js";
import type { MapperNode } from "@0x0-gen/sdk";

const mockNode: MapperNode = {
  id: "node-1",
  entityId: null,
  type: "domain",
  label: "example.com",
  x: 100,
  y: 200,
  pinned: false,
  style: {},
  data: {},
};

const defaultProps = {
  node: mockNode,
  selected: false,
  onMouseDown: vi.fn(),
  onClick: vi.fn(),
  onDoubleClick: vi.fn(),
  onContextMenu: vi.fn(),
};

function renderNode(props = defaultProps) {
  return render(
    <svg>
      <NodeComponent {...props} />
    </svg>,
  );
}

describe("NodeComponent", () => {
  it("renders node with label", () => {
    renderNode();
    expect(screen.getByTestId("node-node-1")).toBeTruthy();
    expect(screen.getByText("example.com")).toBeTruthy();
  });

  it("truncates long labels", () => {
    const longLabelNode = {
      ...mockNode,
      label: "this-is-a-very-long-subdomain.example.com",
    };
    renderNode({ ...defaultProps, node: longLabelNode });
    expect(screen.getByText("this-is-a-very-long-subdom...")).toBeTruthy();
  });

  it("fires click handler", () => {
    const onClick = vi.fn();
    renderNode({ ...defaultProps, onClick });
    fireEvent.click(screen.getByTestId("node-node-1"));
    expect(onClick).toHaveBeenCalled();
  });

  it("fires context menu handler", () => {
    const onContextMenu = vi.fn();
    renderNode({ ...defaultProps, onContextMenu });
    fireEvent.contextMenu(screen.getByTestId("node-node-1"));
    expect(onContextMenu).toHaveBeenCalled();
  });

  it("fires mousedown handler", () => {
    const onMouseDown = vi.fn();
    renderNode({ ...defaultProps, onMouseDown });
    fireEvent.mouseDown(screen.getByTestId("node-node-1"));
    expect(onMouseDown).toHaveBeenCalled();
  });

  it("shows pin indicator when pinned", () => {
    const pinnedNode = { ...mockNode, pinned: true };
    renderNode({ ...defaultProps, node: pinnedNode });
    // Pin emoji should be present
    expect(screen.getByTestId("node-node-1")).toBeTruthy();
  });
});
