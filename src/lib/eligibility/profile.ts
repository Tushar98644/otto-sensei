import { z } from "zod";
import type { LookingForChoice } from "@/lib/job-feed/types";
import { isCountryCode } from "./places";

// Client-safe. The work profile: the few facts that decide whether a job can hire someone from
// where they are. One per account (work_profiles), edited on the Account page.

export const WORK_REGIONS = ["us", "uk", "eu", "ca"] as const;
export type WorkRegion = (typeof WORK_REGIONS)[number];

export const REGION_LABELS: Record<WorkRegion, string> = {
  us: "United States",
  uk: "United Kingdom",
  eu: "European Union",
  ca: "Canada",
};

// In a sentence: "you said you can work in the US".
export const REGION_NAMES: Record<WorkRegion, string> = {
  us: "the US",
  uk: "the UK",
  eu: "the EU",
  ca: "Canada",
};

// "authorized": may work there without an employer sponsoring a visa (a citizen, a resident, or a
// visa that already allows it). "sponsorship": would need one.
export const WORK_RIGHTS = ["authorized", "sponsorship"] as const;
export type WorkRight = (typeof WORK_RIGHTS)[number];

export type WorkRights = Record<WorkRegion, WorkRight | null>;

export type WorkProfile = {
  // ISO 3166-1 alpha-2 code of where the person lives, e.g. "DE". "" when not set.
  country: string;
  // IANA time zone, e.g. "Europe/Berlin". "" when not set.
  timeZone: string;
  // null: not answered.
  rights: WorkRights;
  fullTime: boolean;
  contract: boolean;
  // Only remote jobs: the Jobs tab's default filter. Optional so profiles built before it parse.
  remoteOnly?: boolean;
};

export function emptyWorkProfile(): WorkProfile {
  return {
    country: "",
    timeZone: "",
    rights: { us: null, uk: null, eu: null, ca: null },
    fullTime: true,
    contract: true,
    remoteOnly: false,
  };
}

/** A time zone this runtime can format times in, e.g. "America/New_York". */
export function isTimeZone(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const RightSchema = z.enum(WORK_RIGHTS).nullable();

// PUT /api/profile body.
export const WorkProfileSchema = z
  .object({
    country: z
      .string()
      .max(2)
      .refine((code) => code === "" || isCountryCode(code), "Pick a country from the list."),
    timeZone: z
      .string()
      .max(64)
      .refine((zone) => zone === "" || isTimeZone(zone), "Pick a time zone from the list."),
    rights: z.object({ us: RightSchema, uk: RightSchema, eu: RightSchema, ca: RightSchema }),
    fullTime: z.boolean(),
    contract: z.boolean(),
    // Older clients don't send it; they keep whatever is saved (see saveWorkProfile).
    remoteOnly: z.boolean().optional(),
  })
  .refine((profile) => profile.fullTime || profile.contract, {
    message: "Pick full-time, contract or both.",
    path: ["fullTime"],
  });

export type WorkProfileBody = z.input<typeof WorkProfileSchema>;

// GET and PUT /api/profile. updatedAt is null until the profile is first saved. lookingFor: the
// parts of the Jobs tab's "Looking for" card the person changed (job-feed/looking-for.ts).
export type WorkProfileResponse = {
  ok: true;
  profile: WorkProfile;
  updatedAt: number | null;
  lookingFor?: LookingForChoice;
};

/** How much of the profile the eligibility check can use. */
export function isProfileStarted(profile: WorkProfile): boolean {
  return (
    profile.country !== "" ||
    profile.timeZone !== "" ||
    WORK_REGIONS.some((region) => profile.rights[region] !== null)
  );
}
