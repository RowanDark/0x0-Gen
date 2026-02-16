import { z } from "zod";

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  statusCode: z.number().int(),
  headers: z.record(z.string(), z.string()),
  body: z.string().optional(),
  timestamp: z.string().datetime(),
  duration: z.number().nonnegative(),
});

export type Response = z.infer<typeof ResponseSchema>;
