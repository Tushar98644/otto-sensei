import { DEFAULT_FILTERS, type JobFilters } from "@/lib/job-feed/types";

export type FilterMemory = {
  q: string;
  postedWithin: JobFilters["postedWithin"];
  eligibleOnly: boolean;
  resumeId: string | null;
};

export const NO_MEMORY: FilterMemory = {
  q: "",
  postedWithin: null,
  eligibleOnly: false,
  resumeId: null,
};

// Kept in step with JobFiltersSchema's longest search.
const QUERY_CHARS = 100;
const ID_CHARS = 64;

export function parseFilterMemory(raw: unknown): FilterMemory {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return NO_MEMORY;
  const value = raw as Record<string, unknown>;
  const resumeId = value.resumeId;
  return {
    q: typeof value.q === "string" ? value.q.trim().slice(0, QUERY_CHARS) : "",
    postedWithin: value.postedWithin === 7 || value.postedWithin === 30 ? value.postedWithin : null,
    eligibleOnly: value.eligibleOnly === true,
    resumeId:
      typeof resumeId === "string" && resumeId.length > 0 && resumeId.length <= ID_CHARS
        ? resumeId
        : null,
  };
}

// Role, level and place come from the Looking for line, so the request never narrows by them.
export function memoryFilters(
  memory: FilterMemory,
  { remote, profileReady }: { remote: boolean; profileReady: boolean },
): JobFilters {
  return {
    ...DEFAULT_FILTERS,
    q: memory.q,
    postedWithin: memory.postedWithin,
    eligibleOnly: profileReady && memory.eligibleOnly,
    remote,
  };
}

export function searchedOrNarrowed(filters: JobFilters): boolean {
  return filters.q !== "" || filters.postedWithin !== null || filters.eligibleOnly;
}

export function activeFilterCount(filters: JobFilters): number {
  return [filters.postedWithin !== null, filters.remote, filters.eligibleOnly].filter(Boolean)
    .length;
}

export const CLEARED: Pick<FilterMemory, "q" | "postedWithin" | "eligibleOnly"> = {
  q: "",
  postedWithin: null,
  eligibleOnly: false,
};
