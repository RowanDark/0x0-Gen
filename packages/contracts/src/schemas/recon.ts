import { z } from "zod";

// --- Enums ---

export const EntityCategorySchema = z.enum([
  "infrastructure",
  "web_assets",
  "technology",
  "network",
  "people",
  "organizations",
  "credentials",
  "vulnerabilities",
  "files",
]);

export type EntityCategory = z.infer<typeof EntityCategorySchema>;

export const EntityTypeSchema = z.enum([
  "domain",
  "subdomain",
  "ip",
  "asn",
  "netblock",
  "url",
  "endpoint",
  "parameter",
  "port",
  "service",
  "technology",
  "email",
  "username",
  "person",
  "organization",
  "credential",
  "vulnerability",
  "file",
  "certificate",
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ImportSourceTypeSchema = z.enum([
  "spiderfoot",
  "amass",
  "subfinder",
  "ffuf",
  "nuclei",
  "nmap",
  "httpx",
  "theharvester",
  "shodan",
  "zap",
  "burp",
  "waybackurls",
  "gau",
  "custom_json",
  "custom_csv",
  "custom_txt",
]);

export type ImportSourceType = z.infer<typeof ImportSourceTypeSchema>;

export const RelationshipTypeSchema = z.enum([
  "resolves_to",
  "contains",
  "belongs_to",
  "runs_on",
  "linked_to",
  "found_at",
]);

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

// --- Schemas ---

export const ReconProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  targets: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ReconProject = z.infer<typeof ReconProjectSchema>;

export const ReconEntitySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  importId: z.string().uuid().nullable(),
  category: EntityCategorySchema,
  type: EntityTypeSchema,
  value: z.string(),
  normalizedValue: z.string(),
  attributes: z.record(z.any()),
  confidence: z.number().min(0).max(100),
  sources: z.array(z.string()),
  firstSeen: z.number(),
  lastSeen: z.number(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
});

export type ReconEntity = z.infer<typeof ReconEntitySchema>;

export const ReconRelationshipSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  type: z.string(),
  confidence: z.number().min(0).max(100),
  source: z.string(),
  createdAt: z.number(),
});

export type ReconRelationship = z.infer<typeof ReconRelationshipSchema>;

export const ReconImportStatsSchema = z.object({
  total: z.number(),
  new: z.number(),
  updated: z.number(),
  duplicates: z.number(),
  errors: z.number(),
});

export type ReconImportStats = z.infer<typeof ReconImportStatsSchema>;

export const ReconImportErrorSchema = z.object({
  line: z.number().optional(),
  message: z.string(),
});

export type ReconImportError = z.infer<typeof ReconImportErrorSchema>;

export const ReconImportSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  source: z.string(),
  format: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  importedAt: z.number(),
  stats: ReconImportStatsSchema,
  errors: z.array(ReconImportErrorSchema),
});

export type ReconImport = z.infer<typeof ReconImportSchema>;
