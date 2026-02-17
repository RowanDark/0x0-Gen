import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("proxy:ca");

interface CACertificate {
  cert: string;
  key: string;
  fingerprint: string;
}

let cachedCA: CACertificate | null = null;

function getCADir(): string {
  const dataDir = process.env.DATA_DIR ?? process.cwd();
  const caDir = path.join(dataDir, "ca");
  fs.mkdirSync(caDir, { recursive: true });
  return caDir;
}

function getCertPath(): string {
  return path.join(getCADir(), "ca-cert.pem");
}

function getKeyPath(): string {
  return path.join(getCADir(), "ca-key.pem");
}

export function generateCA(): CACertificate {
  logger.info("Generating new CA certificate");

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const certPem = generateSelfSignedCert(privateKey, publicKey);
  const keyPem = privateKey
    .export({ type: "sec1", format: "pem" })
    .toString();

  // Write files
  const certPath = getCertPath();
  const keyPath = getKeyPath();

  fs.writeFileSync(certPath, certPem, { mode: 0o644 });
  fs.writeFileSync(keyPath, keyPem, { mode: 0o600 });

  const fingerprint = crypto
    .createHash("sha256")
    .update(certPem)
    .digest("hex")
    .replace(/(.{2})(?!$)/g, "$1:");

  cachedCA = { cert: certPem, key: keyPem, fingerprint };

  logger.info(`CA certificate generated, fingerprint: ${fingerprint.substring(0, 20)}...`);
  return cachedCA;
}

export function loadCA(): CACertificate | null {
  if (cachedCA) return cachedCA;

  const certPath = getCertPath();
  const keyPath = getKeyPath();

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    return null;
  }

  try {
    const cert = fs.readFileSync(certPath, "utf-8");
    const key = fs.readFileSync(keyPath, "utf-8");
    const fingerprint = crypto
      .createHash("sha256")
      .update(cert)
      .digest("hex")
      .replace(/(.{2})(?!$)/g, "$1:");

    cachedCA = { cert, key, fingerprint };
    logger.info("CA certificate loaded from disk");
    return cachedCA;
  } catch (err) {
    logger.error("Failed to load CA certificate", { error: (err as Error).message });
    return null;
  }
}

export function getOrCreateCA(): CACertificate {
  const existing = loadCA();
  if (existing) return existing;
  return generateCA();
}

export function getCAStatus(): { generated: boolean; fingerprint: string } {
  const ca = loadCA();
  return {
    generated: ca !== null,
    fingerprint: ca?.fingerprint ?? "",
  };
}

export function resetCACache(): void {
  cachedCA = null;
}

/**
 * Generate a self-signed X.509 certificate using Node's built-in crypto.
 * Uses the ASN.1 DER encoding manually to avoid external dependencies.
 */
function generateSelfSignedCert(
  privateKey: crypto.KeyObject,
  publicKey: crypto.KeyObject,
): string {
  // Build the TBS (To Be Signed) certificate structure
  const serial = crypto.randomBytes(16);
  serial[0] &= 0x7f; // Ensure positive

  const now = new Date();
  const notBefore = formatASN1Time(now);
  const notAfter = formatASN1Time(
    new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
  );

  // Subject/Issuer: CN=0x0-Gen Proxy CA
  const cn = "0x0-Gen Proxy CA";
  const cnBytes = Buffer.from(cn, "utf-8");
  const cnSet = asn1Set([
    asn1Sequence([
      asn1OID([2, 5, 4, 3]), // id-at-commonName
      asn1UTF8String(cnBytes),
    ]),
  ]);
  const name = asn1Sequence([cnSet]);

  // Public key info
  const spkiDer = publicKey.export({ type: "spki", format: "der" });

  // Extensions: Basic Constraints (CA:TRUE), Key Usage (keyCertSign, cRLSign)
  const basicConstraints = asn1Sequence([
    asn1OID([2, 5, 29, 19]), // id-ce-basicConstraints
    asn1Boolean(true), // critical
    asn1OctetString(asn1Sequence([asn1Boolean(true)])), // cA: TRUE
  ]);

  const keyUsageBits = Buffer.from([0x06, 0x01, 0x06]); // keyCertSign + cRLSign
  const keyUsage = asn1Sequence([
    asn1OID([2, 5, 29, 15]), // id-ce-keyUsage
    asn1Boolean(true), // critical
    asn1OctetString(Buffer.from([0x03, ...keyUsageBits])),
  ]);

  const extensions = asn1Explicit(3, asn1Sequence([basicConstraints, keyUsage]));

  // TBS Certificate
  const tbs = asn1Sequence([
    asn1Explicit(0, asn1Integer(Buffer.from([2]))), // version v3
    asn1Integer(serial),
    asn1Sequence([asn1OID([1, 2, 840, 10045, 4, 3, 2])]), // ecdsa-with-SHA256
    name, // issuer
    asn1Sequence([asn1UTCTime(notBefore), asn1UTCTime(notAfter)]), // validity
    name, // subject
    spkiDer, // subjectPublicKeyInfo (already DER)
    extensions,
  ]);

  // Sign
  const signer = crypto.createSign("SHA256");
  signer.update(tbs);
  const signature = signer.sign(privateKey);

  // Wrap signature as BIT STRING
  const sigBitString = Buffer.alloc(signature.length + 1);
  sigBitString[0] = 0x00; // no unused bits
  signature.copy(sigBitString, 1);

  // Full certificate
  const cert = asn1Sequence([
    tbs,
    asn1Sequence([asn1OID([1, 2, 840, 10045, 4, 3, 2])]), // signatureAlgorithm
    asn1BitString(sigBitString),
  ]);

  return `-----BEGIN CERTIFICATE-----\n${cert.toString("base64").replace(/(.{64})/g, "$1\n").trim()}\n-----END CERTIFICATE-----\n`;
}

// ASN.1 helpers
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
  // Ensure positive by prepending 0x00 if high bit set
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

function asn1Boolean(value: boolean): Buffer {
  return asn1Tag(0x01, Buffer.from([value ? 0xff : 0x00]));
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
