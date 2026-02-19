import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

export const nucleiParser: Parser = {
  name: "Nuclei",
  source: "nuclei",
  supportedFormats: ["json"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("nuclei")) return true;
    try {
      const lines = content.trim().split("\n");
      const first = JSON.parse(lines[0]);
      return ("template-id" in first || "templateID" in first || "template_id" in first) && ("host" in first || "matched-at" in first);
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
        const templateId = record["template-id"] || record.templateID || record.template_id || "";
        const name = record.info?.name || record.name || templateId;
        const severity = record.info?.severity || record.severity || "unknown";
        const host = record.host || "";
        const matchedAt = record["matched-at"] || record.matched_at || host;

        entities.push({
          type: "vulnerability",
          category: "vulnerabilities",
          value: `${templateId}: ${name}`,
          attributes: {
            templateId,
            name,
            severity,
            host,
            matchedAt,
            type: record.type || "",
            extractedResults: record["extracted-results"] || record.extracted_results || [],
            description: record.info?.description || "",
            reference: record.info?.reference || [],
            tags: record.info?.tags || [],
          },
          confidence: severity === "critical" ? 95 : severity === "high" ? 85 : severity === "medium" ? 70 : 60,
          source: "nuclei",
        });

        if (matchedAt) {
          relationships.push({
            fromValue: `${templateId}: ${name}`,
            fromType: "vulnerability",
            toValue: matchedAt,
            toType: "url",
            type: "found_at",
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
