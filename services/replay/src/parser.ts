import type { RepeaterRequest } from "./types.js";

/**
 * Parse a raw HTTP request string into a structured RepeaterRequest.
 *
 * Expected format:
 *   METHOD /path HTTP/1.1\r\n
 *   Header-Name: value\r\n
 *   \r\n
 *   body...
 *
 * The URL is reconstructed from the Host header and the path.
 * If the raw line already contains a full URL (starts with http:// or https://)
 * it is used as-is.
 */
export function parseRawRequest(raw: string): RepeaterRequest {
  // Normalize line endings
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split into headers section and body
  const blankLineIndex = normalized.indexOf("\n\n");
  const headerSection =
    blankLineIndex === -1 ? normalized : normalized.slice(0, blankLineIndex);
  const bodyRaw =
    blankLineIndex === -1 ? null : normalized.slice(blankLineIndex + 2);

  const lines = headerSection.split("\n");

  if (lines.length === 0 || !lines[0]) {
    throw new Error("Invalid raw HTTP: missing request line");
  }

  // Parse request line
  const requestLine = lines[0].trim();
  const parts = requestLine.split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`Invalid request line: ${requestLine}`);
  }

  const method = parts[0].toUpperCase() as RepeaterRequest["method"];
  const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
  if (!validMethods.includes(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }

  const rawPath = parts[1];

  // Parse headers (lines 1+)
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const name = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    headers[name] = value;
  }

  // Build the full URL
  let url: string;
  if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
    url = rawPath;
  } else {
    const host = headers["host"] ?? "localhost";
    // Determine protocol from port or default
    const protocol = host.endsWith(":443") ? "https" : "http";
    url = `${protocol}://${host}${rawPath}`;
  }

  const body = bodyRaw && bodyRaw.length > 0 ? bodyRaw : null;

  return {
    method,
    url,
    headers,
    body,
  };
}

/**
 * Serialize a structured RepeaterRequest back to raw HTTP format.
 */
export function serializeRequest(request: RepeaterRequest): string {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    // If not a valid URL, use the url as the path
    const lines: string[] = [];
    const path = request.url.startsWith("/") ? request.url : `/${request.url}`;
    lines.push(`${request.method} ${path} HTTP/1.1`);
    for (const [name, value] of Object.entries(request.headers)) {
      lines.push(`${name}: ${value}`);
    }
    lines.push("");
    if (request.body) {
      lines.push(request.body);
    }
    return lines.join("\r\n");
  }

  const path = url.pathname + url.search + url.hash || "/";
  const lines: string[] = [];
  lines.push(`${request.method} ${path} HTTP/1.1`);

  // Ensure host header is present
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(request.headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }
  if (!normalizedHeaders["host"]) {
    normalizedHeaders["host"] = url.host;
  }

  for (const [name, value] of Object.entries(normalizedHeaders)) {
    lines.push(`${name}: ${value}`);
  }

  lines.push("");
  if (request.body) {
    lines.push(request.body);
  }

  return lines.join("\r\n");
}
