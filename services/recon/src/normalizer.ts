import type { EntityCategory, EntityType, ReconEntity } from "@0x0-gen/contracts";
import type { RawEntity } from "./parsers/base.js";
import { randomUUID } from "node:crypto";

const TYPE_TO_CATEGORY: Record<EntityType, EntityCategory> = {
  domain: "infrastructure",
  subdomain: "infrastructure",
  ip: "infrastructure",
  asn: "infrastructure",
  netblock: "infrastructure",
  url: "web_assets",
  endpoint: "web_assets",
  parameter: "web_assets",
  port: "network",
  service: "network",
  technology: "technology",
  email: "people",
  username: "people",
  person: "people",
  organization: "organizations",
  credential: "credentials",
  vulnerability: "vulnerabilities",
  file: "files",
  certificate: "infrastructure",
};

function createNormalizedValue(value: string, type: EntityType): string {
  let normalized = value.trim().toLowerCase();

  // Remove protocol for URL types
  if (type === "url" || type === "endpoint") {
    normalized = normalized.replace(/^https?:\/\//, "");
    // Remove trailing slash
    normalized = normalized.replace(/\/+$/, "");
  }

  // Remove trailing dots for domains
  if (type === "domain" || type === "subdomain") {
    normalized = normalized.replace(/\.+$/, "");
  }

  return normalized;
}

export function normalizeEntity(
  raw: RawEntity,
  projectId: string,
  importId: string | null,
): ReconEntity {
  const category = TYPE_TO_CATEGORY[raw.type] || raw.category;
  const now = Date.now();

  return {
    id: randomUUID(),
    projectId,
    importId,
    category,
    type: raw.type,
    value: raw.value,
    normalizedValue: createNormalizedValue(raw.value, raw.type),
    attributes: raw.attributes || {},
    confidence: raw.confidence ?? 50,
    sources: [raw.source],
    firstSeen: now,
    lastSeen: now,
    tags: [],
    notes: undefined,
  };
}

export function normalizeEntities(
  rawEntities: RawEntity[],
  projectId: string,
  importId: string | null,
): ReconEntity[] {
  return rawEntities.map((raw) => normalizeEntity(raw, projectId, importId));
}
