import { randomUUID } from "node:crypto";
import type { IntruderPosition } from "./types.js";

const MARKER = "\u00A7"; // § character

/**
 * Parse position markers from a base request string.
 * Markers are delimited by § characters: §value§
 * Escaped markers (\§) are treated as literal § characters.
 */
export function parsePositions(request: string): IntruderPosition[] {
  const positions: IntruderPosition[] = [];
  let i = 0;
  let posCount = 0;

  while (i < request.length) {
    // Check for escaped marker
    if (request[i] === "\\" && i + 1 < request.length && request[i + 1] === MARKER) {
      i += 2;
      continue;
    }

    if (request[i] === MARKER) {
      // Find closing marker
      const start = i;
      let j = i + 1;
      while (j < request.length) {
        if (request[j] === "\\" && j + 1 < request.length && request[j + 1] === MARKER) {
          j += 2;
          continue;
        }
        if (request[j] === MARKER) {
          break;
        }
        j++;
      }

      if (j < request.length && request[j] === MARKER) {
        posCount++;
        positions.push({
          id: randomUUID(),
          start,
          end: j + 1,
          name: `pos${posCount}`,
        });
        i = j + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return positions;
}

/**
 * Strip position markers from a request string, returning the clean text.
 */
export function stripMarkers(request: string): string {
  let result = "";
  let i = 0;

  while (i < request.length) {
    if (request[i] === "\\" && i + 1 < request.length && request[i + 1] === MARKER) {
      result += MARKER;
      i += 2;
      continue;
    }
    if (request[i] === MARKER) {
      i++;
      continue;
    }
    result += request[i];
    i++;
  }

  return result;
}

/**
 * Extract the text content between position markers.
 */
export function getPositionValue(request: string, position: IntruderPosition): string {
  // Content between the two § markers
  return request.slice(position.start + 1, position.end - 1);
}
