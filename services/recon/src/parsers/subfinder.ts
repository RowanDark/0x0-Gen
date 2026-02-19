import type { Parser, ParseResult, RawEntity } from "./base.js";

export const subfinderParser: Parser = {
  name: "Subfinder",
  source: "subfinder",
  supportedFormats: ["json", "txt"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("subfinder")) return true;
    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : [data];
      return arr.length > 0 && arr[0] && ("host" in arr[0] || "input" in arr[0]);
    } catch {
      // Might be line-per-line text of subdomains
      const lines = content.trim().split("\n");
      return lines.length > 0 && lines.every((l) => /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/.test(l.trim()));
    }
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    // Try JSON first
    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : [data];
      total = arr.length;

      for (let i = 0; i < arr.length; i++) {
        try {
          const entry = arr[i];
          const host = entry.host || entry.input || entry;
          if (typeof host === "string" && host) {
            entities.push({
              type: "subdomain",
              category: "infrastructure",
              value: host,
              attributes: {
                source: entry.source || "",
              },
              confidence: 75,
              source: "subfinder",
            });
          }
        } catch (err) {
          errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch {
      // Plain text mode (one subdomain per line)
      const lines = content.trim().split("\n");
      total = lines.length;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        entities.push({
          type: "subdomain",
          category: "infrastructure",
          value: line,
          attributes: {},
          confidence: 75,
          source: "subfinder",
        });
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
