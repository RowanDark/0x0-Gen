import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

export const zapParser: Parser = {
  name: "OWASP ZAP",
  source: "zap",
  supportedFormats: ["json"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("zap")) return true;
    try {
      const data = JSON.parse(content);
      return ("site" in data && "alerts" in (Array.isArray(data.site) ? data.site[0] || {} : data.site || {})) ||
        ("alerts" in data) ||
        ("OWASPZAPReport" in data);
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

      // Handle different ZAP JSON formats
      let alerts: Array<Record<string, unknown>> = [];
      if (data.alerts) {
        alerts = data.alerts;
      } else if (data.site) {
        const sites = Array.isArray(data.site) ? data.site : [data.site];
        for (const site of sites) {
          if (site.alerts) {
            alerts = alerts.concat(site.alerts);
          }
        }
      }

      total = alerts.length;

      for (let i = 0; i < alerts.length; i++) {
        try {
          const alert = alerts[i];
          const name = (alert.alert || alert.name || "") as string;
          const risk = (alert.riskdesc || alert.risk || "") as string;
          const confidence = (alert.confidence || "") as string;
          const url = (alert.url || "") as string;
          const evidence = (alert.evidence || "") as string;
          const description = (alert.desc || alert.description || "") as string;
          const solution = (alert.solution || "") as string;
          const cweId = alert.cweid || alert.cwe || "";
          const wascId = alert.wascid || "";

          entities.push({
            type: "vulnerability",
            category: "vulnerabilities",
            value: name,
            attributes: {
              risk,
              confidence,
              url,
              evidence,
              description,
              solution,
              cweId,
              wascId,
              param: alert.param || "",
              attack: alert.attack || "",
            },
            confidence: confidence === "High" ? 85 : confidence === "Medium" ? 70 : 55,
            source: "zap",
          });

          if (url) {
            relationships.push({
              fromValue: name,
              fromType: "vulnerability",
              toValue: url,
              toType: "url",
              type: "found_at",
              confidence: 80,
            });
          }
        } catch (err) {
          errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch (err) {
      errors.push({ message: `Failed to parse ZAP data: ${err instanceof Error ? err.message : String(err)}` });
    }

    return {
      entities,
      relationships,
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
