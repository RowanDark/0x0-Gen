import React, { useEffect } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
}

interface NotificationToastProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  info: "#5a5aff",
  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444",
};

export function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        top: "56px",
        right: "16px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "360px",
      },
    },
    toasts.map((toast) =>
      React.createElement(ToastItem, {
        key: toast.id,
        toast,
        onDismiss: () => onDismiss(toast.id),
      }),
    ),
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const color = TYPE_COLORS[toast.type ?? "info"];

  return React.createElement(
    "div",
    {
      onClick: onDismiss,
      style: {
        padding: "10px 14px",
        backgroundColor: "#1a1a1a",
        border: `1px solid ${color}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "4px",
        color: "#ccc",
        fontSize: "12px",
        fontFamily: "monospace",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      },
    },
    toast.message,
  );
}
