import { z } from "zod";
import { SETUP_STEP_OUTCOMES } from "./types";

// Apart from ./types so the dashboard doesn't load zod.

// Changes only what it sends. "shown" undoes "Hide this".
export const AccountSetupChangeSchema = z
  .object({
    step: z.enum(SETUP_STEP_OUTCOMES).optional(),
    checklist: z.enum(["hidden", "shown"]).optional(),
  })
  .refine((body) => body.step !== undefined || body.checklist !== undefined, "Nothing to change.");
