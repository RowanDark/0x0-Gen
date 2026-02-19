import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

function extractBurpTag(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function getTagContent(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
}

export const burpParser: Parser = {
  name: "Burp Suite",
  source: "burp",
  supportedFormats: ["xml"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().includes("burp")) return true;
    return content.includes("<issues") && (content.includes("burpVersion") || content.includes("<issue>"));
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const relationships: RawRelationship[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    try {
      const issues = extractBurpTag(content, "issue");
      total = issues.length;

      for (let i = 0; i < issues.length; i++) {
        try {
          const issue = issues[i];
          const name = getTagContent(issue, "name");
          const severity = getTagContent(issue, "severity");
          const confidence = getTagContent(issue, "confidence");
          const host = getTagContent(issue, "host");
          const path = getTagContent(issue, "path");
          const url = host && path ? `${host}${path}` : host || path;
          const issueType = getTagContent(issue, "type");
          const issueDetail = getTagContent(issue, "issueDetail");
          const remediation = getTagContent(issue, "remediationDetail") || getTagContent(issue, "issueBackground");

          if (name) {
            entities.push({
              type: "vulnerability",
              category: "vulnerabilities",
              value: name,
              attributes: {
                severity,
                confidence,
                issueType,
                detail: issueDetail,
                remediation,
                url,
              },
              confidence: confidence === "Certain" ? 95 : confidence === "Firm" ? 80 : 60,
              source: "burp",
            });
          }

          if (url) {
            entities.push({
              type: "url",
              category: "web_assets",
              value: url,
              attributes: {},
              confidence: 85,
              source: "burp",
            });

            if (name) {
              relationships.push({
                fromValue: name,
                fromType: "vulnerability",
                toValue: url,
                toType: "url",
                type: "found_at",
                confidence: 85,
              });
            }
          }
        } catch (err) {
          errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch (err) {
      errors.push({ message: `Failed to parse Burp data: ${err instanceof Error ? err.message : String(err)}` });
    }

    return {
      entities,
      relationships,
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
