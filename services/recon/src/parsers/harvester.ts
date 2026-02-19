import type { Parser, ParseResult, RawEntity } from "./base.js";

export const harvesterParser: Parser = {
  name: "theHarvester",
  source: "theharvester",
  supportedFormats: ["json", "xml"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("harvester") || filename?.toLowerCase().includes("theharvester")) return true;
    try {
      const data = JSON.parse(content);
      return "emails" in data || "hosts" in data || "ips" in data || "interesting_urls" in data;
    } catch {
      return content.includes("<theHarvester") || content.includes("<harvester");
    }
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    try {
      const data = JSON.parse(content);

      // Emails
      const emails = data.emails || [];
      total += emails.length;
      for (const email of emails) {
        if (typeof email === "string" && email) {
          entities.push({
            type: "email",
            category: "people",
            value: email,
            attributes: {},
            confidence: 70,
            source: "theharvester",
          });
        }
      }

      // Hosts
      const hosts = data.hosts || [];
      total += hosts.length;
      for (const host of hosts) {
        const hostValue = typeof host === "string" ? host : host.hostname || host.host || "";
        if (hostValue) {
          entities.push({
            type: "subdomain",
            category: "infrastructure",
            value: hostValue.split(":")[0],
            attributes: {},
            confidence: 70,
            source: "theharvester",
          });
        }
      }

      // IPs
      const ips = data.ips || [];
      total += ips.length;
      for (const ip of ips) {
        if (typeof ip === "string" && ip) {
          entities.push({
            type: "ip",
            category: "infrastructure",
            value: ip,
            attributes: {},
            confidence: 70,
            source: "theharvester",
          });
        }
      }

      // Interesting URLs
      const urls = data.interesting_urls || [];
      total += urls.length;
      for (const url of urls) {
        if (typeof url === "string" && url) {
          entities.push({
            type: "url",
            category: "web_assets",
            value: url,
            attributes: {},
            confidence: 60,
            source: "theharvester",
          });
        }
      }
    } catch {
      // Try XML parsing fallback
      try {
        const emailMatches = content.match(/<email>([^<]+)<\/email>/g) || [];
        total += emailMatches.length;
        for (const m of emailMatches) {
          const value = m.replace(/<\/?email>/g, "");
          entities.push({
            type: "email",
            category: "people",
            value,
            attributes: {},
            confidence: 70,
            source: "theharvester",
          });
        }

        const hostMatches = content.match(/<hostname>([^<]+)<\/hostname>/g) || content.match(/<host>([^<]+)<\/host>/g) || [];
        total += hostMatches.length;
        for (const m of hostMatches) {
          const value = m.replace(/<\/?(?:hostname|host)>/g, "");
          entities.push({
            type: "subdomain",
            category: "infrastructure",
            value,
            attributes: {},
            confidence: 70,
            source: "theharvester",
          });
        }
      } catch (err) {
        errors.push({ message: `Failed to parse theHarvester data: ${err instanceof Error ? err.message : String(err)}` });
      }
    }

    return {
      entities,
      relationships: [],
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
