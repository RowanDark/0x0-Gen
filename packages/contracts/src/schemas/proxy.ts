import { z } from "zod";

export const ProxyConfigSchema = z.object({
  port: z.number().int().min(0).max(65535).default(8080),
  host: z.string().default("127.0.0.1"),
  projectId: z.string().uuid().optional(),
  interceptEnabled: z.boolean().default(true),
  mitmEnabled: z.boolean().default(false),
  mitmHosts: z.array(z.string()).default([]),
});

export type ProxyConfig = z.infer<typeof ProxyConfigSchema>;

export const ProxyRequestSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  projectId: z.string().uuid().optional(),
  method: z.string(),
  url: z.string(),
  host: z.string(),
  path: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string().nullable(),
  contentLength: z.number(),
});

export type ProxyRequest = z.infer<typeof ProxyRequestSchema>;

export const ProxyResponseSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  timestamp: z.number(),
  statusCode: z.number().int(),
  statusMessage: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string().nullable(),
  contentLength: z.number(),
  duration: z.number(),
});

export type ProxyResponse = z.infer<typeof ProxyResponseSchema>;

export const CapturedExchangeSchema = z.object({
  id: z.string().uuid(),
  request: ProxyRequestSchema,
  response: ProxyResponseSchema.nullable(),
  projectId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
});

export type CapturedExchange = z.infer<typeof CapturedExchangeSchema>;
