import type { z } from "zod";
import type {
  ImpressionBatchSchema,
  JobFiltersSchema,
  JobMatchesRequestSchema,
  LookingForChoiceSchema,
  LookingForSchema,
  MatchActionSchema,
  MatchProfileSchema,
} from "./validation";
import type { JobPosting } from "@/lib/api/types";
import type { PlaceGroup } from "@/lib/eligibility/places";

export const JOB_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
  "personio",
  "workday",
  "gem",
  "pinpoint",
  "jobvite",
  "himalayas",
  "remoteok",
  "jobicy",
  "usajobs",
] as const;
export type JobSourceId = (typeof JOB_SOURCES)[number];

export const BOARD_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
  "personio",
  "workday",
  "gem",
  "pinpoint",
  "jobvite",
] as const;
export type BoardSource = (typeof BOARD_SOURCES)[number];

export const FEED_SOURCES = ["himalayas", "remoteok", "jobicy", "usajobs"] as const;
export type FeedSource = (typeof FEED_SOURCES)[number];

export type BoardSeed = {
  ats: BoardSource;
  token: string;
  company: string;
  // Where a post that names no place is, for an employer that hires in one country only.
  place?: string;
};

export const SENIORITIES = ["intern", "junior", "mid", "senior", "lead", "director"] as const;
export type Seniority = (typeof SENIORITIES)[number];

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
export const NEAR_KM = [10, 25, 50, 100] as const;
export type NearKm = (typeof NEAR_KM)[number];
export const WORK_MODES = ["hybrid", "onsite"] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export type PostedWithin = (typeof POSTED_WITHIN)[number];

export const JOB_PAGE_SIZE = 20;
export const MAX_JOB_PAGE = 1_000;

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
  url: string;
  keywords: string[];
  closed: boolean;
};

export type MatchLabel = "strong" | "good" | "stretch";
export const MATCH_LABELS: Record<MatchLabel, string> = {
  strong: "Strong match",
  good: "Good match",
  stretch: "Stretch",
};

export type JobMatch = {
  label: MatchLabel | null;
  found: string[];
  missing: string[];
  reason: string;
  notes: string[];
  blocked: boolean;
};

// What a job card and the company panel say about the employer (companies.ts); no size or funding data is kept.
export type CompanySnapshot = {
  name: string;
  roles: number;
  remote: number;
  hybrid: number;
  // A job posted in the last HIRING_DAYS.
  hiring: boolean;
  // Where most of its open jobs are.
  city: CityLabel | null;
  careers: string | null;
};

export type CityLabel = { name: string; country: string; admin: string };

export type MapPin = {
  name: string;
  lat: number;
  lng: number;
  city: CityLabel;
  // Its openings in this list here, and all its open jobs.
  roles: number;
  total: number;
  hiring: boolean;
};

// `openings` the list has (up to the map's first 5,000), `placed` of them on a pin.
export type JobMapResponse = { ok: true; pins: MapPin[]; openings: number; placed: number };

export type CompanyJobsResponse = { ok: true; company: CompanySnapshot; jobs: FeedJob[] };

export type CityOption = CityLabel & { id: number };
export type CitySearchResponse = { ok: true; cities: CityOption[] };

export type MatchedJob = FeedJob & {
  match: JobMatch;
  saved: boolean;
  employer?: CompanySnapshot | null;
  otherPlaces: string[];
  morePlaces: number;
  visa: string[];
  position: number;
  // The ranking's parts for this job, logged with its impression (docs/matching.md "Feedback").
  features?: number[];
};

export const MATCH_FEATURES = 5;

export const MATCH_PROFILE_LIMITS = { skills: 200, titles: 12, titleChars: 200 } as const;
export type MatchProfile = z.output<typeof MatchProfileSchema>;

export const PLACE_GROUPS = [
  "north_america",
  "latam",
  "europe",
  "eu",
  "emea",
  "apac",
  "anz",
] as const satisfies readonly PlaceGroup[];

export type PlaceChoice = "anywhere" | `c:${string}` | `g:${PlaceGroup}`;

export const LOOKING_FOR_LIMITS = { titleChars: 80 } as const;

export const OCCUPATION_CODE = /^\d{2}-[0-9X]\d{3}\.\d{2}$/;
export type LookingFor = z.output<typeof LookingForSchema>;

export type OccupationOption = { code: string; name: string; group: string };
export type LookingForChoice = z.output<typeof LookingForChoiceSchema>;

export const NO_CHOICE: LookingForChoice = { role: null, level: null, place: null, remote: false };

export type LookingForResponse = { ok: true; choice: LookingForChoice };

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
  workMode: null,
  hiring: false,
  near: null,
};
export type JobMatchesRequestBody = z.input<typeof JobMatchesRequestSchema>;

export type JobMatchesResponse = {
  ok: true;
  jobs: MatchedJob[];
  page: number;
  pageSize: number;
  total: number;
  matching: number;
  capped: boolean;
  strong: number;
  newToday: number;
  savedCount: number;
  openJobs: number;
  checkedAt: number | null;
  profileReady: boolean;
  locked?: boolean;
  lookingFor: LookingFor | null;
  occupation?: OccupationOption | null;
  roles?: { title: string; family: RoleFamily | null; occupation: OccupationOption | null }[];
  variant: string;
  requestId: string | null;
  resumeHash: string | null;
};

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
export const ASKED_APPLIED_ANSWERS = ["yes", "not_yet"] as const;
export type AskedAppliedAnswer = (typeof ASKED_APPLIED_ANSWERS)[number];
export type MatchActionInput = z.input<typeof MatchActionSchema>;
export type ImpressionBatchInput = z.input<typeof ImpressionBatchSchema>;

export type JobPostResponse = {
  ok: true;
  job: FeedJob;
  text: string;
  posting?: Omit<JobPosting, "text"> | null;
};

export const SAVED_JOBS_LIMIT = 500;
export type SavedJobResponse = { ok: true; saved: boolean; savedCount: number };
export type SavedJob = FeedJob & { savedAt: number };

// What a saved job or an application keeps of its job, so it still shows once the job closes and goes.
export type JobSnapshot = Omit<FeedJob, "id" | "closed">;
export type SavedJobsResponse = { ok: true; jobs: SavedJob[] };
