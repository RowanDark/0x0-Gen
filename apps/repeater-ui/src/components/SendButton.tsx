import React from "react";

interface SendButtonProps {
  onSend: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function SendButton({ onSend, loading, disabled }: SendButtonProps) {
  return (
    <button
      onClick={onSend}
      disabled={disabled || loading}
      title="Send request (Ctrl+Enter)"
      style={{
        backgroundColor: disabled || loading ? "#1a4a35" : "#00cc88",
        border: "none",
        borderRadius: 4,
        color: disabled || loading ? "#555" : "#000",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "monospace",
        fontSize: "13px",
        fontWeight: "bold",
        padding: "8px 20px",
        transition: "background-color 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 80,
        justifyContent: "center",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#00aa70";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#00cc88";
        }
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              border: "2px solid #00cc88",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Sending...
        </>
      ) : (
        "Send"
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
