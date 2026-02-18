import http from "node:http";
import https from "node:https";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import type { RepeaterRequest, RepeaterHistoryEntry, RepeaterResponse } from "./types.js";

const logger = createLogger("replay:sender");

export interface SendOptions {
  /** Request timeout in milliseconds. Default: 30000 */
  timeout?: number;
  /** Follow HTTP redirects. Default: false */
  followRedirects?: boolean;
  /** Maximum redirect hops. Default: 5 */
  maxRedirects?: number;
  /** Maximum response body size in bytes. Default: 10 * 1024 * 1024 (10MB) */
  maxBodySize?: number;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_BODY = 10 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;

/**
 * Send an HTTP/HTTPS request and return a history entry with timing and response.
 */
export async function sendRequest(
  request: RepeaterRequest,
  options: SendOptions = {},
): Promise<RepeaterHistoryEntry> {
  const {
    timeout = DEFAULT_TIMEOUT,
    followRedirects = false,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxBodySize = DEFAULT_MAX_BODY,
  } = options;

  const id = randomUUID();
  const timestamp = Date.now();

  try {
    const { response, duration } = await doSend(
      request,
      timeout,
      followRedirects,
      maxRedirects,
      maxBodySize,
      0,
    );

    logger.info(`${request.method} ${request.url} → ${response.statusCode} (${duration}ms)`);

    return {
      id,
      timestamp,
      request,
      response,
      duration,
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const duration = Date.now() - timestamp;
    logger.warn(`${request.method} ${request.url} failed: ${error}`);
    return {
      id,
      timestamp,
      request,
      response: null,
      duration,
      error,
    };
  }
}

async function doSend(
  request: RepeaterRequest,
  timeout: number,
  followRedirects: boolean,
  maxRedirects: number,
  maxBodySize: number,
  redirectCount: number,
): Promise<{ response: RepeaterResponse; duration: number }> {
  const start = Date.now();
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;

  const bodyBuffer =
    request.body !== null ? Buffer.from(request.body, "utf-8") : null;

  const reqOptions: https.RequestOptions = {
    method: request.method,
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search + url.hash,
    headers: {
      ...request.headers,
      ...(bodyBuffer
        ? { "content-length": String(bodyBuffer.byteLength) }
        : {}),
    },
    // Don't reject self-signed certs during pen-testing
    rejectUnauthorized: false,
    timeout,
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let aborted = false;

      res.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > maxBodySize) {
          aborted = true;
          req.destroy(new Error(`Response body exceeds limit of ${maxBodySize} bytes`));
          return;
        }
        chunks.push(chunk);
      });

      res.on("end", () => {
        if (aborted) return;
        const duration = Date.now() - start;
        const rawBody = Buffer.concat(chunks);

        // Handle redirects
        if (
          followRedirects &&
          redirectCount < maxRedirects &&
          res.statusCode !== undefined &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers["location"]
        ) {
          const location = res.headers["location"];
          let nextUrl: string;
          try {
            nextUrl = new URL(location, request.url).toString();
          } catch {
            nextUrl = location;
          }
          const redirectRequest: RepeaterRequest = {
            ...request,
            url: nextUrl,
            method: res.statusCode === 303 ? "GET" : request.method,
            body: res.statusCode === 303 ? null : request.body,
          };
          doSend(
            redirectRequest,
            timeout,
            followRedirects,
            maxRedirects,
            maxBodySize,
            redirectCount + 1,
          )
            .then(resolve)
            .catch(reject);
          return;
        }

        const responseHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (v === undefined) continue;
          responseHeaders[k] = Array.isArray(v) ? v.join(", ") : v;
        }

        // Detect if body is binary — store as base64 if so
        const isText = isTextBuffer(rawBody);
        const bodyString = rawBody.length > 0
          ? isText
            ? rawBody.toString("utf-8")
            : rawBody.toString("base64")
          : null;

        const response: RepeaterResponse = {
          statusCode: res.statusCode ?? 0,
          statusMessage: res.statusMessage ?? "",
          headers: responseHeaders,
          body: bodyString,
          contentLength: rawBody.length,
        };

        resolve({ response, duration });
      });

      res.on("error", (err) => {
        reject(err);
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out after ${timeout}ms`));
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

/**
 * Heuristic to detect if a buffer is likely text content.
 * Checks the first 512 bytes for null bytes or high control characters.
 */
function isTextBuffer(buf: Buffer): boolean {
  const sample = buf.slice(0, 512);
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    // Null byte or non-text control characters indicate binary
    if (b === 0 || (b < 8 && b !== 0) || (b >= 14 && b < 32)) {
      return false;
    }
  }
  return true;
}
