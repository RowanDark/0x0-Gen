import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generateCA, loadCA, getOrCreateCA, getCAStatus, resetCACache } from "./ca.js";

describe("CA certificate generation", () => {
  let tmpDir: string;
  const originalDataDir = process.env.DATA_DIR;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-ca-test-"));
    process.env.DATA_DIR = tmpDir;
    resetCACache();
  });

  afterEach(() => {
    if (originalDataDir) {
      process.env.DATA_DIR = originalDataDir;
    } else {
      delete process.env.DATA_DIR;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("generates a CA certificate with PEM format", () => {
    const ca = generateCA();
    expect(ca.cert).toContain("-----BEGIN CERTIFICATE-----");
    expect(ca.cert).toContain("-----END CERTIFICATE-----");
    expect(ca.key).toContain("-----BEGIN EC PRIVATE KEY-----");
    expect(ca.key).toContain("-----END EC PRIVATE KEY-----");
    expect(ca.fingerprint).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2})+$/);
  });

  it("writes cert and key files to disk", () => {
    generateCA();
    const certPath = path.join(tmpDir, "ca", "ca-cert.pem");
    const keyPath = path.join(tmpDir, "ca", "ca-key.pem");
    expect(fs.existsSync(certPath)).toBe(true);
    expect(fs.existsSync(keyPath)).toBe(true);
  });

  it("loads CA from disk after generation", () => {
    const original = generateCA();
    resetCACache();
    const loaded = loadCA();
    expect(loaded).not.toBeNull();
    expect(loaded!.cert).toBe(original.cert);
    expect(loaded!.key).toBe(original.key);
    expect(loaded!.fingerprint).toBe(original.fingerprint);
  });

  it("returns null when no CA exists", () => {
    const result = loadCA();
    expect(result).toBeNull();
  });

  it("getOrCreateCA creates CA if none exists", () => {
    const ca = getOrCreateCA();
    expect(ca.cert).toContain("-----BEGIN CERTIFICATE-----");
  });

  it("getOrCreateCA reuses existing CA", () => {
    const first = getOrCreateCA();
    const second = getOrCreateCA();
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it("getCAStatus returns generated=false when no CA", () => {
    const status = getCAStatus();
    expect(status.generated).toBe(false);
    expect(status.fingerprint).toBe("");
  });

  it("getCAStatus returns generated=true after generation", () => {
    generateCA();
    resetCACache();
    const status = getCAStatus();
    expect(status.generated).toBe(true);
    expect(status.fingerprint.length).toBeGreaterThan(0);
  });
});
