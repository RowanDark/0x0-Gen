import type { Transform } from "./base.js";
import type { MapperTransform } from "@0x0-gen/contracts";
import { relatedEntitiesTransform } from "./related-entities.js";
import { dnsLookupTransform } from "./dns-lookup.js";
import { reverseDnsTransform } from "./reverse-dns.js";
import { subdomainEnumTransform } from "./subdomain-enum.js";
import { urlExtractTransform } from "./url-extract.js";
import { techDetectTransform } from "./tech-detect.js";
import { portLookupTransform } from "./port-lookup.js";
import { whoisTransform } from "./whois.js";
import { certSearchTransform } from "./cert-search.js";

const transforms: Transform[] = [
  relatedEntitiesTransform,
  dnsLookupTransform,
  reverseDnsTransform,
  subdomainEnumTransform,
  urlExtractTransform,
  techDetectTransform,
  portLookupTransform,
  whoisTransform,
  certSearchTransform,
];

const transformMap = new Map<string, Transform>();
for (const t of transforms) {
  transformMap.set(t.id, t);
}

export function listTransforms(): MapperTransform[] {
  return transforms.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    inputTypes: t.inputTypes,
    outputTypes: t.outputTypes,
    requiresApi: t.requiresApi,
  }));
}

export function getTransform(id: string): Transform | undefined {
  return transformMap.get(id);
}

export type { Transform, TransformResult } from "./base.js";
