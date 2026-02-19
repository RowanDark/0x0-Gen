import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";
import type { EntityType, EntityCategory } from "@0x0-gen/contracts";

const EVENT_TYPE_MAP: Record<string, { type: EntityType; category: EntityCategory }> = {
  INTERNET_NAME: { type: "subdomain", category: "infrastructure" },
  DOMAIN_NAME: { type: "domain", category: "infrastructure" },
  IP_ADDRESS: { type: "ip", category: "infrastructure" },
  EMAILADDR: { type: "email", category: "people" },
  HUMAN_NAME: { type: "person", category: "people" },
  COMPANY_NAME: { type: "organization", category: "organizations" },
  VULNERABILITY: { type: "vulnerability", category: "vulnerabilities" },
  TCP_PORT_OPEN: { type: "port", category: "network" },
  WEBSERVER_BANNER: { type: "service", category: "network" },
  PROVIDER_DNS: { type: "organization", category: "organizations" },
  BGP_AS_OWNER: { type: "asn", category: "infrastructure" },
  SSL_CERTIFICATE_ISSUED: { type: "certificate", category: "infrastructure" },
  URL_WEB_FRAMEWORK: { type: "technology", category: "technology" },
};

export const spiderfootParser: Parser = {
  name: "SpiderFoot",
  source: "spiderfoot",
  supportedFormats: ["json", "csv"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("spiderfoot")) return true;
    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : [data];
      return arr.length > 0 && arr[0] && ("type" in arr[0] || "event_type" in arr[0]) && ("data" in arr[0] || "event_data" in arr[0]);
    } catch {
      return false;
    }
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const relationships: RawRelationship[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    try {
      const data = JSON.parse(content);
      const events = Array.isArray(data) ? data : [data];
      total = events.length;

      for (let i = 0; i < events.length; i++) {
        try {
          const event = events[i];
          const eventType = event.type || event.event_type || "";
          const eventData = event.data || event.event_data || "";
          const mapping = EVENT_TYPE_MAP[eventType];

          if (!mapping || !eventData) continue;

          entities.push({
            type: mapping.type,
            category: mapping.category,
            value: String(eventData),
            attributes: {
              spiderfootType: eventType,
              module: event.module || event.source_module || "",
              generated: event.generated || event.event_generated || "",
            },
            confidence: 70,
            source: "spiderfoot",
          });
        } catch (err) {
          errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch (err) {
      errors.push({ message: `Failed to parse SpiderFoot data: ${err instanceof Error ? err.message : String(err)}` });
    }

    return {
      entities,
      relationships,
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
