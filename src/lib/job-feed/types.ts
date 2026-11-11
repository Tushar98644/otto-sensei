import type { z } from "zod";
import type {
  JobFiltersSchema,
  JobMatchesRequestSchema,
  LookingForChoiceSchema,
  LookingForSchema,
  MatchActionSchema,
  MatchProfileSchema,
} from "./validation";
import type { JobPosting } from "@/lib/api/types";
import type { PlaceGroup } from "@/lib/eligibility/places";

// Client-safe. Openings read every day from public job boards (JOB-SOURCES.md), shown on the Jobs
// tab matched to a resume and on the public /jobs page. Matching is rule-based and runs on our
// server for free: nothing here ever reaches the AI.

export const JOB_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
  "personio",
  "himalayas",
  "remoteok",
  "jobicy",
] as const;
export type JobSourceId = (typeof JOB_SOURCES)[number];

// Company job boards: one board per company, read whole each time.
export const BOARD_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
  "personio",
] as const;
export type BoardSource = (typeof BOARD_SOURCES)[number];

// Feeds: many companies' newest jobs, read once a day.
export const FEED_SOURCES = ["himalayas", "remoteok", "jobicy"] as const;
export type FeedSource = (typeof FEED_SOURCES)[number];

export type BoardSeed = { ats: BoardSource; token: string; company: string };

export const SENIORITIES = ["intern", "junior", "mid", "senior", "lead", "director"] as const;
export type Seniority = (typeof SENIORITIES)[number];

// What the seniority filter offers; each covers one or two stored levels.
export const LEVELS = ["entry", "mid", "senior", "lead"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_SENIORITIES: Record<Level, readonly Seniority[]> = {
  entry: ["intern", "junior"],
  mid: ["mid"],
  senior: ["senior"],
  lead: ["lead", "director"],
};
export const LEVEL_LABELS: Record<Level, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead and above",
};

export const ROLE_FAMILIES = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "people",
  "finance",
  "legal",
] as const;
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
export const ROLE_LABELS: Record<RoleFamily, string> = {
  engineering: "Engineering",
  data: "Data and AI",
  design: "Design",
  product: "Product",
  marketing: "Marketing",
  sales: "Sales",
  support: "Customer support",
  operations: "Operations",
  people: "People and recruiting",
  finance: "Finance",
  legal: "Legal",
};

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

export const POSTED_WITHIN = [7, 30] as const;
export type PostedWithin = (typeof POSTED_WITHIN)[number];

export const JOB_PAGE_SIZE = 20;
// Pages past this are refused: nobody reads 1,000 jobs, and it bounds what a request can ask for.
export const MAX_JOB_PAGE = 50;

/** One opening as the list shows it. Dates are epoch ms. */
export type FeedJob = {
  id: string;
  source: JobSourceId;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  employmentType: EmploymentType | null;
  seniority: Seniority;
  postedAt: number;
  // The original posting: where "Open job" goes, and what the tailor flow reads.
  url: string;
  // Tools and skills found in the post by rules (./skills.ts), at most 40.
  keywords: string[];
  // Closed jobs only show up among saved ones.
  closed: boolean;
};

export type MatchLabel = "strong" | "good" | "stretch";
export const MATCH_LABELS: Record<MatchLabel, string> = {
  strong: "Strong match",
  good: "Good match",
  stretch: "Stretch",
};

export type JobMatch = {
  // null: a saved job that shares nothing with this resume.
  label: MatchLabel | null;
  found: string[];
  missing: string[];
  // "Found in your resume: React, NestJS, TypeScript. Not found: Kubernetes."
  reason: string;
  // Smaller lines under the reason: years asked for, a step up in level, a work-rights rule.
  notes: string[];
  // The post has a rule the work profile says this person can't meet (see @/lib/eligibility).
  blocked: boolean;
};

export type MatchedJob = FeedJob & {
  match: JobMatch;
  saved: boolean;
  // Other places the same opening is posted (location copies shown as one card), at most 2, and
  // how many more: "Remote UK, Remote Canada (+2)".
  otherPlaces: string[];
  morePlaces: number;
  // Facts about the company from public visa registers, as card lines ("Listed as a UK visa
  // sponsor"). Never a promise about this job (visa.ts).
  visa: string[];
  // 1-based place in the whole ranked list, for match_events.
  position: number;
};

// What the browser sends about the resume: the skills the shared vocabulary found in it, its job
// titles and its years of experience. Never the resume itself, its lines or contact details.
export const MATCH_PROFILE_LIMITS = { skills: 200, titles: 12, titleChars: 200 } as const;
export type MatchProfile = z.output<typeof MatchProfileSchema>;

// The "Looking for" card (looking-for.ts has the guess and the place rules).
export const PLACE_GROUPS = [
  "north_america",
  "latam",
  "europe",
  "eu",
  "emea",
  "apac",
  "anz",
] as const satisfies readonly PlaceGroup[];

