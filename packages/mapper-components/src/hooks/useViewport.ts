import { useState, useCallback, useRef } from "react";
import type { Viewport } from "../types.js";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const pan = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const zoom = useCallback((delta: number, cx: number, cy: number) => {
    setViewport((prev) => {
      const factor = delta > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
      const scale = newZoom / prev.zoom;
      return {
        zoom: newZoom,
        x: cx - (cx - prev.x) * scale,
        y: cy - (cy - prev.y) * scale,
      };
    });
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  const fitToScreen = useCallback(
    (nodes: Array<{ x: number; y: number }>, width: number, height: number) => {
      if (nodes.length === 0) {
        resetViewport();
        return;
      }
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
      const graphW = maxX - minX + 100;
      const graphH = maxY - minY + 100;
      const zoomX = width / graphW;
      const zoomY = height / graphH;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zoomX, zoomY) * 0.9));
      setViewport({
        x: width / 2 - ((minX + maxX) / 2) * newZoom,
        y: height / 2 - ((minY + maxY) / 2) * newZoom,
        zoom: newZoom,
      });
    },
    [resetViewport],
  );

  const startPan = useCallback((x: number, y: number) => {
    isPanning.current = true;
    panStart.current = { x, y };
  }, []);

  const updatePan = useCallback(
    (x: number, y: number) => {
      if (!isPanning.current) return false;
      const dx = x - panStart.current.x;
      const dy = y - panStart.current.y;
      panStart.current = { x, y };
      pan(dx, dy);
      return true;
    },
    [pan],
  );

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  return {
    viewport,
    pan,
    zoom,
    resetViewport,
    fitToScreen,
    startPan,
    updatePan,
    endPan,
    isPanning,
  };
}
