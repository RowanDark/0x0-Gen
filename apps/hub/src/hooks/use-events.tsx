import { useState, useEffect, useCallback, useRef } from "react";
import type { EventMessage } from "@0x0-gen/sdk";
import { GatewayClient } from "@0x0-gen/sdk";
import type { Toast } from "@0x0-gen/ui";
import { useProject } from "./use-project.js";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

let toastCounter = 0;

export function useEvents() {
  const { activeProject } = useProject();
  const [events, setEvents] = useState<EventMessage[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const projectIdRef = useRef(activeProject?.id);

  // Keep ref in sync
  useEffect(() => {
    projectIdRef.current = activeProject?.id;
  }, [activeProject?.id]);

  // Load persisted events
  useEffect(() => {
    if (!activeProject) {
      setEvents([]);
      return;
    }

    gateway
      .listEvents({
        projectId: activeProject.id,
        limit: 1000,
        type: filterType ?? undefined,
      })
      .then((loadedEvents) => {
        setEvents(loadedEvents.reverse());
      })
      .catch(() => {
        setEvents([]);
      });
  }, [activeProject, filterType]);

  // Subscribe to live events via WebSocket
  useEffect(() => {
    const unsubscribe = gateway.onEvent((event: EventMessage) => {
      // Only show events for the active project
      if (event.projectId && event.projectId !== projectIdRef.current) return;

      setEvents((prev) => {
        if (filterType && event.type !== filterType) return prev;
        return [...prev, event];
      });

      // Show toast notification
      toastCounter++;
      const toast: Toast = {
        id: `toast-${toastCounter}`,
        message: `${event.type}: ${event.source}`,
        type: "info",
        duration: 4000,
      };
      setToasts((prev) => [...prev.slice(-4), toast]);
    });

    return unsubscribe;
  }, [filterType]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleFilterChange = useCallback((type: string | null) => {
    setFilterType(type);
  }, []);

  return {
    events,
    toasts,
    filterType,
    dismissToast,
    handleFilterChange,
  };
}
