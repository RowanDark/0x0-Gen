import { useState, useCallback, useEffect, useRef } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type {
  IntruderAttack,
  IntruderResult,
  EventMessage,
  AttackStatus,
} from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useIntruder() {
  const [attack, setAttack] = useState<IntruderAttack | null>(null);
  const [results, setResults] = useState<IntruderResult[]>([]);
  const [status, setStatus] = useState<AttackStatus | "idle">("idle");
  const [error, setError] = useState<string | null>(null);
  const wsConnected = useRef(false);

  useEffect(() => {
    if (!wsConnected.current) {
      gateway.connectWebSocket();
      wsConnected.current = true;
    }

    const unsub = gateway.onEvent((event: EventMessage) => {
      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case "intruder:started":
          setStatus("running");
          break;
        case "intruder:progress":
          setAttack((prev) =>
            prev
              ? {
                  ...prev,
                  completedRequests: (payload.completedRequests as number) ?? prev.completedRequests,
                }
              : prev,
          );
          break;
        case "intruder:result":
          setResults((prev) => [
            ...prev,
            {
              id: payload.resultId as string,
              configId: payload.configId as string,
              requestIndex: payload.requestIndex as number,
              payloads: {},
              request: "",
              response: payload.statusCode
                ? {
                    statusCode: payload.statusCode as number,
                    statusMessage: "",
                    headers: {},
                    body: null,
                    contentLength: 0,
                  }
                : null,
              duration: payload.duration as number,
              error: (payload.error as string) ?? null,
              timestamp: Date.now(),
            },
          ]);
          break;
        case "intruder:paused":
          setStatus("paused");
          break;
        case "intruder:resumed":
          setStatus("running");
          break;
        case "intruder:completed":
          setStatus("completed");
          setAttack((prev) =>
            prev
              ? {
                  ...prev,
                  status: "completed",
                  completedRequests: (payload.completedRequests as number) ?? prev.completedRequests,
                  completedAt: Date.now(),
                }
              : prev,
          );
          break;
        case "intruder:cancelled":
          setStatus("cancelled");
          break;
        case "intruder:error":
          setError(payload.error as string);
          break;
      }
    });

    return unsub;
  }, []);

  const startAttack = useCallback(async (configId: string) => {
    setError(null);
    setResults([]);
    setStatus("running");
    try {
      const atk = await gateway.startAttack(configId);
      setAttack(atk);
      return atk;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("idle");
      return null;
    }
  }, []);

  const pauseAttack = useCallback(async () => {
    if (!attack) return;
    try {
      await gateway.pauseAttack(attack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [attack]);

  const resumeAttack = useCallback(async () => {
    if (!attack) return;
    try {
      await gateway.resumeAttack(attack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [attack]);

  const cancelAttack = useCallback(async () => {
    if (!attack) return;
    try {
      await gateway.cancelAttack(attack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [attack]);

  const fetchResults = useCallback(
    async (options?: { limit?: number; offset?: number }) => {
      if (!attack) return;
      try {
        const r = await gateway.getAttackResults(attack.id, options);
        setResults(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [attack],
  );

  const reset = useCallback(() => {
    setAttack(null);
    setResults([]);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    attack,
    results,
    status,
    error,
    startAttack,
    pauseAttack,
    resumeAttack,
    cancelAttack,
    fetchResults,
    reset,
  };
}
