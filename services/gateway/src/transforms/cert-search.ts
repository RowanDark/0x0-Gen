import type { Transform, TransformInput, TransformResult } from "./base.js";

export const certSearchTransform: Transform = {
  id: "cert-search",
  name: "Certificate Search",
  description: "Search certificate transparency logs for related domains via crt.sh",
  inputTypes: ["domain"],
  outputTypes: ["domain", "certificate"],
  requiresApi: true,

  async execute(entity: TransformInput): Promise<TransformResult> {
    const nodes: TransformResult["nodes"] = [];
    const edges: TransformResult["edges"] = [];
    const seen = new Set<string>();

    try {
      const response = await fetch(
        `https://crt.sh/?q=${encodeURIComponent(entity.value)}&output=json`,
        { signal: AbortSignal.timeout(10000) },
      );

      if (response.ok) {
        const data = (await response.json()) as Array<{
          name_value: string;
          issuer_name: string;
          serial_number: string;
        }>;

        for (const entry of data) {
          const names = entry.name_value.split("\n");
          for (const name of names) {
            const clean = name.trim().toLowerCase().replace(/^\*\./, "");
            if (!clean || clean === entity.value.toLowerCase()) continue;

            // Only include related domains (not subdomains - that's subdomain-enum)
            const parts = clean.split(".");
            if (parts.length >= 2) {
              const baseDomain = parts.slice(-2).join(".");
              if (baseDomain !== entity.value.toLowerCase() && !seen.has(baseDomain)) {
                seen.add(baseDomain);
                nodes.push({
                  entityId: null,
                  type: "domain",
                  label: baseDomain,
                });
                edges.push({
                  fromNodeId: entity.id,
                  toNodeId: baseDomain,
                  type: "linked_to",
                  label: "shared certificate",
                });
              }
            }
          }
        }
      }
    } catch {
      // crt.sh query failed
    }

    return { nodes, edges };
  },
};
