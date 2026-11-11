import type { z } from "zod";
import type { WorkProfileSchema } from "./validation";
import type { LookingForChoice } from "@/lib/job-feed/types";

export const WORK_REGIONS = ["us", "uk", "eu", "ca"] as const;
export type WorkRegion = (typeof WORK_REGIONS)[number];

export const REGION_LABELS: Record<WorkRegion, string> = {
  us: "United States",
  uk: "United Kingdom",
  eu: "European Union",
  ca: "Canada",
};

export const REGION_NAMES: Record<WorkRegion, string> = {
  us: "the US",
  uk: "the UK",
  eu: "the EU",
  ca: "Canada",
};

export const WORK_RIGHTS = ["authorized", "sponsorship"] as const;
export type WorkRight = (typeof WORK_RIGHTS)[number];

export type WorkRights = Record<WorkRegion, WorkRight | null>;

export type WorkProfile = {
  country: string;
  timeZone: string;
  rights: WorkRights;
  fullTime: boolean;
  contract: boolean;
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

export function isTimeZone(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export type WorkProfileBody = z.input<typeof WorkProfileSchema>;

export type WorkProfileResponse = {
  ok: true;
  profile: WorkProfile;
  updatedAt: number | null;
  lookingFor?: LookingForChoice;
};

export function isProfileStarted(profile: WorkProfile): boolean {
  return (
    profile.country !== "" ||
    profile.timeZone !== "" ||
    WORK_REGIONS.some((region) => profile.rights[region] !== null)
  );
}
