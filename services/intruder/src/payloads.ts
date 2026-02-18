import type { IntruderConfig, IntruderPayloadSet } from "./types.js";

export interface PayloadCombination {
  /** Map of position name to payload value */
  payloads: Record<string, string>;
  /** Overall request index (0-based) */
  index: number;
}

/**
 * Create a generator that yields payload combinations based on attack type.
 */
export function* createIterator(
  config: IntruderConfig,
): Generator<PayloadCombination> {
  const { attackType, positions, payloadSets } = config;

  if (positions.length === 0 || payloadSets.length === 0) {
    return;
  }

  switch (attackType) {
    case "sniper":
      yield* sniperIterator(config);
      break;
    case "battering_ram":
      yield* batteringRamIterator(config);
      break;
    case "pitchfork":
      yield* pitchforkIterator(config);
      break;
    case "cluster_bomb":
      yield* clusterBombIterator(config);
      break;
  }
}

/**
 * Calculate the total number of requests for a given config.
 */
export function calculateTotalRequests(config: IntruderConfig): number {
  const { attackType, positions, payloadSets } = config;

  if (positions.length === 0 || payloadSets.length === 0) return 0;

  switch (attackType) {
    case "sniper": {
      const payloads = payloadSets[0]?.payloads ?? [];
      return positions.length * payloads.length;
    }
    case "battering_ram": {
      const payloads = payloadSets[0]?.payloads ?? [];
      return payloads.length;
    }
    case "pitchfork": {
      const minLength = Math.min(
        ...payloadSets.slice(0, positions.length).map((s) => s.payloads.length),
      );
      return minLength;
    }
    case "cluster_bomb": {
      let total = 1;
      for (let i = 0; i < positions.length; i++) {
        const set = payloadSets[i] ?? payloadSets[0];
        total *= set.payloads.length;
      }
      return total;
    }
  }
}

/**
 * Sniper: for each position, iterate through all payloads.
 * Other positions keep their original values.
 */
function* sniperIterator(config: IntruderConfig): Generator<PayloadCombination> {
  const { positions, payloadSets } = config;
  const payloads = payloadSets[0]?.payloads ?? [];
  let index = 0;

  for (const position of positions) {
    const posName = position.name ?? position.id;
    for (const payload of payloads) {
      const combination: Record<string, string> = {};
      // Only set the current position's payload; others use empty string
      for (const pos of positions) {
        const name = pos.name ?? pos.id;
        combination[name] = pos.id === position.id ? payload : "";
      }
      yield { payloads: combination, index: index++ };
    }
  }
}

/**
 * Battering ram: iterate payloads, apply same payload to all positions simultaneously.
 */
function* batteringRamIterator(config: IntruderConfig): Generator<PayloadCombination> {
  const { positions, payloadSets } = config;
  const payloads = payloadSets[0]?.payloads ?? [];
  let index = 0;

  for (const payload of payloads) {
    const combination: Record<string, string> = {};
    for (const pos of positions) {
      combination[pos.name ?? pos.id] = payload;
    }
    yield { payloads: combination, index: index++ };
  }
}

/**
 * Pitchfork: zip payloads across positions (position N gets payload list N).
 */
function* pitchforkIterator(config: IntruderConfig): Generator<PayloadCombination> {
  const { positions, payloadSets } = config;
  const minLength = Math.min(
    ...payloadSets.slice(0, positions.length).map((s) => s.payloads.length),
  );
  let index = 0;

  for (let i = 0; i < minLength; i++) {
    const combination: Record<string, string> = {};
    for (let p = 0; p < positions.length; p++) {
      const pos = positions[p];
      const set = payloadSets[p] ?? payloadSets[0];
      combination[pos.name ?? pos.id] = set.payloads[i];
    }
    yield { payloads: combination, index: index++ };
  }
}

/**
 * Cluster bomb: cartesian product of all payload sets.
 */
function* clusterBombIterator(config: IntruderConfig): Generator<PayloadCombination> {
  const { positions, payloadSets } = config;
  const sets: IntruderPayloadSet[] = positions.map(
    (_, i) => payloadSets[i] ?? payloadSets[0],
  );

  const indices = new Array(positions.length).fill(0) as number[];
  let index = 0;

  while (true) {
    const combination: Record<string, string> = {};
    for (let p = 0; p < positions.length; p++) {
      combination[positions[p].name ?? positions[p].id] = sets[p].payloads[indices[p]];
    }
    yield { payloads: combination, index: index++ };

    // Increment indices (like a multi-digit counter)
    let carry = true;
    for (let p = positions.length - 1; p >= 0 && carry; p--) {
      indices[p]++;
      if (indices[p] < sets[p].payloads.length) {
        carry = false;
      } else {
        indices[p] = 0;
      }
    }

    if (carry) break; // All combinations exhausted
  }
}
