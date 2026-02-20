import type { Transform, TransformInput, TransformResult } from "./base.js";
import * as whois from "whois";
import { promisify } from "node:util";

const whoisLookup = promisify(whois.lookup);

export const whoisTransform: Transform = {
  id: "whois",
  name: "WHOIS Lookup",
  description: "Look up WHOIS registration information for a domain or IP",
  inputTypes: ["domain", "ip"],
  outputTypes: ["organization", "email", "person"],
  requiresApi: true,

  async execute(entity: TransformInput): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];
    const seen = new Set<string>();

    try {
      const data = await whoisLookup(entity.value);
      const parsed = parseWhoisResponse(data as string);

      // Add organization node if found
      if (parsed.organization && !seen.has(parsed.organization.toLowerCase())) {
        seen.add(parsed.organization.toLowerCase());
        nodes.push({
          entityId: null,
          type: "organization",
          label: parsed.organization,
        });
        edges.push({
          fromNodeId: parsed.organization,
          toNodeId: entity.id,
          type: "owns",
          label: "owns",
        });
      }

      // Add registrant email if found
      if (parsed.email && !seen.has(parsed.email.toLowerCase())) {
        seen.add(parsed.email.toLowerCase());
        nodes.push({
          entityId: null,
          type: "email",
          label: parsed.email,
        });
        edges.push({
          fromNodeId: parsed.email,
          toNodeId: entity.id,
          type: "registered",
          label: "registered",
        });
      }

      // Add registrant name if found
      if (parsed.registrantName && !seen.has(parsed.registrantName.toLowerCase())) {
        seen.add(parsed.registrantName.toLowerCase());
        nodes.push({
          entityId: null,
          type: "person",
          label: parsed.registrantName,
        });
        edges.push({
          fromNodeId: parsed.registrantName,
          toNodeId: entity.id,
          type: "registered",
          label: "registered",
        });
      }

      // Add registrar as organization if found
      if (parsed.registrar && !seen.has(parsed.registrar.toLowerCase())) {
        seen.add(parsed.registrar.toLowerCase());
        nodes.push({
          entityId: null,
          type: "organization",
          label: parsed.registrar,
        });
        edges.push({
          fromNodeId: entity.id,
          toNodeId: parsed.registrar,
          type: "registered_with",
          label: "registered with",
        });
      }

    } catch (error) {
      console.error(`[whoisTransform] WHOIS lookup failed for ${entity.value}:`, error);
      // Return empty results on failure rather than throwing
    }

    return { nodes, edges };
  },
};

interface ParsedWhois {
  organization?: string;
  email?: string;
  registrantName?: string;
  registrar?: string;
  creationDate?: string;
  expirationDate?: string;
  nameServers?: string[];
}

function parseWhoisResponse(raw: string): ParsedWhois {
  const result: ParsedWhois = {};
  const lines = raw.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (!value) continue;

    // Organization
    if ((key.includes("org") && key.includes("name")) || key === "organization" || key === "org" || key === "registrant organization") {
      if (!result.organization) result.organization = value;
    }

    // Registrant name
    if (key === "registrant name" || key === "registrant") {
      if (!result.registrantName && !value.includes("@")) {
        result.registrantName = value;
      }
    }

    // Email
    if (key.includes("email") || key.includes("e-mail") || key === "registrant email") {
      if (!result.email && value.includes("@")) {
        result.email = value;
      }
    }

    // Registrar
    if (key === "registrar" || key === "registrar name" || key === "sponsoring registrar") {
      if (!result.registrar) result.registrar = value;
    }

    // Creation date
    if (key.includes("creation") || key.includes("created") || key === "registration date") {
      if (!result.creationDate) result.creationDate = value;
    }

    // Expiration date
    if (key.includes("expir") || key.includes("expiration")) {
      if (!result.expirationDate) result.expirationDate = value;
    }

    // Name servers
    if (key === "name server" || key === "nserver" || key === "nameserver") {
      if (!result.nameServers) result.nameServers = [];
      result.nameServers.push(value.toLowerCase());
    }
  }

  return result;
}
