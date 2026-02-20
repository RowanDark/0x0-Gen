import type {
  EventMessage,
  Project,
  ProxyConfig,
  CapturedExchange,
  RepeaterTab,
  RepeaterRequest,
  RepeaterHistoryEntry,
  TransformStep,
  TransformType,
  TransformDirection,
  TransformResult,
  DecoderPreset,
  IntruderConfig,
  IntruderAttack,
  IntruderResult,
  IntruderPosition,
  ReconProject,
  ReconEntity,
  ReconRelationship,
  ReconImport,
  ImportSourceType,
  MapperCanvas,
  MapperNode,
  MapperEdge,
  MapperTransform,
  MapperTransformResult,
  MapperViewport,
  MapperNodeStyle,
  MapperEdgeStyle,
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

  // Decoder methods

  async transform(
    input: string,
    steps: TransformStep[],
  ): Promise<TransformResult> {
    const res = await fetch(`${this.baseUrl}/decoder/transform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, steps }),
    });
    if (!res.ok) {
      throw new Error(`Failed to transform: ${res.status}`);
    }
    return res.json() as Promise<TransformResult>;
  }

  async transformSingle(
    input: string,
    type: TransformType,
    direction: TransformDirection,
    options?: Record<string, unknown>,
  ): Promise<TransformResult> {
    const res = await fetch(`${this.baseUrl}/decoder/${type}/${direction}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, options }),
    });
    if (!res.ok) {
      throw new Error(`Failed to transform: ${res.status}`);
    }
    return res.json() as Promise<TransformResult>;
  }

  async listTransformTypes(): Promise<
    {
      type: TransformType;
      name: string;
      category: string;
      directions: TransformDirection[];
      description: string;
    }[]
  > {
    const res = await fetch(`${this.baseUrl}/decoder/types`);
    if (!res.ok) {
      throw new Error(`Failed to list transform types: ${res.status}`);
    }
    const data = (await res.json()) as {
      types: {
        type: TransformType;
        name: string;
        category: string;
        directions: TransformDirection[];
        description: string;
      }[];
    };
    return data.types;
  }

  async listPresets(projectId?: string): Promise<DecoderPreset[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const url = `${this.baseUrl}/decoder/presets${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list presets: ${res.status}`);
    }
    const data = (await res.json()) as { presets: DecoderPreset[] };
    return data.presets;
  }

  async getPreset(id: string): Promise<DecoderPreset> {
    const res = await fetch(`${this.baseUrl}/decoder/presets/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get preset: ${res.status}`);
    }
    return res.json() as Promise<DecoderPreset>;
  }

  async createPreset(
    name: string,
    steps: TransformStep[],
    projectId?: string,
  ): Promise<DecoderPreset> {
    const res = await fetch(`${this.baseUrl}/decoder/presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, steps, projectId }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create preset: ${res.status}`);
    }
    return res.json() as Promise<DecoderPreset>;
  }

  async updatePreset(
    id: string,
    data: { name?: string; steps?: TransformStep[] },
  ): Promise<DecoderPreset> {
    const res = await fetch(`${this.baseUrl}/decoder/presets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to update preset: ${res.status}`);
    }
    return res.json() as Promise<DecoderPreset>;
  }

  async deletePreset(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/decoder/presets/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete preset: ${res.status}`);
    }
  }

  async runPreset(id: string, input: string): Promise<TransformResult> {
    const res = await fetch(`${this.baseUrl}/decoder/presets/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) {
      throw new Error(`Failed to run preset: ${res.status}`);
    }
    return res.json() as Promise<TransformResult>;
  }

  // Intruder config methods

  async createIntruderConfig(
    config: Partial<IntruderConfig>,
  ): Promise<IntruderConfig> {
    const res = await fetch(`${this.baseUrl}/intruder/configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      throw new Error(`Failed to create intruder config: ${res.status}`);
    }
    return res.json() as Promise<IntruderConfig>;
  }

  async listIntruderConfigs(projectId?: string): Promise<IntruderConfig[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const url = `${this.baseUrl}/intruder/configs${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list intruder configs: ${res.status}`);
    }
    const data = (await res.json()) as { configs: IntruderConfig[] };
    return data.configs;
  }

  async getIntruderConfig(id: string): Promise<IntruderConfig> {
    const res = await fetch(`${this.baseUrl}/intruder/configs/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get intruder config: ${res.status}`);
    }
    return res.json() as Promise<IntruderConfig>;
  }

  async updateIntruderConfig(
    id: string,
    data: Partial<IntruderConfig>,
  ): Promise<IntruderConfig> {
    const res = await fetch(`${this.baseUrl}/intruder/configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to update intruder config: ${res.status}`);
    }
    return res.json() as Promise<IntruderConfig>;
  }

  async deleteIntruderConfig(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/intruder/configs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete intruder config: ${res.status}`);
    }
  }

  // Intruder attack methods

  async startAttack(configId: string): Promise<IntruderAttack> {
    const res = await fetch(
      `${this.baseUrl}/intruder/configs/${configId}/start`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to start attack: ${res.status}`);
    }
    return res.json() as Promise<IntruderAttack>;
  }

  async pauseAttack(attackId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/intruder/attacks/${attackId}/pause`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to pause attack: ${res.status}`);
    }
  }

  async resumeAttack(attackId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/intruder/attacks/${attackId}/resume`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to resume attack: ${res.status}`);
    }
  }

  async cancelAttack(attackId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/intruder/attacks/${attackId}/cancel`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to cancel attack: ${res.status}`);
    }
  }

  async getAttack(attackId: string): Promise<IntruderAttack> {
    const res = await fetch(`${this.baseUrl}/intruder/attacks/${attackId}`);
    if (!res.ok) {
      throw new Error(`Failed to get attack: ${res.status}`);
    }
    return res.json() as Promise<IntruderAttack>;
  }

  async getAttackResults(
    attackId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<IntruderResult[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${this.baseUrl}/intruder/attacks/${attackId}/results${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to get attack results: ${res.status}`);
    }
    const data = (await res.json()) as { results: IntruderResult[] };
    return data.results;
  }

  // Intruder utility methods

  async parseIntruderPositions(request: string): Promise<IntruderPosition[]> {
    const res = await fetch(`${this.baseUrl}/intruder/parse-positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    });
    if (!res.ok) {
      throw new Error(`Failed to parse positions: ${res.status}`);
    }
    const data = (await res.json()) as { positions: IntruderPosition[] };
    return data.positions;
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

  // ========================
  // Recon — Project methods
  // ========================

  async createReconProject(data: {
    name: string;
    targets?: string[];
    description?: string;
  }): Promise<ReconProject> {
    const res = await fetch(`${this.baseUrl}/recon/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to create recon project: ${res.status}`);
    }
    return res.json() as Promise<ReconProject>;
  }

  async listReconProjects(): Promise<ReconProject[]> {
    const res = await fetch(`${this.baseUrl}/recon/projects`);
    if (!res.ok) {
      throw new Error(`Failed to list recon projects: ${res.status}`);
    }
    const data = (await res.json()) as { projects: ReconProject[] };
    return data.projects;
  }

  async getReconProject(
    id: string,
  ): Promise<ReconProject & { stats: Record<string, unknown> }> {
    const res = await fetch(`${this.baseUrl}/recon/projects/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get recon project: ${res.status}`);
    }
    return res.json() as Promise<ReconProject & { stats: Record<string, unknown> }>;
  }

  async updateReconProject(
    id: string,
    data: Partial<Pick<ReconProject, "name" | "description" | "targets">>,
  ): Promise<ReconProject> {
    const res = await fetch(`${this.baseUrl}/recon/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to update recon project: ${res.status}`);
    }
    return res.json() as Promise<ReconProject>;
  }

  async deleteReconProject(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/recon/projects/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete recon project: ${res.status}`);
    }
  }

  // ========================
  // Recon — Import methods
  // ========================

  async importReconText(
    projectId: string,
    content: string,
    source?: ImportSourceType,
    filename?: string,
  ): Promise<ReconImport> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/import/text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, source, filename }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to import recon text: ${res.status}`);
    }
    return res.json() as Promise<ReconImport>;
  }

  async listReconImports(projectId: string): Promise<ReconImport[]> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/imports`,
    );
    if (!res.ok) {
      throw new Error(`Failed to list recon imports: ${res.status}`);
    }
    const data = (await res.json()) as { imports: ReconImport[] };
    return data.imports;
  }

  async getReconImport(
    projectId: string,
    importId: string,
  ): Promise<ReconImport> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/imports/${importId}`,
    );
    if (!res.ok) {
      throw new Error(`Failed to get recon import: ${res.status}`);
    }
    return res.json() as Promise<ReconImport>;
  }

  async deleteReconImport(
    projectId: string,
    importId: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/imports/${importId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed to delete recon import: ${res.status}`);
    }
  }

  // ========================
  // Recon — Entity methods
  // ========================

  async listReconEntities(
    projectId: string,
    options?: {
      category?: string;
      type?: string;
      source?: string;
      tag?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sort?: string;
    },
  ): Promise<{ entities: ReconEntity[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.category) params.set("category", options.category);
    if (options?.type) params.set("type", options.type);
    if (options?.source) params.set("source", options.source);
    if (options?.tag) params.set("tag", options.tag);
    if (options?.search) params.set("search", options.search);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.sort) params.set("sort", options.sort);

    const url = `${this.baseUrl}/recon/projects/${projectId}/entities${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list recon entities: ${res.status}`);
    }
    return res.json() as Promise<{ entities: ReconEntity[]; total: number }>;
  }

  async getReconEntity(
    projectId: string,
    entityId: string,
  ): Promise<ReconEntity & { relationships: ReconRelationship[] }> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/entities/${entityId}`,
    );
    if (!res.ok) {
      throw new Error(`Failed to get recon entity: ${res.status}`);
    }
    return res.json() as Promise<
      ReconEntity & { relationships: ReconRelationship[] }
    >;
  }

  async updateReconEntity(
    projectId: string,
    entityId: string,
    data: { tags?: string[]; notes?: string },
  ): Promise<ReconEntity> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/entities/${entityId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to update recon entity: ${res.status}`);
    }
    return res.json() as Promise<ReconEntity>;
  }

  async deleteReconEntity(
    projectId: string,
    entityId: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/entities/${entityId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed to delete recon entity: ${res.status}`);
    }
  }

  async bulkTagEntities(
    projectId: string,
    entityIds: string[],
    tag: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/entities/bulk/tag`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds, tag }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to bulk tag entities: ${res.status}`);
    }
  }

  async bulkDeleteEntities(
    projectId: string,
    entityIds: string[],
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/entities/bulk/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to bulk delete entities: ${res.status}`);
    }
  }

  async exportEntities(
    projectId: string,
    entityIds: string[],
    format: "json" | "csv" = "json",
  ): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/entities/bulk/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds, format }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to export entities: ${res.status}`);
    }
    return res.text();
  }

  // ========================
  // Recon — Relationship methods
  // ========================

  async listReconRelationships(
    projectId: string,
    entityId?: string,
  ): Promise<ReconRelationship[]> {
    const params = new URLSearchParams();
    if (entityId) params.set("entityId", entityId);

    const url = `${this.baseUrl}/recon/projects/${projectId}/relationships${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list recon relationships: ${res.status}`);
    }
    const data = (await res.json()) as {
      relationships: ReconRelationship[];
    };
    return data.relationships;
  }

  async createReconRelationship(
    projectId: string,
    data: { fromEntityId: string; toEntityId: string; type: string },
  ): Promise<ReconRelationship> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/relationships`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to create recon relationship: ${res.status}`);
    }
    return res.json() as Promise<ReconRelationship>;
  }

  async deleteReconRelationship(
    projectId: string,
    relationshipId: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/relationships/${relationshipId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed to delete recon relationship: ${res.status}`);
    }
  }

  // ========================
  // Recon — Stats methods
  // ========================

  async getReconStats(
    projectId: string,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/stats`,
    );
    if (!res.ok) {
      throw new Error(`Failed to get recon stats: ${res.status}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  async getReconTimeline(
    projectId: string,
  ): Promise<Array<{ date: string; count: number; category: string }>> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/timeline`,
    );
    if (!res.ok) {
      throw new Error(`Failed to get recon timeline: ${res.status}`);
    }
    const data = (await res.json()) as {
      timeline: Array<{ date: string; count: number; category: string }>;
    };
    return data.timeline;
  }

  async getReconGraph(
    projectId: string,
  ): Promise<{
    nodes: Array<{ id: string; label: string; type: string; category: string; confidence: number }>;
    edges: Array<{ id: string; source: string; target: string; type: string; confidence: number }>;
  }> {
    const res = await fetch(
      `${this.baseUrl}/recon/projects/${projectId}/graph`,
    );
    if (!res.ok) {
      throw new Error(`Failed to get recon graph: ${res.status}`);
    }
    return res.json() as Promise<{
      nodes: Array<{ id: string; label: string; type: string; category: string; confidence: number }>;
      edges: Array<{ id: string; source: string; target: string; type: string; confidence: number }>;
    }>;
  }

  // ========================
  // Recon — Utility methods
  // ========================

  async listReconParsers(): Promise<
    Array<{ name: string; source: string; formats: string[] }>
  > {
    const res = await fetch(`${this.baseUrl}/recon/parsers`);
    if (!res.ok) {
      throw new Error(`Failed to list recon parsers: ${res.status}`);
    }
    const data = (await res.json()) as {
      parsers: Array<{ name: string; source: string; formats: string[] }>;
    };
    return data.parsers;
  }

  async detectReconFormat(
    content: string,
    filename?: string,
  ): Promise<{ source: string | null; confidence: number }> {
    const res = await fetch(`${this.baseUrl}/recon/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename }),
    });
    if (!res.ok) {
      throw new Error(`Failed to detect recon format: ${res.status}`);
    }
    return res.json() as Promise<{
      source: string | null;
      confidence: number;
    }>;
  }

  // ========================
  // Mapper — Canvas methods
  // ========================

  async createMapperCanvas(
    projectId: string,
    name: string,
  ): Promise<MapperCanvas> {
    const res = await fetch(`${this.baseUrl}/mapper/canvases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create mapper canvas: ${res.status}`);
    }
    return res.json() as Promise<MapperCanvas>;
  }

  async listMapperCanvases(projectId: string): Promise<MapperCanvas[]> {
    const params = new URLSearchParams({ projectId });
    const res = await fetch(`${this.baseUrl}/mapper/canvases?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to list mapper canvases: ${res.status}`);
    }
    const data = (await res.json()) as { canvases: MapperCanvas[] };
    return data.canvases;
  }

  async getMapperCanvas(canvasId: string): Promise<MapperCanvas> {
    const res = await fetch(`${this.baseUrl}/mapper/canvases/${canvasId}`);
    if (!res.ok) {
      throw new Error(`Failed to get mapper canvas: ${res.status}`);
    }
    return res.json() as Promise<MapperCanvas>;
  }

  async updateMapperCanvas(
    canvasId: string,
    data: { name?: string; viewport?: MapperViewport },
  ): Promise<MapperCanvas> {
    const res = await fetch(`${this.baseUrl}/mapper/canvases/${canvasId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to update mapper canvas: ${res.status}`);
    }
    return res.json() as Promise<MapperCanvas>;
  }

  async deleteMapperCanvas(canvasId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/mapper/canvases/${canvasId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete mapper canvas: ${res.status}`);
    }
  }

  // ========================
  // Mapper — Node methods
  // ========================

  async addMapperNodes(
    canvasId: string,
    nodes: Array<{
      entityId?: string;
      type: string;
      label: string;
      x?: number;
      y?: number;
      pinned?: boolean;
      style?: MapperNodeStyle;
      data?: Record<string, unknown>;
    }>,
  ): Promise<MapperNode[]> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/nodes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to add mapper nodes: ${res.status}`);
    }
    const data = (await res.json()) as { nodes: MapperNode[] };
    return data.nodes;
  }

  async addNodesFromEntities(
    canvasId: string,
    entityIds: string[],
  ): Promise<{ nodes: MapperNode[]; edges: MapperEdge[] }> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/nodes/from-entities`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to add nodes from entities: ${res.status}`);
    }
    return res.json() as Promise<{ nodes: MapperNode[]; edges: MapperEdge[] }>;
  }

  async updateMapperNode(
    canvasId: string,
    nodeId: string,
    data: { x?: number; y?: number; pinned?: boolean; label?: string; style?: MapperNodeStyle },
  ): Promise<MapperNode> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/nodes/${nodeId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to update mapper node: ${res.status}`);
    }
    return res.json() as Promise<MapperNode>;
  }

  async deleteMapperNode(canvasId: string, nodeId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/nodes/${nodeId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed to delete mapper node: ${res.status}`);
    }
  }

  // ========================
  // Mapper — Edge methods
  // ========================

  async addMapperEdge(
    canvasId: string,
    edge: { fromNodeId: string; toNodeId: string; type: string; label?: string; style?: MapperEdgeStyle },
  ): Promise<MapperEdge> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/edges`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edge),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to add mapper edge: ${res.status}`);
    }
    return res.json() as Promise<MapperEdge>;
  }

  async deleteMapperEdge(canvasId: string, edgeId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/edges/${edgeId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed to delete mapper edge: ${res.status}`);
    }
  }

  // ========================
  // Mapper — Transform methods
  // ========================

  async listMapperTransforms(): Promise<MapperTransform[]> {
    const res = await fetch(`${this.baseUrl}/mapper/transforms`);
    if (!res.ok) {
      throw new Error(`Failed to list mapper transforms: ${res.status}`);
    }
    const data = (await res.json()) as { transforms: MapperTransform[] };
    return data.transforms;
  }

  async runTransform(
    canvasId: string,
    nodeId: string,
    transformId: string,
  ): Promise<MapperTransformResult> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/nodes/${nodeId}/transform`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transformId }),
      },
    );
    if (!res.ok) {
      throw new Error(`Failed to run transform: ${res.status}`);
    }
    return res.json() as Promise<MapperTransformResult>;
  }

  // ========================
  // Mapper — Layout
  // ========================

  async autoLayoutCanvas(canvasId: string): Promise<MapperCanvas> {
    const res = await fetch(
      `${this.baseUrl}/mapper/canvases/${canvasId}/layout`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to auto-layout canvas: ${res.status}`);
    }
    return res.json() as Promise<MapperCanvas>;
  }
}
