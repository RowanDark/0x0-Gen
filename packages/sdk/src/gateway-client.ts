import type {
  EventMessage,
  Project,
  ProxyConfig,
  CapturedExchange,
  RepeaterTab,
  RepeaterRequest,
  RepeaterHistoryEntry,
} from "@0x0-gen/contracts";
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

  async startProxy(
    config?: Partial<ProxyConfig>,
  ): Promise<{ port: number; status: string }> {
    const res = await fetch(`${this.baseUrl}/proxy/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config ?? {}),
    });
    if (!res.ok) {
      throw new Error(`Failed to start proxy: ${res.status}`);
    }
    return res.json() as Promise<{ port: number; status: string }>;
  }

  async stopProxy(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/proxy/stop`, { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed to stop proxy: ${res.status}`);
    }
  }

  async getProxyStatus(): Promise<{
    running: boolean;
    port: number;
    captureCount: number;
  }> {
    const res = await fetch(`${this.baseUrl}/proxy/status`);
    if (!res.ok) {
      throw new Error(`Failed to get proxy status: ${res.status}`);
    }
    return res.json() as Promise<{ running: boolean; port: number; captureCount: number }>;
  }

  async getProxyHistory(options?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CapturedExchange[]> {
    const params = new URLSearchParams();
    if (options?.projectId) params.set("projectId", options.projectId);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${this.baseUrl}/proxy/history${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to get proxy history: ${res.status}`);
    }
    const data = (await res.json()) as { exchanges: CapturedExchange[] };
    return data.exchanges;
  }

  async getExchange(id: string): Promise<CapturedExchange> {
    const res = await fetch(`${this.baseUrl}/proxy/history/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get exchange: ${res.status}`);
    }
    return res.json() as Promise<CapturedExchange>;
  }

  async clearProxyHistory(projectId?: string): Promise<void> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);

    const url = `${this.baseUrl}/proxy/history${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`Failed to clear proxy history: ${res.status}`);
    }
  }

  async getCAStatus(): Promise<{ generated: boolean; fingerprint: string }> {
    const res = await fetch(`${this.baseUrl}/proxy/ca/status`);
    if (!res.ok) {
      throw new Error(`Failed to get CA status: ${res.status}`);
    }
    return res.json() as Promise<{ generated: boolean; fingerprint: string }>;
  }

  async getCACertificate(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/proxy/ca/cert`);
    if (!res.ok) {
      throw new Error(`Failed to get CA certificate: ${res.status}`);
    }
    return res.text();
  }

  async regenerateCA(): Promise<{ generated: boolean; fingerprint: string }> {
    const res = await fetch(`${this.baseUrl}/proxy/ca/generate`, { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed to regenerate CA: ${res.status}`);
    }
    return res.json() as Promise<{ generated: boolean; fingerprint: string }>;
  }

  // Repeater tab methods

  async createRepeaterTab(projectId?: string): Promise<RepeaterTab> {
    const res = await fetch(`${this.baseUrl}/repeater/tabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create repeater tab: ${res.status}`);
    }
    return res.json() as Promise<RepeaterTab>;
  }

  async listRepeaterTabs(projectId?: string): Promise<RepeaterTab[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const url = `${this.baseUrl}/repeater/tabs${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list repeater tabs: ${res.status}`);
    }
    const data = (await res.json()) as { tabs: RepeaterTab[] };
    return data.tabs;
  }

  async getRepeaterTab(id: string): Promise<RepeaterTab> {
    const res = await fetch(`${this.baseUrl}/repeater/tabs/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get repeater tab: ${res.status}`);
    }
    return res.json() as Promise<RepeaterTab>;
  }

  async updateRepeaterTab(
    id: string,
    data: { name?: string; request?: RepeaterRequest },
  ): Promise<RepeaterTab> {
    const res = await fetch(`${this.baseUrl}/repeater/tabs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to update repeater tab: ${res.status}`);
    }
    return res.json() as Promise<RepeaterTab>;
  }

  async deleteRepeaterTab(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/repeater/tabs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete repeater tab: ${res.status}`);
    }
  }

  // Repeater request methods

  async sendRepeaterRequest(tabId: string): Promise<RepeaterHistoryEntry> {
    const res = await fetch(`${this.baseUrl}/repeater/tabs/${tabId}/send`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to send repeater request: ${res.status}`);
    }
    return res.json() as Promise<RepeaterHistoryEntry>;
  }

  async clearRepeaterHistory(tabId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/repeater/tabs/${tabId}/history`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to clear repeater history: ${res.status}`);
    }
  }

  // Repeater utility methods

  async parseRawRequest(raw: string): Promise<RepeaterRequest> {
    const res = await fetch(`${this.baseUrl}/repeater/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      throw new Error(`Failed to parse raw request: ${res.status}`);
    }
    return res.json() as Promise<RepeaterRequest>;
  }

  async serializeRequest(request: RepeaterRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl}/repeater/serialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error(`Failed to serialize request: ${res.status}`);
    }
    const data = (await res.json()) as { raw: string };
    return data.raw;
  }

  async createTabFromCapture(captureId: string): Promise<RepeaterTab> {
    const res = await fetch(
      `${this.baseUrl}/repeater/tabs/from-capture/${captureId}`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to create tab from capture: ${res.status}`);
    }
    return res.json() as Promise<RepeaterTab>;
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
