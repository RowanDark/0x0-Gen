import type { ReconEntity } from "@0x0-gen/contracts";

export interface DedupeResult {
  new: ReconEntity[];
  updated: ReconEntity[];
  duplicates: number;
}

export function deduplicate(
  newEntities: ReconEntity[],
  existingEntities: ReconEntity[],
): DedupeResult {
  const existingMap = new Map<string, ReconEntity>();
  for (const entity of existingEntities) {
    const key = `${entity.type}:${entity.normalizedValue}`;
    existingMap.set(key, entity);
  }

  const result: DedupeResult = {
    new: [],
    updated: [],
    duplicates: 0,
  };

  for (const entity of newEntities) {
    const key = `${entity.type}:${entity.normalizedValue}`;
    const existing = existingMap.get(key);

    if (existing) {
      result.duplicates++;
      // Merge: update lastSeen, merge sources, merge attributes
      const mergedSources = [...new Set([...existing.sources, ...entity.sources])];
      const mergedAttributes = { ...existing.attributes, ...entity.attributes };
      const updatedEntity: ReconEntity = {
        ...existing,
        lastSeen: Math.max(existing.lastSeen, entity.lastSeen),
        sources: mergedSources,
        attributes: mergedAttributes,
        confidence: Math.max(existing.confidence, entity.confidence),
      };
      result.updated.push(updatedEntity);
    } else {
      result.new.push(entity);
      // Track this new entity so subsequent duplicates within the same batch are caught
      existingMap.set(key, entity);
    }
  }

  return result;
}
