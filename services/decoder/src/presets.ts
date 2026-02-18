import { randomUUID } from "node:crypto";
import type { DecoderPreset } from "./types.js";

function makeBuiltinPreset(
  name: string,
  steps: DecoderPreset["steps"],
): DecoderPreset {
  return {
    id: randomUUID(),
    name,
    steps,
    createdAt: 0,
    updatedAt: 0,
  };
}

export const builtinPresets: DecoderPreset[] = [
  makeBuiltinPreset("URL Decode", [{ type: "url", direction: "decode" }]),
  makeBuiltinPreset("Base64 Decode", [{ type: "base64", direction: "decode" }]),
  makeBuiltinPreset("Double URL Decode", [
    { type: "url", direction: "decode" },
    { type: "url", direction: "decode" },
  ]),
  makeBuiltinPreset("Base64 + URL Decode", [
    { type: "base64", direction: "decode" },
    { type: "url", direction: "decode" },
  ]),
  makeBuiltinPreset("Hash MD5", [{ type: "md5", direction: "encode" }]),
  makeBuiltinPreset("JWT Decode", [{ type: "jwt", direction: "decode" }]),
];
