import { z } from "zod";
import { EntityTypeSchema } from "./recon.js";

// --- Node Style ---

export const MapperNodeStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  icon: z.string().optional(),
});

export type MapperNodeStyle = z.infer<typeof MapperNodeStyleSchema>;

// --- Edge Style ---

export const MapperEdgeStyleSchema = z.object({
  color: z.string().optional(),
  width: z.number().optional(),
  dashed: z.boolean().optional(),
});

export type MapperEdgeStyle = z.infer<typeof MapperEdgeStyleSchema>;

// --- Viewport ---

export const MapperViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export type MapperViewport = z.infer<typeof MapperViewportSchema>;

// --- Node ---

export const MapperNodeSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid().nullable(),
  type: EntityTypeSchema,
  label: z.string(),
  x: z.number(),
  y: z.number(),
  pinned: z.boolean(),
  style: MapperNodeStyleSchema,
  data: z.record(z.any()),
});

export type MapperNode = z.infer<typeof MapperNodeSchema>;

// --- Edge ---

export const MapperEdgeSchema = z.object({
  id: z.string().uuid(),
  relationshipId: z.string().uuid().nullable(),
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid(),
  type: z.string(),
  label: z.string().optional(),
  style: MapperEdgeStyleSchema,
});

export type MapperEdge = z.infer<typeof MapperEdgeSchema>;

// --- Canvas ---

export const MapperCanvasSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  nodes: z.array(MapperNodeSchema),
  edges: z.array(MapperEdgeSchema),
  viewport: MapperViewportSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type MapperCanvas = z.infer<typeof MapperCanvasSchema>;

// --- Transform ---

export const MapperTransformSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  inputTypes: z.array(EntityTypeSchema),
  outputTypes: z.array(EntityTypeSchema),
  requiresApi: z.boolean(),
});

export type MapperTransform = z.infer<typeof MapperTransformSchema>;

// --- Transform Result ---

export const MapperTransformResultSchema = z.object({
  nodes: z.array(MapperNodeSchema),
  edges: z.array(MapperEdgeSchema),
});

export type MapperTransformResult = z.infer<typeof MapperTransformResultSchema>;
