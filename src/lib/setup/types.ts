import type { z } from "zod";
import type { WorkProfile, WorkRegion } from "@/lib/eligibility/profile";
import type { LookingForChoice } from "@/lib/job-feed/types";
import type { AccountSetupChangeSchema, SetupDefaultsSchema } from "./validation";

export const SETUP_STEP_OUTCOMES = ["saved", "skipped"] as const;
export type SetupStepOutcome = (typeof SETUP_STEP_OUTCOMES)[number];

export const COUNTRY_SOURCES = ["resume", "device"] as const;
export type CountrySource = (typeof COUNTRY_SOURCES)[number];

export type SetupGuess = { country: string; from: CountrySource; region: WorkRegion | null };

export type AccountSetup = {
  stepAt: number | null;
  stepOutcome: SetupStepOutcome | null;
  checklistHiddenAt: number | null;
  defaultsAt: number | null;
  lookingForAt: number | null;
  guess: SetupGuess | null;
};

export const NO_SETUP: AccountSetup = {
  stepAt: null,
  stepOutcome: null,
  checklistHiddenAt: null,
  defaultsAt: null,
  lookingForAt: null,
  guess: null,
};
export type AccountSetupChange = z.input<typeof AccountSetupChangeSchema>;

export type AccountSetupResponse = { ok: true; setup: AccountSetup };

export type SetupDefaults = z.input<typeof SetupDefaultsSchema>;

export type SetupDefaultsResponse = {
  ok: true;
  setup: AccountSetup;
  profile: WorkProfile;
  updatedAt: number | null;
  lookingFor: LookingForChoice;
};
