import type { IntruderPosition } from "./types.js";

/**
 * Render a base request by replacing each position marker with its assigned payload.
 * Positions must not overlap — an error is thrown if they do.
 */
export function renderRequest(
  baseRequest: string,
  positions: IntruderPosition[],
  payloads: Map<string, string>,
): string {
  if (positions.length === 0) return baseRequest;

  // Sort positions by start index
  const sorted = [...positions].sort((a, b) => a.start - b.start);

  // Check for overlapping positions
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      throw new Error(
        `Overlapping positions: "${sorted[i - 1].name ?? sorted[i - 1].id}" and "${sorted[i].name ?? sorted[i].id}"`,
      );
    }
  }

  // Build the result by replacing each position with its payload
  let result = "";
  let lastEnd = 0;

  for (const pos of sorted) {
    // Append text before this position
    result += baseRequest.slice(lastEnd, pos.start);

    // Replace position with payload
    const name = pos.name ?? pos.id;
    const payload = payloads.get(name) ?? "";
    result += payload;

    lastEnd = pos.end;
  }

  // Append remaining text after last position
  result += baseRequest.slice(lastEnd);

  return result;
}
