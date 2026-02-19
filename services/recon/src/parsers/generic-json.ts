import type { Parser, ParseResult, ParseOptions, RawEntity } from "./base.js";
import type { EntityType, EntityCategory } from "@0x0-gen/contracts";

export const genericJsonParser: Parser = {
  name: "Custom JSON",
  source: "custom_json",
  supportedFormats: ["json"],

  detect(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  },

  parse(content: string, options?: ParseOptions): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : [data];
      total = arr.length;

      const mapping = options?.fieldMapping || {};
      const valueField = mapping.value || "value";
      const typeField = mapping.type || "type";
      const categoryField = mapping.category || "category";

      for (let i = 0; i < arr.length; i++) {
        try {
          const entry = arr[i];
          const value = entry[valueField];
          if (!value) continue;

          const type = (entry[typeField] || options?.defaultType || "subdomain") as EntityType;
          const category = (entry[categoryField] || options?.defaultCategory || "infrastructure") as EntityCategory;

          entities.push({
            type,
            category,
            value: String(value),
            attributes: { ...entry },
            confidence: 50,
            source: "custom_json",
          });
        } catch (err) {
          errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch (err) {
      errors.push({ message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}` });
    }

    return {
      entities,
      relationships: [],
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
