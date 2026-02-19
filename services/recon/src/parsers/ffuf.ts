import type { Parser, ParseResult, RawEntity } from "./base.js";

export const ffufParser: Parser = {
  name: "ffuf",
  source: "ffuf",
  supportedFormats: ["json"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("ffuf")) return true;
    try {
      const data = JSON.parse(content);
      return "results" in data && "commandline" in data;
    } catch {
      return false;
    }
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    try {
      const data = JSON.parse(content);
      const results = data.results || [];
      total = results.length;

      for (let i = 0; i < results.length; i++) {
        try {
          const result = results[i];
          const url = result.url || "";
          if (!url) continue;

          entities.push({
            type: "url",
            category: "web_assets",
            value: url,
            attributes: {
              status: result.status || 0,
              length: result.length || 0,
              words: result.words || 0,
              lines: result.lines || 0,
              contentType: result["content-type"] || result.content_type || "",
              input: result.input || {},
              redirectlocation: result.redirectlocation || "",
            },
            confidence: 85,
            source: "ffuf",
          });
        } catch (err) {
          errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch (err) {
      errors.push({ message: `Failed to parse ffuf data: ${err instanceof Error ? err.message : String(err)}` });
    }

    return {
      entities,
      relationships: [],
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
