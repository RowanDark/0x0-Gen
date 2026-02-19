import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

export const shodanParser: Parser = {
  name: "Shodan",
  source: "shodan",
  supportedFormats: ["json"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("shodan")) return true;
    try {
      const lines = content.trim().split("\n");
      const first = JSON.parse(lines[0]);
      return "ip_str" in first || ("ip" in first && ("port" in first || "org" in first || "isp" in first));
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
        const ip = record.ip_str || record.ip || "";
        if (!ip) continue;

        entities.push({
          type: "ip",
          category: "infrastructure",
          value: String(ip),
          attributes: {
            org: record.org || "",
            isp: record.isp || "",
            os: record.os || "",
            country: record.location?.country_name || record.country_name || "",
            city: record.location?.city || record.city || "",
          },
          confidence: 85,
          source: "shodan",
        });

        // Port info
        const port = record.port;
        if (port) {
          const transport = record.transport || "tcp";
          entities.push({
            type: "port",
            category: "network",
            value: `${ip}:${port}/${transport}`,
            attributes: {
              port,
              transport,
              banner: record.data || "",
              product: record.product || "",
              version: record.version || "",
            },
            confidence: 85,
            source: "shodan",
          });

          relationships.push({
            fromValue: `${ip}:${port}/${transport}`,
            fromType: "port",
            toValue: String(ip),
            toType: "ip",
            type: "runs_on",
            confidence: 90,
          });
        }

        // Vulnerabilities
        const vulns = record.vulns || {};
        for (const cve of Object.keys(vulns)) {
          entities.push({
            type: "vulnerability",
            category: "vulnerabilities",
            value: cve,
            attributes: {
              ip: String(ip),
              port,
              cvss: vulns[cve]?.cvss || 0,
              summary: vulns[cve]?.summary || "",
            },
            confidence: 80,
            source: "shodan",
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
