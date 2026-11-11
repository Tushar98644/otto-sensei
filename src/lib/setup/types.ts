import type { z } from "zod";
import type { AccountSetupChangeSchema } from "./validation";

// Client-safe. The account's first-login setup (DESIGN.md, "First login and setup"): whether the
// one "Where can you work?" step was answered or skipped, and whether the Home "Get set up" list
// was hidden. What the list ticks off is read from the real settings, never stored here.

export const SETUP_STEP_OUTCOMES = ["saved", "skipped"] as const;
export type SetupStepOutcome = (typeof SETUP_STEP_OUTCOMES)[number];

export type AccountSetup = {
  // When the first-login step was closed, and how; null until then.
  stepAt: number | null;
  stepOutcome: SetupStepOutcome | null;
  // When "Hide this" was pressed on the Home list; null while it shows.
  checklistHiddenAt: number | null;
};

export const NO_SETUP: AccountSetup = { stepAt: null, stepOutcome: null, checklistHiddenAt: null };
export type AccountSetupChange = z.input<typeof AccountSetupChangeSchema>;

// GET and PUT /api/setup. Requires sign-in, any plan.
export type AccountSetupResponse = { ok: true; setup: AccountSetup };
