import { z } from "zod";

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

// PUT /api/setup changes only what it sends. "shown" undoes "Hide this".
export const AccountSetupChangeSchema = z
  .object({
    step: z.enum(SETUP_STEP_OUTCOMES).optional(),
    checklist: z.enum(["hidden", "shown"]).optional(),
  })
  .refine((body) => body.step !== undefined || body.checklist !== undefined, "Nothing to change.");
export type AccountSetupChange = z.input<typeof AccountSetupChangeSchema>;

// GET and PUT /api/setup. Requires sign-in, any plan.
export type AccountSetupResponse = { ok: true; setup: AccountSetup };
