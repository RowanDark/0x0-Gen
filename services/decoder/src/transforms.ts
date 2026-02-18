import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import type { TransformType, TransformDirection } from "./types.js";

export interface TransformFn {
  (input: string, options?: Record<string, unknown>): string;
}

type TransformMap = Record<
  TransformType,
  Partial<Record<TransformDirection, TransformFn>>
>;

// --- Base64 ---

function base64Encode(input: string, options?: Record<string, unknown>): string {
  const encoded = Buffer.from(input, "utf-8").toString("base64");
  if (options?.urlSafe) {
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return encoded;
}

function base64Decode(input: string): string {
  // Handle URL-safe base64 by normalizing
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

// --- URL encoding ---

function urlEncode(input: string, options?: Record<string, unknown>): string {
  if (options?.encodeAll) {
    return Array.from(Buffer.from(input, "utf-8"))
      .map((byte) => "%" + byte.toString(16).toUpperCase().padStart(2, "0"))
      .join("");
  }
  return encodeURIComponent(input);
}

function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

// --- HTML entities ---

const HTML_ENCODE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_DECODE_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
};

function htmlEncode(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ENCODE_MAP[ch] ?? ch);
}

function htmlDecode(input: string): string {
  // Handle named entities
  let result = input.replace(
    /&(?:amp|lt|gt|quot|apos|#39|#x27);/g,
    (entity) => HTML_DECODE_MAP[entity] ?? entity,
  );
  // Handle numeric decimal entities: &#65;
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code)),
  );
  // Handle numeric hex entities: &#x41;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return result;
}

// --- Hex ---

function hexEncode(input: string, options?: Record<string, unknown>): string {
  const bytes = Buffer.from(input, "utf-8");
  const uppercase = options?.uppercase === true;
  const separator =
    options?.separator !== undefined ? String(options.separator) : "";
  const hexChars = Array.from(bytes).map((b) => {
    const hex = b.toString(16).padStart(2, "0");
    return uppercase ? hex.toUpperCase() : hex;
  });
  return hexChars.join(separator);
}

function hexDecode(input: string): string {
  // Remove common separators (space, colon, dash, 0x prefix)
  const cleaned = input
    .replace(/0x/gi, "")
    .replace(/[:\s-]/g, "");
  if (cleaned.length % 2 !== 0) {
    throw new Error("Invalid hex string: odd number of characters");
  }
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error("Invalid hex string: contains non-hex characters");
  }
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.substring(i, i + 2), 16));
  }
  return Buffer.from(bytes).toString("utf-8");
}

// --- ASCII ---

function asciiEncode(input: string): string {
  return Array.from(Buffer.from(input, "utf-8"))
    .map((b) => b.toString(10))
    .join(" ");
}

function asciiDecode(input: string): string {
  const values = input
    .trim()
    .split(/\s+/)
    .map((v) => {
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > 255) {
        throw new Error(`Invalid ASCII value: ${v}`);
      }
      return n;
    });
  return Buffer.from(values).toString("utf-8");
}

// --- Unicode ---

