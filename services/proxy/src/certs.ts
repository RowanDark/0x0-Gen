import crypto from "node:crypto";
import tls from "node:tls";
import { createLogger } from "@0x0-gen/logger";
import { getOrCreateCA } from "./ca.js";

const logger = createLogger("proxy:certs");

// LRU cache for generated certificates
const certCache = new Map<string, { ctx: tls.SecureContext; createdAt: number }>();
const MAX_CACHE_SIZE = 1000;

function evictOldest(): void {
  if (certCache.size <= MAX_CACHE_SIZE) return;
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, value] of certCache) {
    if (value.createdAt < oldestTime) {
      oldestTime = value.createdAt;
      oldestKey = key;
    }
  }
  if (oldestKey) certCache.delete(oldestKey);
}

export function generateHostCert(hostname: string): tls.SecureContext {
  const cached = certCache.get(hostname);
  if (cached) return cached.ctx;

  const ca = getOrCreateCA();

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const certPem = generateSignedCert(hostname, privateKey, publicKey, ca.cert, ca.key);
  const keyPem = privateKey.export({ type: "sec1", format: "pem" }).toString();

  const ctx = tls.createSecureContext({
    cert: certPem + ca.cert,
    key: keyPem,
  });

  evictOldest();
  certCache.set(hostname, { ctx, createdAt: Date.now() });

  logger.debug(`Generated certificate for ${hostname}`);
  return ctx;
}

export function clearCertCache(): void {
  certCache.clear();
}

export function getCertCacheSize(): number {
  return certCache.size;
}

function generateSignedCert(
  hostname: string,
  privateKey: crypto.KeyObject,
  publicKey: crypto.KeyObject,
  caCertPem: string,
  caKeyPem: string,
): string {
  const caKey = crypto.createPrivateKey(caKeyPem);

  const serial = crypto.randomBytes(16);
  serial[0] &= 0x7f;

  const now = new Date();
  const notBefore = formatASN1Time(now);
  const notAfter = formatASN1Time(
    new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
  );

  // Subject: CN=hostname
  const cnBytes = Buffer.from(hostname, "utf-8");
  const cnSet = asn1Set([
    asn1Sequence([asn1OID([2, 5, 4, 3]), asn1UTF8String(cnBytes)]),
  ]);
  const subject = asn1Sequence([cnSet]);

  // Issuer: CN=0x0-Gen Proxy CA (from CA cert)
  const issuerCN = Buffer.from("0x0-Gen Proxy CA", "utf-8");
  const issuerSet = asn1Set([
    asn1Sequence([asn1OID([2, 5, 4, 3]), asn1UTF8String(issuerCN)]),
  ]);
  const issuer = asn1Sequence([issuerSet]);

  const spkiDer = publicKey.export({ type: "spki", format: "der" });

  // SAN extension
  const sanDnsName = Buffer.concat([
    Buffer.from([0x82]), // dNSName context tag
    asn1Length(hostname.length),
    Buffer.from(hostname, "ascii"),
  ]);
  const sanExtension = asn1Sequence([
    asn1OID([2, 5, 29, 17]), // id-ce-subjectAltName
    asn1OctetString(asn1Sequence([sanDnsName])),
  ]);

  const extensions = asn1Explicit(3, asn1Sequence([sanExtension]));

  const tbs = asn1Sequence([
    asn1Explicit(0, asn1Integer(Buffer.from([2]))), // v3
    asn1Integer(serial),
    asn1Sequence([asn1OID([1, 2, 840, 10045, 4, 3, 2])]), // ecdsa-with-SHA256
    issuer,
    asn1Sequence([asn1UTCTime(notBefore), asn1UTCTime(notAfter)]),
    subject,
    spkiDer,
    extensions,
  ]);

  const signer = crypto.createSign("SHA256");
  signer.update(tbs);
  const signature = signer.sign(caKey);

  const sigBitString = Buffer.alloc(signature.length + 1);
  sigBitString[0] = 0x00;
  signature.copy(sigBitString, 1);

  const cert = asn1Sequence([
    tbs,
    asn1Sequence([asn1OID([1, 2, 840, 10045, 4, 3, 2])]),
    asn1BitString(sigBitString),
  ]);

  return `-----BEGIN CERTIFICATE-----\n${cert.toString("base64").replace(/(.{64})/g, "$1\n").trim()}\n-----END CERTIFICATE-----\n`;
}

// ASN.1 helpers (duplicated to keep module self-contained)
function asn1Length(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  if (len < 0x100) return Buffer.from([0x81, len]);
  return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function asn1Tag(tag: number, content: Buffer): Buffer {
  const len = asn1Length(content.length);
  return Buffer.concat([Buffer.from([tag]), len, content]);
}

function asn1Sequence(items: Buffer[]): Buffer {
  return asn1Tag(0x30, Buffer.concat(items));
}

function asn1Set(items: Buffer[]): Buffer {
  return asn1Tag(0x31, Buffer.concat(items));
}

function asn1Integer(value: Buffer): Buffer {
  if (value[0] & 0x80) {
    value = Buffer.concat([Buffer.from([0x00]), value]);
  }
  return asn1Tag(0x02, value);
}

function asn1BitString(content: Buffer): Buffer {
  return asn1Tag(0x03, content);
}

function asn1OctetString(content: Buffer): Buffer {
  return asn1Tag(0x04, content);
}

function asn1UTF8String(content: Buffer): Buffer {
  return asn1Tag(0x0c, content);
}

function asn1OID(values: number[]): Buffer {
  const bytes: number[] = [40 * values[0] + values[1]];
  for (let i = 2; i < values.length; i++) {
    let v = values[i];
    if (v < 128) {
      bytes.push(v);
    } else {
      const tmp: number[] = [];
      while (v > 0) {
        tmp.unshift(v & 0x7f);
        v >>= 7;
      }
      for (let j = 0; j < tmp.length - 1; j++) tmp[j] |= 0x80;
      bytes.push(...tmp);
    }
  }
  return asn1Tag(0x06, Buffer.from(bytes));
}

function asn1UTCTime(value: string): Buffer {
  return asn1Tag(0x17, Buffer.from(value, "ascii"));
}

function asn1Explicit(tagNum: number, content: Buffer): Buffer {
  return asn1Tag(0xa0 | tagNum, content);
}

function formatASN1Time(date: Date): string {
  const y = date.getUTCFullYear() % 100;
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${String(y).padStart(2, "0")}${m}${d}${h}${min}${s}Z`;
}
