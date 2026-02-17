import http from "node:http";
import { createLogger } from "@0x0-gen/logger";
import type { ProxyConfig, CapturedExchange, ProxyRequest, ProxyResponse } from "./types.js";
import { collectBody, captureRequest, captureResponse, buildExchange } from "./interceptor.js";
import { handleConnect, type MitmConfig } from "./tunnel.js";

const logger = createLogger("proxy:server");

export type ProxyEventListener = {
  onRequest?: (request: ProxyRequest) => void;
  onResponse?: (requestId: string, response: ProxyResponse) => void;
  onExchange?: (exchange: CapturedExchange) => void;
};

export interface ProxyServer {
  start(): Promise<{ port: number }>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getPort(): number;
  getCaptureCount(): number;
}

export function createProxyServer(
  config: ProxyConfig,
  listener: ProxyEventListener,
): ProxyServer {
  let server: http.Server | null = null;
  let captureCount = 0;

  function handleRequest(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
  ): void {
    if (!config.interceptEnabled) {
      forwardRequest(clientReq, clientRes);
      return;
    }

    collectBody(clientReq)
      .then((reqBody) => {
        const proxyReq = captureRequest(clientReq, reqBody, config.projectId);
        captureCount++;

        if (listener.onRequest) {
          listener.onRequest(proxyReq);
        }

        forwardWithCapture(clientReq, clientRes, reqBody, proxyReq);
      })
      .catch((err) => {
        logger.error("Failed to collect request body", { error: err.message });
        clientRes.writeHead(502, { "Content-Type": "text/plain" });
        clientRes.end("Proxy error: failed to read request body");
      });
  }

  function forwardRequest(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
  ): void {
    const url = new URL(clientReq.url ?? "/", `http://${clientReq.headers.host}`);

    const headers: Record<string, string | string[] | undefined> = { ...clientReq.headers };
    delete headers["proxy-connection"];

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: clientReq.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on("error", (err) => {
      logger.error("Forward error", { error: err.message });
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { "Content-Type": "text/plain" });
      }
      clientRes.end("Proxy error");
    });

    clientReq.pipe(proxyReq);
  }

  function forwardWithCapture(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
    reqBody: Buffer,
    capturedReq: ProxyRequest,
  ): void {
    const url = new URL(clientReq.url ?? "/", `http://${clientReq.headers.host}`);

    const headers: Record<string, string | string[] | undefined> = { ...clientReq.headers };
    delete headers["proxy-connection"];

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: clientReq.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const resChunks: Buffer[] = [];
      let resLength = 0;

      proxyRes.on("data", (chunk: Buffer) => {
        resLength += chunk.length;
        if (resLength <= 10 * 1024 * 1024) {
          resChunks.push(chunk);
        }
      });

      proxyRes.on("end", () => {
        const resBody = Buffer.concat(resChunks);
        const capturedRes = captureResponse(
          proxyRes,
          resBody,
          capturedReq.id,
          capturedReq.timestamp,
        );

        if (listener.onResponse) {
          listener.onResponse(capturedReq.id, capturedRes);
        }

        const exchange = buildExchange(capturedReq, capturedRes, config.projectId);
        if (listener.onExchange) {
          listener.onExchange(exchange);
        }
      });

      // Forward response headers and status to client
      const responseHeaders = { ...proxyRes.headers };
      clientRes.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on("error", (err) => {
      logger.error("Forward error", { error: err.message });

      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { "Content-Type": "text/plain" });
      }
      clientRes.end("Proxy error");
    });

    proxyReq.write(reqBody);
    proxyReq.end();
  }

  return {
    start(): Promise<{ port: number }> {
      return new Promise((resolve, reject) => {
        if (server) {
          reject(new Error("Proxy is already running"));
          return;
        }

        server = http.createServer(handleRequest);

        const mitmConfig: MitmConfig | undefined =
          config.mitmEnabled
            ? {
                enabled: true,
                hosts: config.mitmHosts.length > 0 ? config.mitmHosts : undefined,
                projectId: config.projectId,
                onRequest: listener.onRequest
                  ? (req) => {
                      captureCount++;
                      listener.onRequest!(req);
                    }
                  : undefined,
                onResponse: listener.onResponse,
                onExchange: listener.onExchange,
              }
            : undefined;

        server.on("connect", (req, socket, head) => {
          handleConnect(req, socket, head, mitmConfig);
        });

        server.listen(config.port, config.host, () => {
          const addr = server!.address();
          const port = typeof addr === "object" && addr ? addr.port : config.port;
          logger.info(`Proxy server listening on ${config.host}:${port}`);
          resolve({ port });
        });

        server.on("error", (err) => {
          logger.error("Proxy server error", { error: err.message });
          reject(err);
        });
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }

        server.close((err) => {
          if (err) {
            logger.error("Failed to stop proxy server", { error: err.message });
            reject(err);
            return;
          }
          server = null;
          logger.info("Proxy server stopped");
          resolve();
        });

        // Force-close existing connections
        server.closeAllConnections();
      });
    },

    isRunning(): boolean {
      return server !== null && server.listening;
    },

    getPort(): number {
      return config.port;
    },

    getCaptureCount(): number {
      return captureCount;
    },
  };
}
