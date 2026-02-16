import { z } from "zod";

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);

export const RequestSchema = z.object({
  id: z.string().uuid(),
  method: HttpMethodSchema,
  url: z.string().url(),
  headers: z.record(z.string(), z.string()),
  body: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type Request = z.infer<typeof RequestSchema>;
