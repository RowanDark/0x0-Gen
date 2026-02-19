import type { ReconEntity, ReconRelationship, EntityType } from "@0x0-gen/contracts";
import { randomUUID } from "node:crypto";

function getDomainFromValue(value: string): string | null {
  // Strip protocol if present
  let host = value.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  host = host.toLowerCase().replace(/\.+$/, "");
  const parts = host.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return null;
}

function isSubdomainOf(subdomain: string, domain: string): boolean {
  const normSub = subdomain.toLowerCase().replace(/\.+$/, "");
  const normDom = domain.toLowerCase().replace(/\.+$/, "");
  return normSub !== normDom && normSub.endsWith(`.${normDom}`);
}

export function inferRelationships(
  entities: ReconEntity[],
  projectId: string,
  source: string,
): ReconRelationship[] {
  const relationships: ReconRelationship[] = [];
  const now = Date.now();

  // Build entity maps by type for quick lookups
  const byType = new Map<EntityType, ReconEntity[]>();
  for (const entity of entities) {
    const arr = byType.get(entity.type) || [];
    arr.push(entity);
    byType.set(entity.type, arr);
  }

  const domains = byType.get("domain") || [];
  const subdomains = byType.get("subdomain") || [];
  const ips = byType.get("ip") || [];
  const ports = byType.get("port") || [];
  const urls = byType.get("url") || [];
  const vulnerabilities = byType.get("vulnerability") || [];
  const technologies = byType.get("technology") || [];

  // Subdomain -> domain: belongs_to
  for (const sub of subdomains) {
    for (const dom of domains) {
      if (isSubdomainOf(sub.value, dom.value)) {
        relationships.push({
          id: randomUUID(),
          projectId,
          fromEntityId: sub.id,
          toEntityId: dom.id,
          type: "belongs_to",
          confidence: 90,
          source,
          createdAt: now,
        });
      }
    }
  }

  // Port -> IP: runs_on (from port value pattern like "1.2.3.4:80/tcp")
  for (const port of ports) {
    const ipPart = port.value.split(":")[0];
    const matchingIp = ips.find((ip) => ip.normalizedValue === ipPart.toLowerCase());
    if (matchingIp) {
      relationships.push({
        id: randomUUID(),
        projectId,
        fromEntityId: port.id,
        toEntityId: matchingIp.id,
        type: "runs_on",
        confidence: 90,
        source,
        createdAt: now,
      });
    }
  }

  // URL -> domain/subdomain: found_at
  for (const url of urls) {
    const domain = getDomainFromValue(url.value);
    if (!domain) continue;

    const urlHost = url.value.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].toLowerCase();

    // Try to match against subdomains first
    const matchingSub = subdomains.find((s) => s.normalizedValue === urlHost);
    if (matchingSub) {
      relationships.push({
        id: randomUUID(),
        projectId,
        fromEntityId: url.id,
        toEntityId: matchingSub.id,
        type: "found_at",
        confidence: 85,
        source,
        createdAt: now,
      });
      continue;
    }

    // Try domains
    const matchingDom = domains.find((d) => d.normalizedValue === urlHost);
    if (matchingDom) {
      relationships.push({
        id: randomUUID(),
        projectId,
        fromEntityId: url.id,
        toEntityId: matchingDom.id,
        type: "found_at",
        confidence: 85,
        source,
        createdAt: now,
      });
    }
  }

  // Vulnerability -> URL: found_at (if vulnerability has a url attribute)
  for (const vuln of vulnerabilities) {
    const vulnUrl = (vuln.attributes?.url || vuln.attributes?.matchedAt || "") as string;
    if (!vulnUrl) continue;

    const matchingUrl = urls.find((u) => u.normalizedValue === vulnUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase());
    if (matchingUrl) {
      relationships.push({
        id: randomUUID(),
        projectId,
        fromEntityId: vuln.id,
        toEntityId: matchingUrl.id,
        type: "found_at",
        confidence: 80,
        source,
        createdAt: now,
      });
    }
  }

  // Technology -> URL: runs_on (if technology has a detectedAt attribute)
  for (const tech of technologies) {
    const techUrl = (tech.attributes?.detectedAt || "") as string;
    if (!techUrl) continue;

    const matchingUrl = urls.find((u) => u.normalizedValue === techUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase());
    if (matchingUrl) {
      relationships.push({
        id: randomUUID(),
        projectId,
        fromEntityId: tech.id,
        toEntityId: matchingUrl.id,
        type: "runs_on",
        confidence: 75,
        source,
        createdAt: now,
      });
    }
  }

  return relationships;
}
