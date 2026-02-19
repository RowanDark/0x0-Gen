import type { Parser } from "./base.js";
import type { ImportSourceType } from "@0x0-gen/contracts";
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

export type { Parser, ParseResult, ParseOptions, RawEntity, RawRelationship } from "./base.js";

const parsers: Parser[] = [
  spiderfootParser,
  amassParser,
  subfinderParser,
  ffufParser,
  nucleiParser,
  nmapParser,
  httpxParser,
  harvesterParser,
  shodanParser,
  zapParser,
  burpParser,
  waybackParser,
  // Generic parsers last (fallbacks)
  genericJsonParser,
  genericCsvParser,
  genericTxtParser,
];

const parserMap = new Map<ImportSourceType, Parser>();
for (const parser of parsers) {
  parserMap.set(parser.source, parser);
}

export function getParser(source: ImportSourceType): Parser | undefined {
  return parserMap.get(source);
}

export function detectParser(content: string, filename?: string): Parser | undefined {
  // Try specific parsers first (exclude generics)
  for (const parser of parsers) {
    if (parser.source.startsWith("custom_")) continue;
    if (parser.detect(content, filename)) return parser;
  }
  // Fall back to generic parsers
  for (const parser of parsers) {
    if (!parser.source.startsWith("custom_")) continue;
    if (parser.detect(content, filename)) return parser;
  }
  return undefined;
}

export function listParsers(): Array<{ name: string; source: ImportSourceType; formats: string[] }> {
  return parsers.map((p) => ({
    name: p.name,
    source: p.source,
    formats: p.supportedFormats,
  }));
}

export { parsers };
