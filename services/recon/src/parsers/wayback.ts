import type { Parser, ParseResult, RawEntity } from "./base.js";

export const waybackParser: Parser = {
  name: "waybackurls/gau",
  source: "waybackurls",
  supportedFormats: ["txt"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("wayback") || filename?.toLowerCase().includes("gau")) return true;
    const lines = content.trim().split("\n");
    if (lines.length === 0) return false;
    // Check if most lines are URLs
    const urlCount = lines.filter((l) => /^https?:\/\//.test(l.trim())).length;
    return urlCount > 0 && urlCount >= lines.length * 0.7;
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    const lines = content.trim().split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      total++;

      try {
        if (/^https?:\/\//.test(line)) {
          entities.push({
            type: "url",
            category: "web_assets",
            value: line,
            attributes: {},
            confidence: 65,
            source: "waybackurls",
          });
        } else {
          errors.push({ line: i + 1, message: `Not a valid URL: ${line.substring(0, 50)}` });
        }
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
