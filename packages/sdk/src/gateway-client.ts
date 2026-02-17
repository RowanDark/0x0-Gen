import type { EventMessage, Project } from "@0x0-gen/contracts";
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

  async createProject(name: string): Promise<Project> {
    const res = await fetch(`${this.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create project: ${res.status}`);
    }
    return res.json() as Promise<Project>;
  }

  async listProjects(): Promise<Project[]> {
    const res = await fetch(`${this.baseUrl}/projects`);
    if (!res.ok) {
      throw new Error(`Failed to list projects: ${res.status}`);
    }
    const data = (await res.json()) as { projects: Project[] };
    return data.projects;
  }

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${this.baseUrl}/projects/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get project: ${res.status}`);
    }
    return res.json() as Promise<Project>;
  }

  async updateProject(id: string, data: Partial<Pick<Project, "name">>): Promise<Project> {
    const res = await fetch(`${this.baseUrl}/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to update project: ${res.status}`);
    }
    return res.json() as Promise<Project>;
  }

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/projects/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete project: ${res.status}`);
    }
  }

  async listEvents(options?: {
    projectId?: string;
    limit?: number;
    type?: string;
  }): Promise<EventMessage[]> {
    const params = new URLSearchParams();
    if (options?.projectId) params.set("projectId", options.projectId);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.type) params.set("type", options.type);

    const url = `${this.baseUrl}/events${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list events: ${res.status}`);
    }
    const data = (await res.json()) as { events: EventMessage[] };
    return data.events;
  }

  async generateAttachToken(): Promise<{ token: string; expires: number }> {
    const res = await fetch(`${this.baseUrl}/hub/token`, { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed to generate attach token: ${res.status}`);
    }
    return res.json() as Promise<{ token: string; expires: number }>;
  }

  async attachToHub(token: string, name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/hub/attach?token=${token}&name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      throw new Error(`Failed to attach to hub: ${res.status}`);
    }
  }

  async getConnectedTools(): Promise<{ name: string; status: string; attachedAt: string }[]> {
    const res = await fetch(`${this.baseUrl}/hub/tools`);
    if (!res.ok) {
      throw new Error(`Failed to get connected tools: ${res.status}`);
    }
    const data = (await res.json()) as {
      tools: { name: string; status: string; attachedAt: string }[];
    };
    return data.tools;
  }

  async detachTool(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/hub/tools/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to detach tool: ${res.status}`);
    }
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
