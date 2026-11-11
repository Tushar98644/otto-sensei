import type { z } from "zod";
import type { AccountSetupChangeSchema } from "./validation";

// What the list ticks off is read from the real settings, never stored here.

export const SETUP_STEP_OUTCOMES = ["saved", "skipped"] as const;
export type SetupStepOutcome = (typeof SETUP_STEP_OUTCOMES)[number];

export type AccountSetup = {
  stepAt: number | null;
  stepOutcome: SetupStepOutcome | null;
  checklistHiddenAt: number | null;
};

export const NO_SETUP: AccountSetup = { stepAt: null, stepOutcome: null, checklistHiddenAt: null };
export type AccountSetupChange = z.input<typeof AccountSetupChangeSchema>;

export type AccountSetupResponse = { ok: true; setup: AccountSetup };
