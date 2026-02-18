import { describe, it, expect } from "vitest";
import { getTransform, getTransformTypes } from "./transforms.js";

describe("transforms", () => {
  describe("base64", () => {
    it("encodes string to base64", () => {
      const fn = getTransform("base64", "encode")!;
      expect(fn("Hello")).toBe("SGVsbG8=");
    });

    it("decodes base64 to string", () => {
      const fn = getTransform("base64", "decode")!;
      expect(fn("SGVsbG8=")).toBe("Hello");
    });

    it("handles empty string", () => {
      const encode = getTransform("base64", "encode")!;
      const decode = getTransform("base64", "decode")!;
      expect(encode("")).toBe("");
      expect(decode("")).toBe("");
    });

    it("handles URL-safe base64 encode", () => {
      const fn = getTransform("base64", "encode")!;
      // Input that produces + and / in base64
      const result = fn("subjects?_d", { urlSafe: true });
      expect(result).not.toContain("+");
      expect(result).not.toContain("/");
      expect(result).not.toContain("=");
    });

    it("decodes URL-safe base64", () => {
      const encode = getTransform("base64", "encode")!;
      const decode = getTransform("base64", "decode")!;
      const urlSafe = encode("subjects?_d", { urlSafe: true });
      expect(decode(urlSafe)).toBe("subjects?_d");
    });
  });

  describe("url", () => {
    it("encodes URL components", () => {
      const fn = getTransform("url", "encode")!;
      expect(fn("a=1&b=2")).toBe("a%3D1%26b%3D2");
    });

    it("decodes URL components", () => {
      const fn = getTransform("url", "decode")!;
      expect(fn("a%3D1%26b%3D2")).toBe("a=1&b=2");
    });

    it("handles spaces", () => {
      const encode = getTransform("url", "encode")!;
      const decode = getTransform("url", "decode")!;
      expect(encode("hello world")).toBe("hello%20world");
      expect(decode("hello%20world")).toBe("hello world");
    });

    it("encodes all characters with encodeAll option", () => {
      const fn = getTransform("url", "encode")!;
      const result = fn("abc", { encodeAll: true });
      expect(result).toBe("%61%62%63");
    });
  });

  describe("html", () => {
    it("encodes HTML entities", () => {
      const fn = getTransform("html", "encode")!;
      expect(fn("<script>")).toBe("&lt;script&gt;");
    });

    it("decodes HTML entities", () => {
      const fn = getTransform("html", "decode")!;
      expect(fn("&lt;script&gt;")).toBe("<script>");
    });

    it("handles all special chars", () => {
      const fn = getTransform("html", "encode")!;
      expect(fn('& < > " \'')).toBe("&amp; &lt; &gt; &quot; &#39;");
    });

    it("decodes numeric entities", () => {
      const fn = getTransform("html", "decode")!;
      expect(fn("&#65;")).toBe("A");
    });

    it("decodes hex entities", () => {
      const fn = getTransform("html", "decode")!;
      expect(fn("&#x41;")).toBe("A");
    });
  });

  describe("hex", () => {
    it("encodes string to hex", () => {
      const fn = getTransform("hex", "encode")!;
      expect(fn("Hi")).toBe("4869");
    });

    it("decodes hex to string", () => {
      const fn = getTransform("hex", "decode")!;
      expect(fn("4869")).toBe("Hi");
    });

    it("supports uppercase option", () => {
      const fn = getTransform("hex", "encode")!;
      expect(fn("Hi", { uppercase: true })).toBe("4869".toUpperCase());
    });

    it("supports separator option", () => {
      const fn = getTransform("hex", "encode")!;
      expect(fn("Hi", { separator: ":" })).toBe("48:69");
    });

    it("decodes hex with separators", () => {
      const fn = getTransform("hex", "decode")!;
      expect(fn("48:69")).toBe("Hi");
      expect(fn("48 69")).toBe("Hi");
    });

    it("throws on invalid hex", () => {
      const fn = getTransform("hex", "decode")!;
      expect(() => fn("GG")).toThrow("non-hex");
    });

    it("throws on odd-length hex", () => {
      const fn = getTransform("hex", "decode")!;
      expect(() => fn("486")).toThrow("odd number");
    });
  });

  describe("ascii", () => {
    it("encodes string to ASCII values", () => {
      const fn = getTransform("ascii", "encode")!;
      expect(fn("Hi")).toBe("72 105");
    });

    it("decodes ASCII values to string", () => {
      const fn = getTransform("ascii", "decode")!;
      expect(fn("72 105")).toBe("Hi");
    });

    it("throws on invalid ASCII value", () => {
      const fn = getTransform("ascii", "decode")!;
      expect(() => fn("999")).toThrow("Invalid ASCII value");
    });
  });

  describe("unicode", () => {
    it("encodes string to unicode escapes", () => {
      const fn = getTransform("unicode", "encode")!;
      expect(fn("Hi")).toBe("\\u0048\\u0069");
    });

    it("decodes unicode escapes to string", () => {
      const fn = getTransform("unicode", "decode")!;
      expect(fn("\\u0048\\u0069")).toBe("Hi");
    });

    it("handles surrogate pairs for emoji", () => {
      const encode = getTransform("unicode", "encode")!;
      const decode = getTransform("unicode", "decode")!;
      const encoded = encode("😀");
      const decoded = decode(encoded);
      expect(decoded).toBe("😀");
    });
  });

  describe("md5", () => {
    it("computes MD5 hash", () => {
      const fn = getTransform("md5", "encode")!;
      expect(fn("Hello")).toBe("8b1a9953c4611296a827abf8c47804d7");
    });

    it("does not support decode", () => {
      expect(getTransform("md5", "decode")).toBeNull();
    });
  });

  describe("sha1", () => {
    it("computes SHA1 hash", () => {
      const fn = getTransform("sha1", "encode")!;
      expect(fn("Hello")).toBe("f7ff9e8b7bb2e09b70935a5d785e0cc5d9d0abf0");
    });

    it("does not support decode", () => {
      expect(getTransform("sha1", "decode")).toBeNull();
    });
  });

  describe("sha256", () => {
    it("computes SHA256 hash", () => {
      const fn = getTransform("sha256", "encode")!;
      expect(fn("Hello")).toBe(
        "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969",
      );
    });

    it("does not support decode", () => {
      expect(getTransform("sha256", "decode")).toBeNull();
    });
  });

  describe("gzip", () => {
    it("compresses and decompresses", () => {
      const encode = getTransform("gzip", "encode")!;
      const decode = getTransform("gzip", "decode")!;
      const compressed = encode("Hello World");
      expect(compressed).not.toBe("Hello World");
      expect(decode(compressed)).toBe("Hello World");
    });
  });

  describe("jwt", () => {
    it("decodes JWT payload", () => {
      const fn = getTransform("jwt", "decode")!;
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
      const result = JSON.parse(fn(token));
      expect(result.header).toEqual({ alg: "HS256", typ: "JWT" });
      expect(result.payload).toEqual({ sub: "1234567890" });
    });

    it("does not support encode", () => {
      expect(getTransform("jwt", "encode")).toBeNull();
    });

    it("throws on invalid JWT format", () => {
      const fn = getTransform("jwt", "decode")!;
      expect(() => fn("not.a")).toThrow("expected 3 dot-separated parts");
    });
  });

  describe("getTransformTypes", () => {
    it("returns all transform types with metadata", () => {
      const types = getTransformTypes();
      expect(types.length).toBe(11);
      const typeNames = types.map((t) => t.type);
      expect(typeNames).toContain("base64");
      expect(typeNames).toContain("jwt");
      expect(typeNames).toContain("md5");
    });

    it("has correct categories", () => {
      const types = getTransformTypes();
      const md5 = types.find((t) => t.type === "md5")!;
      expect(md5.category).toBe("Hash");
      expect(md5.directions).toEqual(["encode"]);
    });
  });
});
