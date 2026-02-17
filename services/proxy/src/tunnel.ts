import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { createLogger } from "@0x0-gen/logger";
import { generateHostCert } from "./certs.js";
import type { ProxyRequest, ProxyResponse, CapturedExchange } from "./types.js";
import { collectBody, captureRequest, captureResponse, buildExchange } from "./interceptor.js";

const logger = createLogger("proxy:tunnel");

export interface MitmConfig {
  enabled: boolean;
  hosts?: string[];
  projectId?: string;
  onRequest?: (request: ProxyRequest) => void;
  onResponse?: (requestId: string, response: ProxyResponse) => void;
  onExchange?: (exchange: CapturedExchange) => void;
}

function shouldMitm(host: string, config: MitmConfig): boolean {
  if (!config.enabled) return false;
  if (!config.hosts || config.hosts.length === 0) return true;
  return config.hosts.includes(host);
}

export function handleConnect(
  req: IncomingMessage,
  clientSocket: Duplex,
  head: Buffer,
  mitmConfig?: MitmConfig,
): void {
  const target = req.url ?? "";
  const [host, portStr] = target.split(":");
  const port = parseInt(portStr, 10) || 443;

  if (mitmConfig && shouldMitm(host, mitmConfig)) {
    handleMitmConnect(host, port, clientSocket, head, mitmConfig);
    return;
  }

  // Passthrough tunneling
  logger.debug(`CONNECT tunnel (passthrough) to ${host}:${port}`);

  const serverSocket = net.connect(port, host, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    logger.error(`Tunnel error to ${host}:${port}`, { error: err.message });
    clientSocket.end();
  });

  clientSocket.on("error", (err) => {
    logger.error(`Client socket error for ${host}:${port}`, { error: err.message });
    serverSocket.end();
  });

  serverSocket.on("end", () => {
    clientSocket.end();
  });

  clientSocket.on("end", () => {
    serverSocket.end();
  });
}

function handleMitmConnect(
  host: string,
  port: number,
  clientSocket: Duplex,
  head: Buffer,
  mitmConfig: MitmConfig,
): void {
  logger.warn(`CONNECT MITM intercept for ${host}:${port}`);

  const ctx = generateHostCert(host);

  // Tell client connection is established
  clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");

  // Create TLS server-side socket to decrypt client traffic
  const tlsSocket = new tls.TLSSocket(clientSocket as net.Socket, {
    isServer: true,
    secureContext: ctx,
  });

  if (head.length > 0) {
    tlsSocket.unshift(head);
  }

  // Create a simple HTTP server on the TLS socket to parse requests
  const server = http.createServer((clientReq, clientRes) => {
    // Set full URL for the interceptor
    clientReq.url = `https://${host}${clientReq.url}`;
    if (!clientReq.headers.host) {
      clientReq.headers.host = host;
    }

    collectBody(clientReq)
      .then((reqBody) => {
        const proxyReq = captureRequest(clientReq, reqBody, mitmConfig.projectId);

        if (mitmConfig.onRequest) {
          mitmConfig.onRequest(proxyReq);
        }

        // Forward to real target over TLS
        const targetReq = tls.connect(
          {
            host,
            port,
            servername: host,
            rejectUnauthorized: true,
          },
          () => {
            const requestLine = `${clientReq.method} ${clientReq.url?.replace(`https://${host}`, "") || "/"} HTTP/1.1\r\n`;
            const headers = Object.entries(clientReq.headers)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join("\r\n");

            targetReq.write(requestLine + headers + "\r\n\r\n");
            if (reqBody.length > 0) {
              targetReq.write(reqBody);
            }

            // Read response from target
            const chunks: Buffer[] = [];
            targetReq.on("data", (chunk: Buffer) => chunks.push(chunk));
            targetReq.on("end", () => {
              const rawResponse = Buffer.concat(chunks);
              const responseStr = rawResponse.toString("utf-8");

              // Parse HTTP response
              const headerEnd = responseStr.indexOf("\r\n\r\n");
              if (headerEnd === -1) {
                clientRes.writeHead(502);
                clientRes.end("Bad gateway");
                return;
              }

              const headerSection = responseStr.substring(0, headerEnd);
              const bodyBuf = rawResponse.subarray(
                Buffer.byteLength(responseStr.substring(0, headerEnd + 4)),
              );

              const headerLines = headerSection.split("\r\n");
              const statusLine = headerLines[0];
              const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)\s*(.*)/);
              const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 502;
              const statusMessage = statusMatch?.[2] ?? "";

              const resHeaders: Record<string, string> = {};
              for (let i = 1; i < headerLines.length; i++) {
                const colonIdx = headerLines[i].indexOf(":");
                if (colonIdx > 0) {
                  const k = headerLines[i].substring(0, colonIdx).trim().toLowerCase();
                  const v = headerLines[i].substring(colonIdx + 1).trim();
                  resHeaders[k] = v;
                }
              }

              // Create a mock IncomingMessage for captureResponse
              const mockRes = new http.IncomingMessage(clientReq.socket);
              mockRes.statusCode = statusCode;
              mockRes.statusMessage = statusMessage;
              for (const [k, v] of Object.entries(resHeaders)) {
                mockRes.headers[k] = v;
              }

              const capturedRes = captureResponse(
                mockRes,
                bodyBuf,
                proxyReq.id,
                proxyReq.timestamp,
              );

              if (mitmConfig.onResponse) {
                mitmConfig.onResponse(proxyReq.id, capturedRes);
              }

              const exchange = buildExchange(proxyReq, capturedRes, mitmConfig.projectId);
              if (mitmConfig.onExchange) {
                mitmConfig.onExchange(exchange);
              }

              // Forward response to client
              clientRes.writeHead(statusCode, resHeaders);
              clientRes.end(bodyBuf);
            });
          },
        );

        targetReq.on("error", (err) => {
          logger.error(`MITM forward error to ${host}:${port}`, {
            error: err.message,
          });
          if (!clientRes.headersSent) {
            clientRes.writeHead(502);
          }
          clientRes.end("Bad gateway");
        });
      })
      .catch((err) => {
        logger.error("MITM body collection error", { error: err.message });
        clientRes.writeHead(502);
        clientRes.end("Proxy error");
      });
  });

  server.emit("connection", tlsSocket);

  tlsSocket.on("error", (err) => {
    logger.error(`MITM TLS error for ${host}`, { error: err.message });
  });
}
