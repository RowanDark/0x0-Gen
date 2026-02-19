import { describe, it, expect } from "vitest";
import { spiderfootParser } from "./spiderfoot.js";
import { amassParser } from "./amass.js";
import { subfinderParser } from "./subfinder.js";
import { ffufParser } from "./ffuf.js";
import { nucleiParser } from "./nuclei.js";
import { nmapParser } from "./nmap.js";
import { httpxParser } from "./httpx.js";
import { harvesterParser } from "./harvester.js";
import { shodanParser } from "./shodan.js";
import { zapParser } from "./zap.js";
import { burpParser } from "./burp.js";
import { waybackParser } from "./wayback.js";
import { genericJsonParser } from "./generic-json.js";
import { genericCsvParser } from "./generic-csv.js";
import { genericTxtParser } from "./generic-txt.js";
import { detectParser } from "./index.js";

describe("SpiderFoot parser", () => {
  const sampleData = JSON.stringify([
    { type: "INTERNET_NAME", data: "api.example.com", module: "sfp_dns" },
    { type: "IP_ADDRESS", data: "1.2.3.4", module: "sfp_dns" },
    { type: "EMAILADDR", data: "admin@example.com", module: "sfp_email" },
  ]);

  it("detects SpiderFoot JSON", () => {
    expect(spiderfootParser.detect(sampleData)).toBe(true);
  });

  it("detects by filename", () => {
    expect(spiderfootParser.detect("{}", "spiderfoot-export.json")).toBe(true);
  });

  it("parses entities correctly", () => {
    const result = spiderfootParser.parse(sampleData);
    expect(result.entities).toHaveLength(3);
    expect(result.entities[0].type).toBe("subdomain");
    expect(result.entities[0].value).toBe("api.example.com");
    expect(result.entities[1].type).toBe("ip");
    expect(result.entities[2].type).toBe("email");
    expect(result.stats.total).toBe(3);
    expect(result.stats.parsed).toBe(3);
  });
});

describe("Amass parser", () => {
  const sampleData = [
    '{"name":"sub.example.com","domain":"example.com","addresses":[{"ip":"10.0.0.1","cidr":"10.0.0.0/24"}],"tag":"dns","sources":["DNS"]}',
    '{"name":"api.example.com","domain":"example.com","addresses":[{"ip":"10.0.0.2"}],"tag":"cert","sources":["Cert"]}',
  ].join("\n");

  it("detects Amass JSON lines", () => {
    expect(amassParser.detect(sampleData)).toBe(true);
  });

  it("parses subdomains and IPs", () => {
    const result = amassParser.parse(sampleData);
    // Each line creates subdomain + IP entities
    expect(result.entities.length).toBeGreaterThanOrEqual(4);
    const subdomains = result.entities.filter((e) => e.type === "subdomain");
    const ips = result.entities.filter((e) => e.type === "ip");
    expect(subdomains).toHaveLength(2);
    expect(ips).toHaveLength(2);
  });

  it("creates resolves_to relationships", () => {
    const result = amassParser.parse(sampleData);
    const resolvesTo = result.relationships.filter((r) => r.type === "resolves_to");
    expect(resolvesTo).toHaveLength(2);
  });

  it("creates belongs_to relationships", () => {
    const result = amassParser.parse(sampleData);
    const belongsTo = result.relationships.filter((r) => r.type === "belongs_to");
    expect(belongsTo).toHaveLength(2);
  });
});

describe("Subfinder parser", () => {
  it("parses text format (one per line)", () => {
    const content = "sub1.example.com\nsub2.example.com\nsub3.example.com";
    const result = subfinderParser.parse(content);
    expect(result.entities).toHaveLength(3);
    expect(result.entities[0].type).toBe("subdomain");
    expect(result.entities[0].value).toBe("sub1.example.com");
  });

  it("parses JSON format", () => {
    const content = JSON.stringify([
      { host: "a.example.com", source: "crtsh" },
      { host: "b.example.com", source: "dnsdumpster" },
    ]);
    const result = subfinderParser.parse(content);
    expect(result.entities).toHaveLength(2);
  });
});

describe("ffuf parser", () => {
  const sampleData = JSON.stringify({
    commandline: "ffuf -u http://example.com/FUZZ -w wordlist.txt",
    results: [
      { url: "http://example.com/admin", status: 200, length: 1234, words: 50, lines: 20 },
      { url: "http://example.com/api", status: 301, length: 0, words: 0, lines: 0 },
    ],
  });

  it("detects ffuf JSON", () => {
    expect(ffufParser.detect(sampleData)).toBe(true);
  });

  it("parses URLs with attributes", () => {
    const result = ffufParser.parse(sampleData);
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].type).toBe("url");
    expect(result.entities[0].value).toBe("http://example.com/admin");
    expect(result.entities[0].attributes.status).toBe(200);
    expect(result.entities[0].attributes.length).toBe(1234);
  });
});

