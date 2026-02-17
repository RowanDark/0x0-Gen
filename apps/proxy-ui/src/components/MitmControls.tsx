import React, { useState, useEffect, useCallback } from "react";

interface MitmControlsProps {
  mitmEnabled: boolean;
  mitmHosts: string;
  running: boolean;
  onMitmEnabledChange: (enabled: boolean) => void;
  onMitmHostsChange: (hosts: string) => void;
  gateway: {
    getCAStatus(): Promise<{ generated: boolean; fingerprint: string }>;
    getCACertificate(): Promise<string>;
    regenerateCA(): Promise<{ generated: boolean; fingerprint: string }>;
  };
}

export function MitmControls({
  mitmEnabled,
  mitmHosts,
  running,
  onMitmEnabledChange,
  onMitmHostsChange,
  gateway,
}: MitmControlsProps) {
  const [caStatus, setCaStatus] = useState<{ generated: boolean; fingerprint: string } | null>(
    null,
  );
  const [downloading, setDownloading] = useState(false);

  const loadCAStatus = useCallback(async () => {
    try {
      const status = await gateway.getCAStatus();
      setCaStatus(status);
    } catch {
      // ignore
    }
  }, [gateway]);

  useEffect(() => {
    loadCAStatus();
  }, [loadCAStatus]);

  const handleDownloadCA = async () => {
    setDownloading(true);
    try {
      const certPem = await gateway.getCACertificate();
      const blob = new Blob([certPem], { type: "application/x-pem-file" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "0x0-gen-ca.pem";
      a.click();
      URL.revokeObjectURL(url);
      await loadCAStatus();
    } catch {
      // ignore download errors
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await gateway.regenerateCA();
      setCaStatus(result);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "6px 16px",
        borderBottom: "1px solid #333",
        backgroundColor: "#0d0d0d",
        fontSize: "13px",
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={mitmEnabled}
          onChange={(e) => onMitmEnabledChange(e.target.checked)}
          disabled={running}
          style={{ accentColor: "#e67e22" }}
        />
        <span style={{ color: mitmEnabled ? "#e67e22" : "#888" }}>MITM</span>
      </label>

      {mitmEnabled && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#888" }}>Hosts:</span>
            <input
              type="text"
              value={mitmHosts}
              onChange={(e) => onMitmHostsChange(e.target.value)}
              disabled={running}
              placeholder="All hosts (or comma-separated)"
              style={{
                width: "220px",
                padding: "4px 8px",
                backgroundColor: "#1a1a1a",
                color: "#ccc",
                border: "1px solid #444",
                borderRadius: "3px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handleDownloadCA}
              disabled={downloading}
              style={{
                padding: "3px 10px",
                backgroundColor: "transparent",
                color: "#3498db",
                border: "1px solid #3498db",
                borderRadius: "3px",
                cursor: downloading ? "not-allowed" : "pointer",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            >
              {downloading ? "..." : "Download CA"}
            </button>

            <button
              onClick={handleRegenerate}
              style={{
                padding: "3px 10px",
                backgroundColor: "transparent",
                color: "#888",
                border: "1px solid #444",
                borderRadius: "3px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            >
              Regenerate
            </button>
          </div>

          {caStatus?.generated && (
            <span style={{ color: "#555", fontSize: "11px" }}>
              CA: {caStatus.fingerprint.substring(0, 23)}...
            </span>
          )}
        </>
      )}
    </div>
  );
}