function unicodeEncode(input: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.codePointAt(i)!;
    if (code > 0xffff) {
      // Surrogate pair - encode as \uXXXX\uXXXX
      const offset = code - 0x10000;
      const high = 0xd800 + (offset >> 10);
      const low = 0xdc00 + (offset & 0x3ff);
      result += `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
      i++; // Skip the second code unit
    } else {
      result += `\\u${code.toString(16).padStart(4, "0")}`;
    }
  }
  return result;
}

function unicodeDecode(input: string): string {
  // Handle \uXXXX sequences including surrogate pairs
  return input.replace(
    /\\u([0-9a-fA-F]{4})(?:\\u([0-9a-fA-F]{4}))?/g,
    (_, high, low) => {
      const highCode = parseInt(high, 16);
      if (low) {
        const lowCode = parseInt(low, 16);
        if (highCode >= 0xd800 && highCode <= 0xdbff && lowCode >= 0xdc00 && lowCode <= 0xdfff) {
          // Surrogate pair
          return String.fromCharCode(highCode, lowCode);
        }
        // Not a surrogate pair, decode separately
        return String.fromCharCode(highCode) + String.fromCharCode(lowCode);
      }
      return String.fromCharCode(highCode);
    },
  );
}

// --- Hash functions (encode only) ---

function hashTransform(algorithm: string): TransformFn {
  return (input: string) => {
    return createHash(algorithm).update(input).digest("hex");
  };
}

// --- Gzip ---

function gzipEncode(input: string): string {
  const compressed = gzipSync(Buffer.from(input, "utf-8"));
  return compressed.toString("base64");
}

function gzipDecode(input: string): string {
  const buffer = Buffer.from(input, "base64");
  const decompressed = gunzipSync(buffer);
  return decompressed.toString("utf-8");
}

// --- JWT (decode only) ---

function jwtDecode(input: string): string {
  const parts = input.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT: expected 3 dot-separated parts");
  }

  const decodeSegment = (segment: string): unknown => {
    // Add padding if needed
    const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json);
  };

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);

  return JSON.stringify({ header, payload }, null, 2);
}

// --- Transform registry ---

const transforms: TransformMap = {
  base64: { encode: base64Encode, decode: base64Decode },
  url: { encode: urlEncode, decode: urlDecode },
  html: { encode: htmlEncode, decode: htmlDecode },
  hex: { encode: hexEncode, decode: hexDecode },
  ascii: { encode: asciiEncode, decode: asciiDecode },
  unicode: { encode: unicodeEncode, decode: unicodeDecode },
  md5: { encode: hashTransform("md5") },
  sha1: { encode: hashTransform("sha1") },
  sha256: { encode: hashTransform("sha256") },
  gzip: { encode: gzipEncode, decode: gzipDecode },
  jwt: { decode: jwtDecode },
};

export function getTransform(
  type: TransformType,
  direction: TransformDirection,
): TransformFn | null {
  return transforms[type]?.[direction] ?? null;
}

export interface TransformTypeInfo {
  type: TransformType;
  name: string;
  category: string;
  directions: TransformDirection[];
  description: string;
}

export function getTransformTypes(): TransformTypeInfo[] {
  return [
    {
      type: "base64",
      name: "Base64",
      category: "Encoding",
      directions: ["encode", "decode"],
      description: "Base64 encode/decode with URL-safe variant support",
    },
    {
      type: "url",
      name: "URL",
      category: "Encoding",
      directions: ["encode", "decode"],
      description: "URL percent-encoding (encodeURIComponent)",
    },
    {
      type: "html",
      name: "HTML",
      category: "Encoding",
      directions: ["encode", "decode"],
      description: "HTML entity encoding (< > & \" ')",
    },
    {
      type: "hex",
      name: "Hex",
      category: "Encoding",
      directions: ["encode", "decode"],
      description: "Hexadecimal byte encoding with separator options",
    },
    {
      type: "ascii",
      name: "ASCII",
      category: "Text",
      directions: ["encode", "decode"],
      description: "Convert between text and decimal ASCII values",
    },
    {
      type: "unicode",
      name: "Unicode",
      category: "Text",
      directions: ["encode", "decode"],
      description: "Unicode \\uXXXX escape sequences with surrogate pair support",
    },
    {
      type: "md5",
      name: "MD5",
      category: "Hash",
      directions: ["encode"],
      description: "MD5 hash (one-way, encode only)",
    },
    {
      type: "sha1",
      name: "SHA1",
      category: "Hash",
      directions: ["encode"],
      description: "SHA-1 hash (one-way, encode only)",
    },
    {
      type: "sha256",
      name: "SHA256",
      category: "Hash",
      directions: ["encode"],
      description: "SHA-256 hash (one-way, encode only)",
    },
    {
      type: "gzip",
      name: "Gzip",
      category: "Compression",
      directions: ["encode", "decode"],
      description: "Gzip compress (to base64) / decompress (from base64)",
    },
    {
      type: "jwt",
      name: "JWT",
      category: "Formats",
      directions: ["decode"],
      description: "Decode JWT header and payload (does not verify signature)",
    },
  ];
}
