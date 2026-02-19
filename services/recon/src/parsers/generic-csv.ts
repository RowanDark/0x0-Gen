import type { Parser, ParseResult, ParseOptions, RawEntity } from "./base.js";
import type { EntityType, EntityCategory } from "@0x0-gen/contracts";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export const genericCsvParser: Parser = {
  name: "Custom CSV",
  source: "custom_csv",
  supportedFormats: ["csv"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().endsWith(".csv")) return true;
    const lines = content.trim().split("\n");
    if (lines.length < 2) return false;
    // Check if lines have consistent comma counts
    const firstCommas = (lines[0].match(/,/g) || []).length;
    return firstCommas > 0 && lines.slice(1, 5).every((l) => Math.abs((l.match(/,/g) || []).length - firstCommas) <= 1);
  },

  parse(content: string, options?: ParseOptions): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];

    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      return {
        entities: [],
        relationships: [],
        stats: { total: 0, parsed: 0, errors: 0 },
        errors: [],
      };
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const total = lines.length - 1;

    const colMapping = options?.columnMapping || {};
    const valueCol = colMapping.value || "value";
    const typeCol = colMapping.type || "type";
    const categoryCol = colMapping.category || "category";

    const valueIdx = headers.indexOf(valueCol.toLowerCase());
    const typeIdx = headers.indexOf(typeCol.toLowerCase());
    const categoryIdx = headers.indexOf(categoryCol.toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const fields = parseCsvLine(line);
        const value = valueIdx >= 0 ? fields[valueIdx] : fields[0];
        if (!value) continue;

        const type = (typeIdx >= 0 ? fields[typeIdx] : options?.defaultType || "subdomain") as EntityType;
        const category = (categoryIdx >= 0 ? fields[categoryIdx] : options?.defaultCategory || "infrastructure") as EntityCategory;

        const attributes: Record<string, unknown> = {};
        for (let j = 0; j < headers.length; j++) {
          if (j !== valueIdx && j !== typeIdx && j !== categoryIdx) {
            attributes[headers[j]] = fields[j] || "";
          }
        }

        entities.push({
          type,
          category,
          value,
          attributes,
          confidence: 50,
          source: "custom_csv",
        });
      } catch (err) {
        errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
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
