import { useState, useCallback, useMemo } from "react";
import type { IntruderResult } from "@0x0-gen/sdk";

export type SortField = "requestIndex" | "statusCode" | "duration" | "contentLength";
export type SortDirection = "asc" | "desc";

export interface ResultFilter {
  statusMin?: number;
  statusMax?: number;
  lengthMin?: number;
  lengthMax?: number;
  grep?: string;
}

export function useResults(results: IntruderResult[]) {
  const [sortField, setSortField] = useState<SortField>("requestIndex");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filter, setFilter] = useState<ResultFilter>({});
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filter.statusMin !== undefined) {
      filtered = filtered.filter(
        (r) => r.response && r.response.statusCode >= filter.statusMin!,
      );
    }
    if (filter.statusMax !== undefined) {
      filtered = filtered.filter(
        (r) => r.response && r.response.statusCode <= filter.statusMax!,
      );
    }
    if (filter.lengthMin !== undefined) {
      filtered = filtered.filter(
        (r) => r.response && r.response.contentLength >= filter.lengthMin!,
      );
    }
    if (filter.lengthMax !== undefined) {
      filtered = filtered.filter(
        (r) => r.response && r.response.contentLength <= filter.lengthMax!,
      );
    }
    if (filter.grep) {
      const term = filter.grep.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.response?.body?.toLowerCase().includes(term) ||
          r.request.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [results, filter]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "requestIndex":
          cmp = a.requestIndex - b.requestIndex;
          break;
        case "statusCode":
          cmp = (a.response?.statusCode ?? 0) - (b.response?.statusCode ?? 0);
          break;
        case "duration":
          cmp = a.duration - b.duration;
          break;
        case "contentLength":
          cmp =
            (a.response?.contentLength ?? 0) -
            (b.response?.contentLength ?? 0);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredResults, sortField, sortDirection]);

  const selectedResult = useMemo(
    () => results.find((r) => r.id === selectedResultId) ?? null,
    [results, selectedResultId],
  );

  return {
    sortField,
    sortDirection,
    filter,
    setFilter,
    toggleSort,
    sortedResults,
    filteredResults,
    selectedResultId,
    setSelectedResultId,
    selectedResult,
  };
}
