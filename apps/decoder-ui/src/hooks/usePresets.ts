import { useState, useEffect, useCallback } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { DecoderPreset, TransformStep } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function usePresets() {
  const [presets, setPresets] = useState<(DecoderPreset & { isBuiltin?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await gateway.listPresets();
      setPresets(result as (DecoderPreset & { isBuiltin?: boolean })[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createPreset = useCallback(
    async (name: string, steps: TransformStep[]) => {
      const preset = await gateway.createPreset(name, steps);
      await refresh();
      return preset;
    },
    [refresh],
  );

  const updatePreset = useCallback(
    async (id: string, data: { name?: string; steps?: TransformStep[] }) => {
      const preset = await gateway.updatePreset(id, data);
      await refresh();
      return preset;
    },
    [refresh],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      await gateway.deletePreset(id);
      await refresh();
    },
    [refresh],
  );

  return { presets, loading, error, createPreset, updatePreset, deletePreset, refresh };
}
