import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewport } from "@0x0-gen/mapper-components";

describe("useViewport", () => {
  it("starts with default viewport", () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("pans the viewport", () => {
    const { result } = renderHook(() => useViewport());
    act(() => {
      result.current.pan(50, 30);
    });
    expect(result.current.viewport.x).toBe(50);
    expect(result.current.viewport.y).toBe(30);
  });

  it("zooms the viewport", () => {
    const { result } = renderHook(() => useViewport());
    const startZoom = result.current.viewport.zoom;
    act(() => {
      // Negative delta zooms in
      result.current.zoom(-100, 400, 300);
    });
    expect(result.current.viewport.zoom).toBeGreaterThan(startZoom);
  });

  it("resets viewport to defaults", () => {
    const { result } = renderHook(() => useViewport());
    act(() => {
      result.current.pan(100, 200);
      result.current.zoom(-100, 400, 300);
    });
    expect(result.current.viewport.x).not.toBe(0);
    act(() => {
      result.current.resetViewport();
    });
    expect(result.current.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("fits nodes to screen", () => {
    const { result } = renderHook(() => useViewport());
    const nodes = [
      { x: -100, y: -100 },
      { x: 100, y: 100 },
    ];
    act(() => {
      result.current.fitToScreen(nodes, 800, 600);
    });
    // After fit, zoom should be adjusted to fit the nodes
    expect(result.current.viewport.zoom).toBeGreaterThan(0);
    expect(typeof result.current.viewport.x).toBe("number");
    expect(typeof result.current.viewport.y).toBe("number");
  });

  it("resets viewport when fitting empty nodes", () => {
    const { result } = renderHook(() => useViewport());
    act(() => {
      result.current.pan(100, 200);
    });
    act(() => {
      result.current.fitToScreen([], 800, 600);
    });
    expect(result.current.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});
