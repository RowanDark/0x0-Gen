import { z } from "zod";

export const TransformTypeSchema = z.enum([
  "base64",
  "url",
  "html",
  "hex",
  "ascii",
  "unicode",
  "md5",
  "sha1",
  "sha256",
  "gzip",
  "jwt",
]);

export type TransformType = z.infer<typeof TransformTypeSchema>;

export const TransformDirectionSchema = z.enum(["encode", "decode"]);

export type TransformDirection = z.infer<typeof TransformDirectionSchema>;

export const TransformStepSchema = z.object({
  type: TransformTypeSchema,
  direction: TransformDirectionSchema,
  options: z.record(z.string(), z.unknown()).optional(),
});

export type TransformStep = z.infer<typeof TransformStepSchema>;

export const TransformStepResultSchema = z.object({
  type: TransformTypeSchema,
  direction: TransformDirectionSchema,
  input: z.string(),
  output: z.string(),
  success: z.boolean(),
  error: z.string().nullable(),
});

export type TransformStepResult = z.infer<typeof TransformStepResultSchema>;

export const TransformResultSchema = z.object({
  input: z.string(),
  output: z.string(),
  steps: z.array(TransformStepResultSchema),
  success: z.boolean(),
  error: z.string().nullable(),
});

export type TransformResult = z.infer<typeof TransformResultSchema>;

export const DecoderPresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  steps: z.array(TransformStepSchema),
  projectId: z.string().uuid().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type DecoderPreset = z.infer<typeof DecoderPresetSchema>;
