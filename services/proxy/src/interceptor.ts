import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { createLogger } from "@0x0-gen/logger";
import type { ProxyRequest, ProxyResponse, CapturedExchange } from "./types.js";

const logger = createLogger("proxy:interceptor");

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB default

export type ExchangeHandler = (exchange: CapturedExchange) => void;
export type RequestHandler = (request: ProxyRequest) => void;
export type ResponseHandler = (requestId: string, response: ProxyResponse) => void;

function isBinary(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const textTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
  ];
  return !textTypes.some((t) => contentType.toLowerCase().includes(t));
}

export function collectBody(stream: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;

    stream.on("data", (chunk: Buffer) => {
      totalLength += chunk.length;
      if (totalLength > MAX_BODY_SIZE) {
        stream.destroy();
        reject(new Error("Body exceeds maximum size"));
        return;
      }
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);
  });
}

export function captureRequest(
  req: IncomingMessage,
  body: Buffer,
  projectId?: string,
): ProxyRequest {
  const url = req.url ?? "/";
  const host = req.headers.host ?? "unknown";
  const parsedUrl = new URL(url, `http://${host}`);
  const contentType = req.headers["content-type"];
  const binary = isBinary(contentType);

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
  }

  const proxyRequest: ProxyRequest = {
    id: randomUUID(),
    timestamp: Date.now(),
    projectId,
    method: req.method ?? "GET",
    url: url,
    host: host,
    path: parsedUrl.pathname + parsedUrl.search,
    headers,
    body: body.length > 0 ? (binary ? body.toString("base64") : body.toString("utf-8")) : null,
    contentLength: body.length,
  };

  logger.debug(`Captured request: ${proxyRequest.method} ${proxyRequest.url}`);
  return proxyRequest;
}

export function captureResponse(
  res: IncomingMessage,
  body: Buffer,
  requestId: string,
  requestTimestamp: number,
): ProxyResponse {
  const contentType = res.headers["content-type"];
  const binary = isBinary(contentType);

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(res.headers)) {
    if (value !== undefined) {
      headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
  }

  const proxyResponse: ProxyResponse = {
    id: randomUUID(),
    requestId,
    timestamp: Date.now(),
    statusCode: res.statusCode ?? 0,
    statusMessage: res.statusMessage ?? "",
    headers,
    body: body.length > 0 ? (binary ? body.toString("base64") : body.toString("utf-8")) : null,
    contentLength: body.length,
    duration: Date.now() - requestTimestamp,
  };

  logger.debug(`Captured response: ${proxyResponse.statusCode} for request ${requestId}`);
  return proxyResponse;
}

export function buildExchange(
  request: ProxyRequest,
  response: ProxyResponse | null,
  projectId?: string,
): CapturedExchange {
  return {
    id: randomUUID(),
    request,
    response,
    projectId,
    tags: [],
  };
}
