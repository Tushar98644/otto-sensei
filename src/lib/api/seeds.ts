import type { ApplicationsResponse } from "@/lib/api/types";
import type { KnownResumes, ResumeList } from "@/lib/sync/api-types";

// Reads the dashboard layout answers in the page itself, so a full page load doesn't wait to ask again.

export type SeedKey =
  | "notifications"
  | "workProfile"
  | "accountSetup"
  | "applications"
  | "reminderSettings"
  | "savedJobs"
  | "writings"
  | "interviewPacks"
  | "portfolio"
  | "shares"
  | "githubConnection"
  | "savedPosts"
  | "emailTracking"
  | "careerLog"
  | "resumeVersions"
  | "letteredApplications"
  | "applicationsNext";

// Each resolves to the route's own JSON answer, or null when the browser should ask the route itself.
export type ApiSeeds = Partial<Record<SeedKey, Promise<unknown>>>;

// The account's resumes as version numbers only (top 50 by edit, like POST /api/resumes).
export type ResumeVersions = {
  resumes: { id: string; updatedAt: number }[];
  deletedIds: string[];
};

// Which applications have a letter: all Home's What's working needs from the letters list.
export type LetteredApplications = { ids: string[] };

// The page of applications after the first, for accounts past one page, with the cursor it answers.
export type NextApplications = { cursor: string; page: ApplicationsResponse };

export const SEED_TTL_MS = 15_000;
// A seed still streaming after this is given up on, and the read goes to the network.
export const SEED_WAIT_MS = 4_000;

type Planted = { value: Promise<unknown>; until: number };

const planted = new Map<SeedKey, Planted>();
let closed = false;

// Once per page load, and never after a write: an answer from before it could be out of date.
export function plantSeeds(seeds: ApiSeeds, now = Date.now()): void {
  if (closed) return;
  closed = true;
  for (const [key, value] of Object.entries(seeds) as [SeedKey, Promise<unknown> | undefined][]) {
    if (!value) continue;
    const safe = Promise.resolve(value).catch(() => null);
    planted.set(key, { value: safe, until: now + SEED_TTL_MS });
  }
}

export function dropSeeds(): void {
  closed = true;
  planted.clear();
}

// The layout's answer for this read, used once; null means ask the network.
export function takeSeed(key: SeedKey, now = Date.now()): Promise<unknown> | null {
  const seed = planted.get(key);
  if (!seed) return null;
  planted.delete(key);
  if (now > seed.until) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const giveUp = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SEED_WAIT_MS);
  });
  return Promise.race([seed.value, giveUp]).finally(() => clearTimeout(timer));
}

// What POST /api/resumes would answer when the browser already holds every listed version.
export function listFromVersions(versions: ResumeVersions, known: KnownResumes): ResumeList | null {
  if (versions.resumes.some(({ id, updatedAt }) => known[id] !== updatedAt)) return null;
  return {
    ok: true,
    resumes: [],
    deletedIds: versions.deletedIds,
    unchanged: versions.resumes.map(({ id }) => id),
  };
}

export function resetSeedsForTests(): void {
  planted.clear();
  closed = false;
}
