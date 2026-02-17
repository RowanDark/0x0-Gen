import { z } from "zod";
import { RequestSchema } from "./request.js";
import { ResponseSchema } from "./response.js";

export const CaptureSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  request: RequestSchema,
  response: ResponseSchema.optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export type Capture = z.infer<typeof CaptureSchema>;
