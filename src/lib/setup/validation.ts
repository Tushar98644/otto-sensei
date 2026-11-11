import { z } from "zod";
import { SETUP_STEP_OUTCOMES } from "./types";

// The PUT /api/setup body schema (zod), apart from ./types so the dashboard doesn't load zod.

// PUT /api/setup changes only what it sends. "shown" undoes "Hide this".
export const AccountSetupChangeSchema = z
  .object({
    step: z.enum(SETUP_STEP_OUTCOMES).optional(),
    checklist: z.enum(["hidden", "shown"]).optional(),
  })
  .refine((body) => body.step !== undefined || body.checklist !== undefined, "Nothing to change.");
