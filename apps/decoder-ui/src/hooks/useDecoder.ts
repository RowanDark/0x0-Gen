import { useState, useCallback, useRef, useEffect } from "react";
import { GatewayClient } from "@0x0-gen/sdk";
import type {
  TransformStep,
  TransformResult,
  TransformType,
  TransformDirection,
} from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

const AUTO_RUN_DEBOUNCE = 300;
const LARGE_INPUT_THRESHOLD = 1_000_000; // 1MB

export function useDecoder() {
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState<TransformStep[]>([]);
  const [result, setResult] = useState<TransformResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLargeInput = input.length > LARGE_INPUT_THRESHOLD;

  const execute = useCallback(
    async (overrideInput?: string, overrideSteps?: TransformStep[]) => {
      const currentInput = overrideInput ?? input;
      const currentSteps = overrideSteps ?? steps;

      if (!currentInput || currentSteps.length === 0) {
        setResult(null);
        return null;
      }

      setRunning(true);
      setError(null);

      try {
        const res = await gateway.transform(currentInput, currentSteps);
        setResult(res);
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        return null;
      } finally {
        setRunning(false);
      }
    },
    [input, steps],
  );

  // Auto-run with debounce
  useEffect(() => {
    if (!autoRun || isLargeInput || steps.length === 0 || !input) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void execute();
    }, AUTO_RUN_DEBOUNCE);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, steps, autoRun, isLargeInput, execute]);

  const addStep = useCallback(
    (type: TransformType, direction: TransformDirection = "encode") => {
      setSteps((prev) => [...prev, { type, direction }]);
    },
    [],
  );

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDirection = useCallback((index: number) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index
          ? { ...step, direction: step.direction === "encode" ? "decode" : "encode" }
          : step,
      ),
    );
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
    setResult(null);
  }, []);

  const loadSteps = useCallback((newSteps: TransformStep[]) => {
    setSteps(newSteps);
  }, []);

  const useOutputAsInput = useCallback(() => {
    if (result?.output) {
      setInput(result.output);
    }
  }, [result]);

  const clearAll = useCallback(() => {
    setInput("");
    setSteps([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    input,
    setInput,
    steps,
    result,
    running,
    error,
    autoRun,
    setAutoRun,
    isLargeInput,
    execute,
    addStep,
    removeStep,
    toggleDirection,
    reorderSteps,
    clearSteps,
    loadSteps,
    useOutputAsInput,
    clearAll,
  };
}
