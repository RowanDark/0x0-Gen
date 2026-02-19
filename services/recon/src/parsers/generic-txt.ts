import type { Parser, ParseResult, RawEntity } from "./base.js";
import type { EntityType, EntityCategory } from "@0x0-gen/contracts";

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\//;
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;

function detectLineType(line: string): { type: EntityType; category: EntityCategory } {
  if (URL_REGEX.test(line)) return { type: "url", category: "web_assets" };
  if (EMAIL_REGEX.test(line)) return { type: "email", category: "people" };
  if (IP_REGEX.test(line)) return { type: "ip", category: "infrastructure" };
  if (DOMAIN_REGEX.test(line)) return { type: "subdomain", category: "infrastructure" };
  return { type: "subdomain", category: "infrastructure" };
}

export const genericTxtParser: Parser = {
  name: "Custom TXT",
  source: "custom_txt",
  supportedFormats: ["txt"],

  detect(_content: string, filename?: string): boolean {
    return filename?.toLowerCase().endsWith(".txt") ?? false;
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    const lines = content.trim().split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      total++;

      try {
        const { type, category } = detectLineType(line);
        entities.push({
          type,
          category,
          value: line,
          attributes: {},
          confidence: 50,
          source: "custom_txt",
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
