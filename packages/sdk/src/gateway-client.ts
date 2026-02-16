import type { EventMessage } from "@0x0-gen/contracts";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("sdk:gateway-client");

export interface GatewayClientOptions {
  baseUrl: string;
}

export interface HealthResponse {
  status: "ok";
  uptime: number;
  timestamp: string;
}

type EventHandler = (event: EventMessage) => void;

export class GatewayClient {
  private readonly baseUrl: string;
  private ws: WebSocket | null = null;
  private eventHandlers: EventHandler[] = [];

  constructor(options: GatewayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
  }

  async healthz(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/healthz`);
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status}`);
    }
    return res.json() as Promise<HealthResponse>;
  }

  connectWebSocket(): void {
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + "/ws";
    logger.info(`Connecting to WebSocket: ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      logger.info("WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as EventMessage;
        for (const handler of this.eventHandlers) {
          handler(message);
        }
      } catch (err) {
        logger.error("Failed to parse WebSocket message", err);
      }
    };

    this.ws.onclose = () => {
      logger.info("WebSocket disconnected");
    };

    this.ws.onerror = (err) => {
      logger.error("WebSocket error", err);
    };
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers = [];
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
