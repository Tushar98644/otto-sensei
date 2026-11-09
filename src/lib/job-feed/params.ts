import { DEFAULT_FILTERS, JobFiltersSchema, MAX_JOB_PAGE, type JobFilters } from "./types";

// Client-safe. The public /jobs page keeps its filters in the address, so a filtered list can be
// shared and works without JavaScript (a plain GET form). Anything that doesn't parse is dropped.

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, name: string): string {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function filtersFromParams(params: Params): { filters: JobFilters; page: number } {
  const posted = one(params, "posted");
  const raw = {
    q: one(params, "q").slice(0, 100),
    place: one(params, "place").slice(0, 60),
    remote: one(params, "remote") === "1",
    role: one(params, "role") || null,
    level: one(params, "level") || null,
    postedWithin: posted === "7" ? (7 as const) : posted === "30" ? (30 as const) : null,
    eligibleOnly: false,
  };
  const parsed = JobFiltersSchema.safeParse(raw);
  const filters = parsed.success
    ? parsed.data
    : { ...DEFAULT_FILTERS, q: raw.q, place: raw.place, remote: raw.remote, postedWithin: raw.postedWithin };
  const page = Number.parseInt(one(params, "page"), 10);
  return { filters, page: Number.isInteger(page) && page >= 1 && page <= MAX_JOB_PAGE ? page : 1 };
}

/** "?q=react&remote=1&page=2", or "" for the plain list. */
export function paramsFromFilters(filters: JobFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.place) params.set("place", filters.place);
  if (filters.remote) params.set("remote", "1");
  if (filters.role) params.set("role", filters.role);
  if (filters.level) params.set("level", filters.level);
  if (filters.postedWithin) params.set("posted", String(filters.postedWithin));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function isFiltered(filters: JobFilters): boolean {
  return paramsFromFilters(filters) !== "";
}
