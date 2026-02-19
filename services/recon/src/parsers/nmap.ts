import type { Parser, ParseResult, RawEntity, RawRelationship } from "./base.js";

function extractTag(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}\\b([^>]*)(?:/>|>[\\s\\S]*?</${tag}>)`, "g");
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

function getAttr(element: string, attr: string): string {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = element.match(regex);
  return match ? match[1] : "";
}

export const nmapParser: Parser = {
  name: "Nmap",
  source: "nmap",
  supportedFormats: ["xml"],

  detect(content: string, filename?: string): boolean {
    if (filename?.toLowerCase().endsWith(".xml") && filename.toLowerCase().includes("nmap")) return true;
    return content.includes("<nmaprun") || content.includes("<!DOCTYPE nmaprun");
  },

  parse(content: string): ParseResult {
    const entities: RawEntity[] = [];
    const relationships: RawRelationship[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    let total = 0;

    try {
      const hosts = extractTag(content, "host");
      total = hosts.length;

      for (const host of hosts) {
        try {
          // Extract IP addresses
          const addresses = extractTag(host, "address");
          const ipAddresses: string[] = [];

          for (const addr of addresses) {
            const addrType = getAttr(addr, "addrtype");
            const addrValue = getAttr(addr, "addr");
            if (addrType === "ipv4" || addrType === "ipv6") {
              ipAddresses.push(addrValue);
              entities.push({
                type: "ip",
                category: "infrastructure",
                value: addrValue,
                attributes: {
                  addrType,
                },
                confidence: 90,
                source: "nmap",
              });
            }
          }

          // Extract hostnames
          const hostnames = extractTag(host, "hostname");
          for (const hn of hostnames) {
            const name = getAttr(hn, "name");
            const hnType = getAttr(hn, "type");
            if (name) {
              entities.push({
                type: "subdomain",
                category: "infrastructure",
                value: name,
                attributes: { type: hnType },
                confidence: 85,
                source: "nmap",
              });

              for (const ip of ipAddresses) {
                relationships.push({
                  fromValue: name,
                  fromType: "subdomain",
                  toValue: ip,
                  toType: "ip",
                  type: "resolves_to",
                  confidence: 85,
                });
              }
            }
          }

          // Extract ports and services
          const ports = extractTag(host, "port");
          for (const port of ports) {
            const portId = getAttr(port, "portid");
            const protocol = getAttr(port, "protocol");
            const services = extractTag(port, "service");
            const serviceName = services.length > 0 ? getAttr(services[0], "name") : "";
            const product = services.length > 0 ? getAttr(services[0], "product") : "";
            const version = services.length > 0 ? getAttr(services[0], "version") : "";
            const stateElements = extractTag(port, "state");
            const state = stateElements.length > 0 ? getAttr(stateElements[0], "state") : "";

            for (const ip of ipAddresses) {
              entities.push({
                type: "port",
                category: "network",
                value: `${ip}:${portId}/${protocol}`,
                attributes: {
                  port: parseInt(portId, 10),
                  protocol,
                  state,
                  service: serviceName,
                  product,
                  version,
                },
                confidence: 90,
                source: "nmap",
              });

              relationships.push({
                fromValue: `${ip}:${portId}/${protocol}`,
                fromType: "port",
                toValue: ip,
                toType: "ip",
                type: "runs_on",
                confidence: 90,
              });
            }

            if (serviceName) {
              entities.push({
                type: "service",
                category: "network",
                value: `${serviceName}${product ? ` (${product}${version ? ` ${version}` : ""})` : ""}`,
                attributes: {
                  name: serviceName,
                  product,
                  version,
                },
                confidence: 85,
                source: "nmap",
              });
            }
          }
        } catch (err) {
          errors.push({ message: `Failed to parse host: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    } catch (err) {
      errors.push({ message: `Failed to parse nmap XML: ${err instanceof Error ? err.message : String(err)}` });
    }

    return {
      entities,
      relationships,
      stats: { total, parsed: entities.length, errors: errors.length },
      errors,
    };
  },
};
