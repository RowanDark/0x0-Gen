import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

export const httpxParser: Parser = {
  name: "httpx",
  source: "httpx",
  supportedFormats: ["json"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("httpx")) return true;
    try {
      const lines = content.trim().split("\n");
      const first = JSON.parse(lines[0]);
      return "url" in first && ("status_code" in first || "status-code" in first || "webserver" in first || "tech" in first);
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
        const url = record.url || record.input || "";
        if (!url) continue;

        entities.push({
          type: "url",
          category: "web_assets",
          value: url,
          attributes: {
            statusCode: record.status_code || record["status-code"] || 0,
            title: record.title || "",
            webserver: record.webserver || "",
            contentLength: record.content_length || record["content-length"] || 0,
            contentType: record.content_type || record["content-type"] || "",
            method: record.method || "GET",
            host: record.host || "",
            scheme: record.scheme || "",
            path: record.path || "",
            responseTime: record.response_time || "",
          },
          confidence: 85,
          source: "httpx",
        });

        // Extract technologies
        const techs = record.tech || record.technologies || [];
        for (const tech of techs) {
          const techName = typeof tech === "string" ? tech : tech.name || "";
          if (techName) {
            entities.push({
              type: "technology",
              category: "technology",
              value: techName,
              attributes: { detectedAt: url },
              confidence: 75,
              source: "httpx",
            });

            relationships.push({
              fromValue: techName,
              fromType: "technology",
              toValue: url,
              toType: "url",
              type: "runs_on",
              confidence: 75,
            });
          }
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
