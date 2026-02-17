import { useState, useCallback, useEffect, useRef } from "react";
import { GatewayClient } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export function useProxy() {
  const [running, setRunning] = useState(false);
  const [port, setPort] = useState(8080);
  const [captureCount, setCaptureCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const status = await gateway.getProxyStatus();
      setRunning(status.running);
      setPort(status.port);
      setCaptureCount(status.captureCount);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollStatus]);

  const startProxy = useCallback(
    async (config?: { port?: number; mitmEnabled?: boolean; mitmHosts?: string[] }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await gateway.startProxy(config);
        setRunning(true);
        setPort(result.port);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const stopProxy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await gateway.stopProxy();
      setRunning(false);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    running,
    port,
    captureCount,
    loading,
    error,
    startProxy,
    stopProxy,
    gateway,
  };
}
