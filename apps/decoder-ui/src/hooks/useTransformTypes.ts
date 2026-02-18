import { useState, useEffect } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type { TransformType, TransformDirection } from "@0x0-gen/sdk";

export interface TransformTypeInfo {
  type: TransformType;
  name: string;
  category: string;
  directions: TransformDirection[];
  description: string;
}

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useTransformTypes() {
  const [types, setTypes] = useState<TransformTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    gateway
      .listTransformTypes()
      .then((result) => {
        if (!cancelled) {
          setTypes(result as TransformTypeInfo[]);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { types, loading, error };
}
