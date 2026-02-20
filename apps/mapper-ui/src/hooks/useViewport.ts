import { useState, useCallback, useRef } from "react";
import type { MapperViewport } from "@0x0-gen/sdk";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export function useViewport(initial?: MapperViewport) {
  const [viewport, setViewport] = useState<MapperViewport>(
    initial ?? { x: 0, y: 0, zoom: 1 },
  );
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const pan = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const zoom = useCallback((delta: number, cx: number, cy: number) => {
    setViewport((v) => {
      const factor = delta > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
      const ratio = newZoom / v.zoom;
      return {
        x: cx - (cx - v.x) * ratio,
        y: cy - (cy - v.y) * ratio,
        zoom: newZoom,
      };
    });
  }, []);

  const zoomIn = useCallback(() => {
    setViewport((v) => ({
      ...v,
      zoom: Math.min(MAX_ZOOM, v.zoom * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((v) => ({
      ...v,
      zoom: Math.max(MIN_ZOOM, v.zoom / 1.2),
    }));
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  const startPan = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    panStart.current = { x: clientX, y: clientY };
  }, []);

  const movePan = useCallback((clientX: number, clientY: number) => {
    if (!isPanning.current) return false;
    const dx = clientX - panStart.current.x;
    const dy = clientY - panStart.current.y;
    panStart.current = { x: clientX, y: clientY };
    pan(dx, dy);
    return true;
  }, [pan]);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - viewport.x) / viewport.zoom,
      y: (sy - viewport.y) / viewport.zoom,
    }),
    [viewport],
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({
      x: wx * viewport.zoom + viewport.x,
      y: wy * viewport.zoom + viewport.y,
    }),
    [viewport],
  );

  return {
    viewport,
    setViewport,
    pan,
    zoom,
    zoomIn,
    zoomOut,
    resetViewport,
    startPan,
    movePan,
    endPan,
    screenToWorld,
    worldToScreen,
    isPanning,
  };
}
