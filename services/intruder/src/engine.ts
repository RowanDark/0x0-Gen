import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { createLogger } from "@0x0-gen/logger";
import type {
  IntruderConfig,
  IntruderAttack,
  IntruderResult,
  IntruderResponse,
} from "./types.js";
import { createIterator, calculateTotalRequests } from "./payloads.js";
import { renderRequest } from "./renderer.js";
import { parseRawRequest, sendRequest } from "./http.js";

const logger = createLogger("intruder:engine");

export interface IntruderEngineEvents {
  started: (attack: IntruderAttack) => void;
  progress: (attack: IntruderAttack) => void;
  result: (result: IntruderResult) => void;
  paused: (attack: IntruderAttack) => void;
  resumed: (attack: IntruderAttack) => void;
  completed: (attack: IntruderAttack) => void;
  cancelled: (attack: IntruderAttack) => void;
  error: (attackId: string, error: string) => void;
}

interface AttackState {
  attack: IntruderAttack;
  config: IntruderConfig;
  abortController: AbortController;
  paused: boolean;
  pauseResolve: (() => void) | null;
  results: IntruderResult[];
}

export class IntruderEngine extends EventEmitter {
  private attacks = new Map<string, AttackState>();
  private progressInterval = 10; // Emit progress every N results

  /**
   * Start a new attack based on the given config.
   */
  async start(config: IntruderConfig): Promise<string> {
    const attackId = randomUUID();
    const totalRequests = calculateTotalRequests(config);

    const attack: IntruderAttack = {
      id: attackId,
      configId: config.id,
      status: "pending",
      totalRequests,
      completedRequests: 0,
      startedAt: null,
      completedAt: null,
      results: [],
    };

    const state: AttackState = {
      attack,
      config,
      abortController: new AbortController(),
      paused: false,
      pauseResolve: null,
      results: [],
    };

    this.attacks.set(attackId, state);

    // Run attack asynchronously
    void this.runAttack(state);

    return attackId;
  }

  /**
   * Pause a running attack.
   */
  async pause(attackId: string): Promise<void> {
    const state = this.attacks.get(attackId);
    if (!state) throw new Error(`Attack ${attackId} not found`);
    if (state.attack.status !== "running") {
      throw new Error(`Attack ${attackId} is not running`);
    }

    state.paused = true;
    state.attack.status = "paused";
    logger.info(`Attack ${attackId} paused`);
    this.emit("paused", state.attack);
  }

  /**
   * Resume a paused attack.
   */
  async resume(attackId: string): Promise<void> {
    const state = this.attacks.get(attackId);
    if (!state) throw new Error(`Attack ${attackId} not found`);
    if (state.attack.status !== "paused") {
      throw new Error(`Attack ${attackId} is not paused`);
    }

    state.paused = false;
    state.attack.status = "running";
    if (state.pauseResolve) {
      state.pauseResolve();
      state.pauseResolve = null;
    }
    logger.info(`Attack ${attackId} resumed`);
    this.emit("resumed", state.attack);
  }

  /**
   * Cancel an attack.
   */
  async cancel(attackId: string): Promise<void> {
    const state = this.attacks.get(attackId);
    if (!state) throw new Error(`Attack ${attackId} not found`);
    if (state.attack.status !== "running" && state.attack.status !== "paused") {
      throw new Error(`Attack ${attackId} cannot be cancelled`);
    }

    state.abortController.abort();
    state.paused = false;
    if (state.pauseResolve) {
      state.pauseResolve();
      state.pauseResolve = null;
    }
    state.attack.status = "cancelled";
    state.attack.completedAt = Date.now();
    logger.info(`Attack ${attackId} cancelled`);
    this.emit("cancelled", state.attack);
  }

  /**
   * Get the current status of an attack.
   */
  getStatus(attackId: string): IntruderAttack | null {
    const state = this.attacks.get(attackId);
    if (!state) return null;
    return { ...state.attack, results: state.results };
  }

  /**
   * Get results for an attack with optional pagination.
   */
  getResults(
    attackId: string,
    options?: { limit?: number; offset?: number },
  ): IntruderResult[] {
    const state = this.attacks.get(attackId);
    if (!state) return [];

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? state.results.length;
    return state.results.slice(offset, offset + limit);
  }

  private async runAttack(state: AttackState): Promise<void> {
    const { config, attack } = state;

    attack.status = "running";
    attack.startedAt = Date.now();
    this.emit("started", attack);

    logger.info(
      `Starting attack ${attack.id}: ${config.attackType} with ${attack.totalRequests} requests`,
    );

    const iterator = createIterator(config);
    const concurrency = Math.min(config.options.concurrency, 20);
    const delayMs = config.options.delayMs;

    try {
      const pending: Promise<void>[] = [];

      for (const combination of iterator) {
        if (state.abortController.signal.aborted) break;

        // Handle pause
        if (state.paused) {
          await new Promise<void>((resolve) => {
            state.pauseResolve = resolve;
          });
          if (state.abortController.signal.aborted) break;
        }

        // Manage concurrency
        if (pending.length >= concurrency) {
          await Promise.race(pending);
        }

        const task = this.executeRequest(state, combination.payloads, combination.index);
        const tracked = task.then(() => {
          const idx = pending.indexOf(tracked);
          if (idx >= 0) pending.splice(idx, 1);
        });
        pending.push(tracked);

        // Apply delay between requests
        if (delayMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Wait for remaining pending requests
      await Promise.all(pending);

      if (!state.abortController.signal.aborted) {
        attack.status = "completed";
        attack.completedAt = Date.now();
        logger.info(
          `Attack ${attack.id} completed: ${attack.completedRequests}/${attack.totalRequests}`,
        );
        this.emit("completed", attack);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (!state.abortController.signal.aborted) {
        attack.status = "completed";
        attack.completedAt = Date.now();
        logger.error(`Attack ${attack.id} error: ${error}`);
        this.emit("error", attack.id, error);
      }
    }
  }

  private async executeRequest(
    state: AttackState,
    payloads: Record<string, string>,
    requestIndex: number,
  ): Promise<void> {
    const { config, attack } = state;
    const start = Date.now();

    const payloadMap = new Map(Object.entries(payloads));
    const renderedRaw = renderRequest(
      config.baseRequest,
      config.positions,
      payloadMap,
    );

    let response: IntruderResponse | null = null;
    let error: string | null = null;

    try {
      const parsed = parseRawRequest(renderedRaw);
      const entry = await sendRequest(parsed, {
        timeout: config.options.timeout,
        followRedirects: config.options.followRedirects,
      });

      if (entry.error) {
        error = entry.error;
      } else if (entry.response) {
        response = {
          statusCode: entry.response.statusCode,
          statusMessage: entry.response.statusMessage,
          headers: entry.response.headers,
          body: entry.response.body,
          contentLength: entry.response.contentLength,
        };
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const duration = Date.now() - start;

    const result: IntruderResult = {
      id: randomUUID(),
      configId: config.id,
      requestIndex,
      payloads,
      request: renderedRaw,
      response,
      duration,
      error,
      timestamp: Date.now(),
    };

    state.results.push(result);
    attack.completedRequests++;

    this.emit("result", result);

    if (attack.completedRequests % this.progressInterval === 0) {
      this.emit("progress", attack);
    }

    if (error && config.options.stopOnError) {
      state.abortController.abort();
    }
  }
}
