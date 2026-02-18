import { z } from "zod";

export const AttackTypeSchema = z.enum([
  "sniper",
  "battering_ram",
  "pitchfork",
  "cluster_bomb",
]);

export type AttackType = z.infer<typeof AttackTypeSchema>;

export const PayloadSourceSchema = z.enum(["manual", "file", "generated"]);

export type PayloadSource = z.infer<typeof PayloadSourceSchema>;

export const AttackStatusSchema = z.enum([
  "pending",
  "running",
  "paused",
  "completed",
  "cancelled",
]);

export type AttackStatus = z.infer<typeof AttackStatusSchema>;

export const IntruderPositionSchema = z.object({
  id: z.string().uuid(),
  start: z.number(),
  end: z.number(),
  name: z.string().optional(),
});

export type IntruderPosition = z.infer<typeof IntruderPositionSchema>;

export const IntruderPayloadSetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  payloads: z.array(z.string()),
  source: PayloadSourceSchema,
});

export type IntruderPayloadSet = z.infer<typeof IntruderPayloadSetSchema>;

export const IntruderOptionsSchema = z.object({
  concurrency: z.number().min(1).max(20).default(1),
  delayMs: z.number().min(0).default(0),
  followRedirects: z.boolean().default(false),
  timeout: z.number().min(0).default(30000),
  stopOnError: z.boolean().default(false),
});

export type IntruderOptions = z.infer<typeof IntruderOptionsSchema>;

export const IntruderConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  projectId: z.string().uuid().optional(),
  baseRequest: z.string(),
  positions: z.array(IntruderPositionSchema),
  payloadSets: z.array(IntruderPayloadSetSchema),
  attackType: AttackTypeSchema,
  options: IntruderOptionsSchema,
});

export type IntruderConfig = z.infer<typeof IntruderConfigSchema>;

export const IntruderResponseSchema = z.object({
  statusCode: z.number(),
  statusMessage: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string().nullable(),
  contentLength: z.number(),
});

export type IntruderResponse = z.infer<typeof IntruderResponseSchema>;

export const IntruderResultSchema = z.object({
  id: z.string().uuid(),
  configId: z.string().uuid(),
  requestIndex: z.number(),
  payloads: z.record(z.string(), z.string()),
  request: z.string(),
  response: IntruderResponseSchema.nullable(),
  duration: z.number(),
  error: z.string().nullable(),
  timestamp: z.number(),
});

export type IntruderResult = z.infer<typeof IntruderResultSchema>;

export const IntruderAttackSchema = z.object({
  id: z.string().uuid(),
  configId: z.string().uuid(),
  status: AttackStatusSchema,
  totalRequests: z.number(),
  completedRequests: z.number(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  results: z.array(IntruderResultSchema),
});

export type IntruderAttack = z.infer<typeof IntruderAttackSchema>;
