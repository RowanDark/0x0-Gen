import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import tls from "node:tls";
import { generateHostCert, clearCertCache, getCertCacheSize } from "./certs.js";
import { resetCACache } from "./ca.js";

describe("Dynamic host certificate generation", () => {
  let tmpDir: string;
  const originalDataDir = process.env.DATA_DIR;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-cert-test-"));
    process.env.DATA_DIR = tmpDir;
    resetCACache();
    clearCertCache();
  });

  afterEach(() => {
    if (originalDataDir) {
      process.env.DATA_DIR = originalDataDir;
    } else {
      delete process.env.DATA_DIR;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("generates a SecureContext for a hostname", () => {
    const ctx = generateHostCert("example.com");
    expect(ctx).toBeDefined();
    expect(ctx).toBeInstanceOf(Object);
  });

  it("caches generated certificates", () => {
    expect(getCertCacheSize()).toBe(0);
    generateHostCert("example.com");
    expect(getCertCacheSize()).toBe(1);
    generateHostCert("example.com");
    expect(getCertCacheSize()).toBe(1); // still 1, cached
  });

  it("generates different contexts for different hosts", () => {
    generateHostCert("a.example.com");
    generateHostCert("b.example.com");
    expect(getCertCacheSize()).toBe(2);
  });

  it("clearCertCache resets the cache", () => {
    generateHostCert("example.com");
    expect(getCertCacheSize()).toBe(1);
    clearCertCache();
    expect(getCertCacheSize()).toBe(0);
  });
});
