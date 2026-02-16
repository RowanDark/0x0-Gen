import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const RequestSchema = z.object({
  id: z.string().uuid(),
  method: z.string().min(1),
  url: z.string().url(),
  headers: z.record(z.string()),
  body: z.string().optional(),
});

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.number().int(),
  headers: z.record(z.string()),
  body: z.string().optional(),
});

export const CaptureSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  request: RequestSchema,
  response: ResponseSchema.optional(),
  capturedAt: z.string().datetime(),
});

export const EventMessageSchema = z.object({
  type: z.string().min(1),
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Request = z.infer<typeof RequestSchema>;
export type Response = z.infer<typeof ResponseSchema>;
export type Capture = z.infer<typeof CaptureSchema>;
export type EventMessage = z.infer<typeof EventMessageSchema>;