// "anywhere", a country ("c:US") or a group of countries ("g:eu").
export type PlaceChoice = "anywhere" | `c:${string}` | `g:${PlaceGroup}`;

export const LOOKING_FOR_LIMITS = { titleChars: 80 } as const;

// An O*NET-SOC 2019 occupation code ("29-1141.00"), or one of ours with a letter ("11-X101.00");
// see occupations/index.ts.
export const OCCUPATION_CODE = /^\d{2}-[0-9X]\d{3}\.\d{2}$/;
export type LookingFor = z.output<typeof LookingForSchema>;

/** One occupation as the card shows it: "Registered Nurse", in "Healthcare practitioners". */
export type OccupationOption = { code: string; name: string; group: string };
export type LookingForChoice = z.output<typeof LookingForChoiceSchema>;

export const NO_CHOICE: LookingForChoice = { role: null, level: null, place: null, remote: false };

// PUT /api/jobs/looking-for. Free and Pro alike: the card shapes Free's closest matches too.
export type LookingForResponse = { ok: true; choice: LookingForChoice };

// GET /api/jobs/occupations?q=nurse: the card's search over every occupation and its names.
export type OccupationSearchResponse = { ok: true; occupations: OccupationOption[] };
export type JobFilters = z.output<typeof JobFiltersSchema>;
export type JobFiltersInput = z.input<typeof JobFiltersSchema>;

export const DEFAULT_FILTERS: JobFilters = {
  q: "",
  remote: false,
  place: "",
  role: null,
  level: null,
  postedWithin: null,
  eligibleOnly: false,
};
export type JobMatchesRequestBody = z.input<typeof JobMatchesRequestSchema>;

export type JobMatchesResponse = {
  ok: true;
  jobs: MatchedJob[];
  page: number;
  pageSize: number;
  // Jobs to page through (the best CANDIDATE_POOL at most), and how many of them are strong or
  // first seen today.
  total: number;
  // Every open job that matches the resume, location copies counted once. Above `total` when
  // there are more than one request ranks (`capped`).
  matching: number;
  capped: boolean;
  strong: number;
  newToday: number;
  savedCount: number;
  // Open jobs in the whole list, and when the boards were last read.
  openJobs: number;
  checkedAt: number | null;
  // The work profile has something the eligibility rules can use.
  profileReady: boolean;
  // Free: the closest FREE_JOB_MATCHES only, ranked with no filters and no work profile;
  // `matching` still counts them all.
  locked?: boolean;
  // The "Looking for" card this list was ranked for, and its occupation in plain words.
  lookingFor: LookingFor | null;
  occupation?: OccupationOption | null;
  // The resume's roles, newest first, with the occupation each names (the card's role menu).
  roles?: { title: string; family: RoleFamily | null; occupation: OccupationOption | null }[];
  // Which ordering made this list, and the ids actions are logged against (null when nothing
  // is logged: Free's preview and the saved view).
  variant: string;
  requestId: string | null;
  resumeHash: string | null;
};

// What the Jobs tab records to measure match quality (match_events). Impressions are written by
// the server for each page of matches; the rest are sent by the page when they happen.
export const MATCH_EVENT_KINDS = [
  "impression",
  "open",
  "save",
  "tailor",
  "applied",
  "not_fit",
  "asked_applied",
] as const;
export type MatchEventKind = (typeof MATCH_EVENT_KINDS)[number];
export const NOT_FIT_REASONS = ["role", "level", "place", "skills", "other"] as const;
export type NotFitReason = (typeof NOT_FIT_REASONS)[number];
export const NOT_FIT_LABELS: Record<NotFitReason, string> = {
  role: "Wrong kind of role",
  level: "Wrong level",
  place: "Wrong place",
  skills: "Wrong skills",
  other: "Something else",
};
// The answer to "Applied to <company>?", asked when someone comes back after opening a job.
export const ASKED_APPLIED_ANSWERS = ["yes", "not_yet"] as const;
export type AskedAppliedAnswer = (typeof ASKED_APPLIED_ANSWERS)[number];
export type MatchActionInput = z.input<typeof MatchActionSchema>;

// GET /api/jobs/:id. Requires sign-in: the stored text, for the tailor flow. posting: what reading
// the post from its source said besides the text, the same as reading the job's link would; null
// (or missing, from a day-old cache) when the text wasn't read from the source.
export type JobPostResponse = {
  ok: true;
  job: FeedJob;
  text: string;
  posting?: Omit<JobPosting, "text"> | null;
};

// PUT/DELETE /api/jobs/saved/:id. Requires sign-in.
export const SAVED_JOBS_LIMIT = 500;
export type SavedJobResponse = { ok: true; saved: boolean; savedCount: number };
// GET /api/jobs/saved: the account's saved jobs, newest save first, closed ones included.
export type SavedJob = FeedJob & { savedAt: number };
export type SavedJobsResponse = { ok: true; jobs: SavedJob[] };
