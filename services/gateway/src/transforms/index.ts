import type { Transform } from "./base.js";
import { whoisTransform } from "./whois.js";

export type { Transform, TransformInput, TransformResult } from "./base.js";

const transforms: Transform[] = [whoisTransform];

export function getTransformById(id: string): Transform | undefined {
  return transforms.find((t) => t.id === id);
}

export function listTransforms(): Transform[] {
  return transforms;
}

export { whoisTransform };
