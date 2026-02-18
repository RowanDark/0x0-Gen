import { useState, useCallback } from "react";
import type { IntruderPosition } from "@0x0-gen/sdk";

export function usePositions() {
  const [positions, setPositions] = useState<IntruderPosition[]>([]);

  const addPosition = useCallback(
    (start: number, end: number, name?: string) => {
      const pos: IntruderPosition = {
        id: crypto.randomUUID(),
        start,
        end,
        name: name ?? `pos${positions.length + 1}`,
      };
      setPositions((prev) => [...prev, pos]);
      return pos;
    },
    [positions.length],
  );

  const removePosition = useCallback((id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPositions = useCallback(() => {
    setPositions([]);
  }, []);

  const setAllPositions = useCallback((pos: IntruderPosition[]) => {
    setPositions(pos);
  }, []);

  return {
    positions,
    addPosition,
    removePosition,
    clearPositions,
    setAllPositions,
  };
}
