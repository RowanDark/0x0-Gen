import { z } from "zod";

export const EventTypeSchema = z.enum([
  "gateway:ready",
  "service:connected",
  "service:disconnected",
  "capture:created",
  "capture:updated",
  "health:status",
]);

export const EventMessageSchema = z.object({
  id: z.string().uuid(),
  type: EventTypeSchema,
  source: z.string(),
  payload: z.unknown(),
  timestamp: z.string().datetime(),
});

export type EventType = z.infer<typeof EventTypeSchema>;
export type EventMessage = z.infer<typeof EventMessageSchema>;
