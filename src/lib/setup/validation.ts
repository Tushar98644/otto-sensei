import { z } from "zod";
import { SETUP_STEP_OUTCOMES } from "./types";

export const AccountSetupChangeSchema = z
  .object({
    step: z.enum(SETUP_STEP_OUTCOMES).optional(),
    checklist: z.enum(["hidden", "shown"]).optional(),
  })
  .refine((body) => body.step !== undefined || body.checklist !== undefined, "Nothing to change.");
