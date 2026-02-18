import { z } from "zod";

export const EventTypeSchema = z.enum([
  "gateway:ready",
  "service:connected",
  "service:disconnected",
  "capture:created",
  "capture:updated",
  "health:status",
  "proxy:request",
  "proxy:response",
  "repeater:sent",
  "repeater:response",
  "repeater:error",
  "decoder:transform",
  "intruder:started",
  "intruder:progress",
  "intruder:result",
  "intruder:paused",
  "intruder:resumed",
  "intruder:completed",
  "intruder:cancelled",
  "intruder:error",
]);

export const EventMessageSchema = z.object({
  id: z.string().uuid(),
  type: EventTypeSchema,
  source: z.string(),
  payload: z.unknown(),
  projectId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
});

export type EventType = z.infer<typeof EventTypeSchema>;
export type EventMessage = z.infer<typeof EventMessageSchema>;
