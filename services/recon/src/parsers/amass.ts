import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

export const amassParser: Parser = {
  name: "Amass",
  source: "amass",
  supportedFormats: ["json"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("amass")) return true;
    try {
      const lines = content.trim().split("\n");
      const first = JSON.parse(lines[0]);
      return "name" in first && ("domain" in first || "addresses" in first || "tag" in first);
    } catch {
      return false;
    }
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const relationships: RawRelationship[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    const lines = content.trim().split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      total++;

      try {
        const record = JSON.parse(line);
        const name = record.name || "";
        const domain = record.domain || "";

        if (name) {
          entities.push({
            type: name === domain ? "domain" : "subdomain",
            category: "infrastructure",
            value: name,
            attributes: {
              tag: record.tag || "",
              sources: record.sources || [],
            },
            confidence: 80,
            source: "amass",
          });
        }

        const addresses = record.addresses || [];
        for (const addr of addresses) {
          const ip = addr.ip || addr;
          if (typeof ip === "string" && ip) {
            entities.push({
              type: "ip",
              category: "infrastructure",
              value: ip,
              attributes: {
                cidr: addr.cidr || "",
                asn: addr.asn || 0,
                desc: addr.desc || "",
              },
              confidence: 80,
              source: "amass",
            });

            if (name) {
              relationships.push({
                fromValue: name,
                fromType: name === domain ? "domain" : "subdomain",
                toValue: ip,
                toType: "ip",
                type: "resolves_to",
                confidence: 80,
              });
            }
          }
        }

        if (name && domain && name !== domain) {
          relationships.push({
            fromValue: name,
            fromType: "subdomain",
            toValue: domain,
            toType: "domain",
            type: "belongs_to",
            confidence: 90,
          });
        }
      } catch (err) {
        errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
      }
    }

    return {
      entities,
      relationships,
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
