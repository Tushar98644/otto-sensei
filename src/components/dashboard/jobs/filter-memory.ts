import {
  DEFAULT_FILTERS,
  NEAR_KM,
  WORK_MODES,
  type CityOption,
  type JobFilters,
  type NearKm,
  type WorkMode,
} from "@/lib/job-feed/types";

export type FilterMemory = {
  q: string;
  postedWithin: JobFilters["postedWithin"];
  eligibleOnly: boolean;
  resumeId: string | null;
  workMode: WorkMode | null;
  hiring: boolean;
  // A city is kept; the person's own location never is (it lives in the page while it's open).
  nearCity: CityOption | null;
  nearKm: NearKm;
};

export const DEFAULT_NEAR_KM: NearKm = 25;

export const NO_MEMORY: FilterMemory = {
  q: "",
  postedWithin: null,
  eligibleOnly: false,
  resumeId: null,
  workMode: null,
  hiring: false,
  nearCity: null,
  nearKm: DEFAULT_NEAR_KM,
};

// Kept in step with JobFiltersSchema's longest search.
const QUERY_CHARS = 100;
const ID_CHARS = 64;
const NAME_CHARS = 200;

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max ? value : null;

function cityOf(raw: unknown): CityOption | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = value.id;
  const name = text(value.name, NAME_CHARS);
  const country = text(value.country, 2);
  const admin = text(value.admin, 20);
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
  return name && country !== null && admin !== null ? { id, name, country, admin } : null;
}

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
    workMode: (WORK_MODES as readonly unknown[]).includes(value.workMode)
      ? (value.workMode as WorkMode)
      : null,
    hiring: value.hiring === true,
    nearCity: cityOf(value.nearCity),
    nearKm: (NEAR_KM as readonly unknown[]).includes(value.nearKm)
      ? (value.nearKm as NearKm)
      : DEFAULT_NEAR_KM,
  };
}

export type Point = { lat: number; lng: number };

// About 1 km: all a nearby search needs, and all that leaves the browser.
export const roundPoint = (point: Point): Point => ({
  lat: Math.round(point.lat * 100) / 100,
  lng: Math.round(point.lng * 100) / 100,
});

// Role, level and place come from the Looking for line, so the request never narrows by them.
export function memoryFilters(
  memory: FilterMemory,
  {
    remote,
    profileReady,
    point = null,
  }: { remote: boolean; profileReady: boolean; point?: Point | null },
): JobFilters {
  const near = point
    ? { city: null, ...roundPoint(point), km: memory.nearKm }
    : memory.nearCity
      ? { city: memory.nearCity.id, lat: null, lng: null, km: memory.nearKm }
      : null;
  return {
    ...DEFAULT_FILTERS,
    q: memory.q,
    postedWithin: memory.postedWithin,
    eligibleOnly: profileReady && memory.eligibleOnly,
    remote,
    workMode: remote ? null : memory.workMode,
    hiring: memory.hiring,
    near,
  };
}

export function searchedOrNarrowed(filters: JobFilters): boolean {
  return (
    filters.q !== "" ||
    filters.postedWithin !== null ||
    filters.eligibleOnly ||
    filters.workMode !== null ||
    filters.hiring ||
    filters.near !== null
  );
}

export function activeFilterCount(filters: JobFilters): number {
  return [
    filters.postedWithin !== null,
    filters.remote || filters.workMode !== null,
    filters.eligibleOnly,
    filters.hiring,
    filters.near !== null,
  ].filter(Boolean).length;
}

export const CLEARED: Pick<
  FilterMemory,
  "q" | "postedWithin" | "eligibleOnly" | "workMode" | "hiring" | "nearCity"
> = {
  q: "",
  postedWithin: null,
  eligibleOnly: false,
  workMode: null,
  hiring: false,
  nearCity: null,
};