describe("Nuclei parser", () => {
  const sampleData = [
    '{"template-id":"cve-2021-1234","info":{"name":"Test Vuln","severity":"high"},"host":"https://example.com","matched-at":"https://example.com/login"}',
    '{"template-id":"tech-detect","info":{"name":"Nginx Detected","severity":"info"},"host":"https://example.com","matched-at":"https://example.com"}',
  ].join("\n");

  it("detects nuclei JSON lines", () => {
    expect(nucleiParser.detect(sampleData)).toBe(true);
  });

  it("parses vulnerabilities", () => {
    const result = nucleiParser.parse(sampleData);
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].type).toBe("vulnerability");
    expect(result.entities[0].attributes.severity).toBe("high");
    expect(result.entities[0].confidence).toBe(85); // high severity
    expect(result.entities[1].confidence).toBe(60); // info severity
  });

  it("creates found_at relationships", () => {
    const result = nucleiParser.parse(sampleData);
    expect(result.relationships.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Nmap parser", () => {
  const sampleXml = `<?xml version="1.0"?>
<nmaprun>
  <host>
    <address addr="192.168.1.1" addrtype="ipv4"/>
    <hostnames>
      <hostname name="server.example.com" type="PTR"/>
    </hostnames>
    <ports>
      <port protocol="tcp" portid="80">
        <state state="open"/>
        <service name="http" product="nginx" version="1.18"/>
      </port>
      <port protocol="tcp" portid="443">
        <state state="open"/>
        <service name="https" product="nginx" version="1.18"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

  it("detects nmap XML", () => {
    expect(nmapParser.detect(sampleXml)).toBe(true);
  });

  it("parses hosts, ports, and services", () => {
    const result = nmapParser.parse(sampleXml);
    const ips = result.entities.filter((e) => e.type === "ip");
    const ports = result.entities.filter((e) => e.type === "port");
    const subdomains = result.entities.filter((e) => e.type === "subdomain");

    expect(ips).toHaveLength(1);
    expect(ips[0].value).toBe("192.168.1.1");
    expect(ports).toHaveLength(2);
    expect(subdomains).toHaveLength(1);
    expect(subdomains[0].value).toBe("server.example.com");
  });

  it("creates relationships", () => {
    const result = nmapParser.parse(sampleXml);
    expect(result.relationships.length).toBeGreaterThan(0);
    const runsOn = result.relationships.filter((r) => r.type === "runs_on");
    expect(runsOn.length).toBeGreaterThanOrEqual(2);
  });
});

describe("httpx parser", () => {
  const sampleData = [
    '{"url":"https://example.com","status_code":200,"title":"Example","webserver":"nginx","tech":["jQuery","Bootstrap"]}',
    '{"url":"https://api.example.com","status_code":200,"title":"API","webserver":"Apache"}',
  ].join("\n");

  it("detects httpx JSON lines", () => {
    expect(httpxParser.detect(sampleData)).toBe(true);
  });

  it("parses URLs and technologies", () => {
    const result = httpxParser.parse(sampleData);
    const urls = result.entities.filter((e) => e.type === "url");
    const techs = result.entities.filter((e) => e.type === "technology");

    expect(urls).toHaveLength(2);
    expect(techs).toHaveLength(2); // jQuery and Bootstrap from first entry
  });

  it("creates runs_on relationships for technologies", () => {
    const result = httpxParser.parse(sampleData);
    const runsOn = result.relationships.filter((r) => r.type === "runs_on");
    expect(runsOn).toHaveLength(2);
  });
});

describe("theHarvester parser", () => {
  const sampleData = JSON.stringify({
    emails: ["admin@example.com", "info@example.com"],
    hosts: ["www.example.com", "api.example.com"],
    ips: ["1.2.3.4"],
    interesting_urls: ["https://example.com/sitemap.xml"],
  });

  it("detects theHarvester JSON", () => {
    expect(harvesterParser.detect(sampleData)).toBe(true);
  });

  it("parses all entity types", () => {
    const result = harvesterParser.parse(sampleData);
    const emails = result.entities.filter((e) => e.type === "email");
    const subdomains = result.entities.filter((e) => e.type === "subdomain");
    const ips = result.entities.filter((e) => e.type === "ip");
    const urls = result.entities.filter((e) => e.type === "url");

    expect(emails).toHaveLength(2);
    expect(subdomains).toHaveLength(2);
    expect(ips).toHaveLength(1);
    expect(urls).toHaveLength(1);
  });
});

describe("Shodan parser", () => {
  const sampleData = [
    '{"ip_str":"1.2.3.4","port":80,"org":"Example Corp","transport":"tcp","data":"HTTP/1.1","vulns":{"CVE-2021-1234":{"cvss":7.5}}}',
  ].join("\n");

  it("detects Shodan JSON", () => {
    expect(shodanParser.detect(sampleData)).toBe(true);
  });

  it("parses IPs, ports, and vulnerabilities", () => {
    const result = shodanParser.parse(sampleData);
    const ips = result.entities.filter((e) => e.type === "ip");
    const ports = result.entities.filter((e) => e.type === "port");
    const vulns = result.entities.filter((e) => e.type === "vulnerability");

    expect(ips).toHaveLength(1);
    expect(ports).toHaveLength(1);
    expect(vulns).toHaveLength(1);
    expect(vulns[0].value).toBe("CVE-2021-1234");
  });
});

describe("ZAP parser", () => {
  const sampleData = JSON.stringify({
    alerts: [
      {
        alert: "SQL Injection",
        riskdesc: "High",
        confidence: "Medium",
        url: "https://example.com/search?q=test",
        evidence: "error in your SQL syntax",
      },
    ],
  });

  it("detects ZAP JSON", () => {
    expect(zapParser.detect(sampleData)).toBe(true);
  });

  it("parses vulnerabilities", () => {
    const result = zapParser.parse(sampleData);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("vulnerability");
    expect(result.entities[0].value).toBe("SQL Injection");
  });
});

describe("Burp parser", () => {
  const sampleXml = `<issues burpVersion="2.0">
    <issue>
      <name>Cross-site scripting (reflected)</name>
      <severity>High</severity>
      <confidence>Certain</confidence>
      <host>https://example.com</host>
      <path>/search</path>
      <type>2097792</type>
      <issueDetail>The input was reflected in the response.</issueDetail>
    </issue>
  </issues>`;

  it("detects Burp XML", () => {
    expect(burpParser.detect(sampleXml)).toBe(true);
  });

  it("parses vulnerabilities and URLs", () => {
    const result = burpParser.parse(sampleXml);
    const vulns = result.entities.filter((e) => e.type === "vulnerability");
    const urls = result.entities.filter((e) => e.type === "url");

    expect(vulns).toHaveLength(1);
    expect(vulns[0].value).toBe("Cross-site scripting (reflected)");
    expect(vulns[0].confidence).toBe(95); // Certain confidence
    expect(urls).toHaveLength(1);
    expect(urls[0].value).toBe("https://example.com/search");
  });
});

describe("Wayback parser", () => {
  const sampleData = [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/api/v1/users",
  ].join("\n");

  it("detects waybackurls output", () => {
    expect(waybackParser.detect(sampleData)).toBe(true);
  });

  it("parses URLs", () => {
    const result = waybackParser.parse(sampleData);
    expect(result.entities).toHaveLength(3);
    expect(result.entities[0].type).toBe("url");
    expect(result.entities[0].value).toBe("https://example.com/page1");
  });
});

describe("Generic JSON parser", () => {
  it("parses JSON arrays", () => {
    const content = JSON.stringify([
      { value: "example.com", type: "domain", category: "infrastructure" },
      { value: "1.2.3.4", type: "ip", category: "infrastructure" },
    ]);
    const result = genericJsonParser.parse(content);
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].value).toBe("example.com");
    expect(result.entities[0].type).toBe("domain");
  });

  it("uses field mapping options", () => {
    const content = JSON.stringify([{ hostname: "test.example.com" }]);
    const result = genericJsonParser.parse(content, {
      fieldMapping: { value: "hostname" },
      defaultType: "subdomain",
    });
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].value).toBe("test.example.com");
  });
});

describe("Generic CSV parser", () => {
  it("parses CSV with headers", () => {
    const content = "value,type,category\nexample.com,domain,infrastructure\n1.2.3.4,ip,infrastructure";
    const result = genericCsvParser.parse(content);
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].value).toBe("example.com");
    expect(result.entities[0].type).toBe("domain");
  });

  it("handles quoted fields", () => {
    const content = 'value,description\n"example.com","A test, domain"\n"1.2.3.4","An IP"';
    const result = genericCsvParser.parse(content, { defaultType: "domain" });
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].value).toBe("example.com");
  });
});

describe("Generic TXT parser", () => {
  it("auto-detects line types", () => {
    const content = "example.com\n1.2.3.4\nhttps://example.com/path\nuser@example.com";
    const result = genericTxtParser.parse(content);
    expect(result.entities).toHaveLength(4);
    expect(result.entities[0].type).toBe("subdomain");
    expect(result.entities[1].type).toBe("ip");
    expect(result.entities[2].type).toBe("url");
    expect(result.entities[3].type).toBe("email");
  });

  it("skips comments and empty lines", () => {
    const content = "# comment\nexample.com\n\n# another comment\n1.2.3.4";
    const result = genericTxtParser.parse(content);
    expect(result.entities).toHaveLength(2);
  });
});

describe("Format auto-detection", () => {
  it("detects Amass format", () => {
    const content = '{"name":"sub.example.com","domain":"example.com","addresses":[{"ip":"1.2.3.4"}],"tag":"dns","sources":["DNS"]}';
    const parser = detectParser(content);
    expect(parser?.source).toBe("amass");
  });

  it("detects nmap XML", () => {
    const content = '<?xml version="1.0"?><nmaprun><host></host></nmaprun>';
    const parser = detectParser(content);
    expect(parser?.source).toBe("nmap");
  });

  it("detects ffuf format", () => {
    const content = JSON.stringify({ commandline: "ffuf", results: [] });
    const parser = detectParser(content);
    expect(parser?.source).toBe("ffuf");
  });

  it("falls back to generic JSON for unknown JSON", () => {
    const content = JSON.stringify([{ something: "unknown" }]);
    const parser = detectParser(content);
    expect(parser?.source).toBe("custom_json");
  });
});
