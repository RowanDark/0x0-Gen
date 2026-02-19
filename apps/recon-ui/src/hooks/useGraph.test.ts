import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGraph } from "@0x0-gen/mapper-components";

describe("useGraph", () => {
  it("returns empty arrays when data is null", () => {
    const { result } = renderHook(() => useGraph(null));
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.selectedNode).toBeNull();
  });

  it("lays out nodes from graph data", () => {
    const data = {
      nodes: [
        { id: "n1", label: "Node 1", type: "domain", category: "infrastructure", confidence: 90 },
        { id: "n2", label: "Node 2", type: "ip", category: "network", confidence: 80 },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", type: "resolves_to", confidence: 95 },
      ],
    };

    const { result } = renderHook(() => useGraph(data));
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.edges).toHaveLength(1);
    // Nodes should have x, y positions
    expect(typeof result.current.nodes[0].x).toBe("number");
    expect(typeof result.current.nodes[0].y).toBe("number");
  });

  it("selects a node", () => {
    const data = {
      nodes: [
        { id: "n1", label: "Node 1", type: "domain", category: "infrastructure", confidence: 90 },
      ],
      edges: [],
    };

    const { result } = renderHook(() => useGraph(data));
    act(() => {
      result.current.selectNode("n1");
    });
    expect(result.current.selectedNode?.id).toBe("n1");
    expect(result.current.selectedNodeId).toBe("n1");
  });

  it("deselects a node", () => {
    const data = {
      nodes: [
        { id: "n1", label: "Node 1", type: "domain", category: "infrastructure", confidence: 90 },
      ],
      edges: [],
    };

    const { result } = renderHook(() => useGraph(data));
    act(() => {
      result.current.selectNode("n1");
    });
    expect(result.current.selectedNode?.id).toBe("n1");
    act(() => {
      result.current.selectNode(null);
    });
    expect(result.current.selectedNode).toBeNull();
  });

  it("moves a node", () => {
    const data = {
      nodes: [
        { id: "n1", label: "Node 1", type: "domain", category: "infrastructure", confidence: 90 },
      ],
      edges: [],
    };

    const { result } = renderHook(() => useGraph(data));
    const origX = result.current.nodes[0].x;
    const origY = result.current.nodes[0].y;

    act(() => {
      result.current.moveNode("n1", 100, 200);
    });

    expect(result.current.nodes[0].x).toBe(100);
    expect(result.current.nodes[0].y).toBe(200);
    // Verify it actually moved
    expect(result.current.nodes[0].x !== origX || result.current.nodes[0].y !== origY).toBe(true);
  });

  it("adds a node", () => {
    const data = {
      nodes: [
        { id: "n1", label: "Node 1", type: "domain", category: "infrastructure", confidence: 90 },
      ],
      edges: [],
    };

    const { result } = renderHook(() => useGraph(data));
    expect(result.current.nodes).toHaveLength(1);

    act(() => {
      result.current.addNode({
        id: "n2",
        label: "Node 2",
        type: "ip",
        category: "network",
        confidence: 80,
      });
    });

    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.nodes[1].id).toBe("n2");
  });

  it("does not add duplicate nodes", () => {
    const data = {
      nodes: [
        { id: "n1", label: "Node 1", type: "domain", category: "infrastructure", confidence: 90 },
      ],
      edges: [],
    };

    const { result } = renderHook(() => useGraph(data));
    act(() => {
      result.current.addNode({
        id: "n1",
        label: "Node 1 Duplicate",
        type: "domain",
        category: "infrastructure",
        confidence: 90,
      });
    });

    expect(result.current.nodes).toHaveLength(1);
  });
});
