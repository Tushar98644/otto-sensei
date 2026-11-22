import type { ApplicationStatus } from "@/lib/applications/status";

// Your week with Otto: one Monday-to-Sunday week, counted on the server from the person's own data.

export const RECAP_VERSION = 1;
// Weeks kept, and offered under "Earlier weeks", besides the newest.
export const RECAP_EARLIER_WEEKS = 8;
export const RECAP_MOVES = 3;
export const RECAP_STEPS = 3;

// A week is named by its Monday, YYYY-MM-DD.
export type RecapWeekId = string;

export type RecapCounts = { applications: number; tailored: number; letters: number };

export type RecapEffort = RecapCounts & {
  // Answers and outreach messages.
  messages: number;
  preps: number;
  // Null when the account didn't exist yet the week before.
  last: RecapCounts | null;
};

export type RecapMove = {
  company: string;
  role: string;
  // Where it stood before the week, then each step forward it took during it.
  path: ApplicationStatus[];
};

export type RecapMomentum = {
  // Applications that heard back, a no included.
  replies: number;
  interviews: number;
  offers: number;
  moves: RecapMove[];
};

// Views counted since `since`; `since` is null when there's no earlier count, so `views` is the total so far.
export type RecapViews = { views: number; since: number | null };

export type RecapAttention = { share: RecapViews | null; portfolio: RecapViews | null };

export type RecapWorking =
  | { kind: "finding"; lead: string; mark: string; tail: string; rest: string }
  | { kind: "line"; text: string };

export type RecapJobs = {
  // New matches posted that week; null when Otto couldn't rank jobs for that week.
  matches: number | null;
  // Pro only, as on the Jobs tab.
  best: { title: string; company: string } | null;
  saved: number;
};

export type RecapStep =
  | { kind: "prep"; company: string; href: string; at: number }
  | { kind: "follow_up"; company: string; href: string }
  | { kind: "tailor"; company: string; title: string; href: string }
  | { kind: "jobs"; href: string }
  | { kind: "log"; href: string }
  | { kind: "upload"; href: string };

export type RecapTotals = { shareViews: number; portfolioViews: number };

export type Recap = {
  version: typeof RECAP_VERSION;
  week: RecapWeekId;
  pro: boolean;
  quiet: boolean;
  effort: RecapEffort;
  momentum: RecapMomentum;
  attention: RecapAttention;
  working: RecapWorking | null;
  jobs: RecapJobs | null;
  // The days that week, YYYY-MM-DD, the person used Otto.
  activeDays: RecapWeekId[];
  next: RecapStep[];
  // The view counts when this was built, so next week can count from them.
  totals: RecapTotals;
  builtAt: number;
};

// An earlier week in the list: its most telling fact, or null for a quiet one.
export type RecapListing = { week: RecapWeekId; headline: string | null };

export type RecapIndex = {
  // The week that ended last, when there's one to show.
  current: { recap: Recap; seen: boolean } | null;
  earlier: RecapListing[];
};

export type RecapIndexResponse = { ok: true } & RecapIndex;
export type RecapResponse = { ok: true; recap: Recap };
export type RecapSeenResponse = { ok: true };
