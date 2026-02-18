import { z } from "zod";

export const RepeaterRequestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
  url: z.string(),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().nullable().default(null),
});

export type RepeaterRequest = z.infer<typeof RepeaterRequestSchema>;

export const RepeaterResponseSchema = z.object({
  statusCode: z.number().int(),
  statusMessage: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string().nullable(),
  contentLength: z.number(),
});

export type RepeaterResponse = z.infer<typeof RepeaterResponseSchema>;

export const RepeaterHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  request: RepeaterRequestSchema,
  response: RepeaterResponseSchema.nullable(),
  duration: z.number(),
  error: z.string().nullable(),
});

export type RepeaterHistoryEntry = z.infer<typeof RepeaterHistoryEntrySchema>;

export const RepeaterTabSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  projectId: z.string().uuid().optional(),
  request: RepeaterRequestSchema,
  history: z.array(RepeaterHistoryEntrySchema).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type RepeaterTab = z.infer<typeof RepeaterTabSchema>;
