import { z } from "zod";
import { isCountryCode } from "@/lib/eligibility/places";
import { isTimeZone } from "@/lib/eligibility/profile";
import { LookingForChoiceSchema } from "@/lib/job-feed/validation";
import { COUNTRY_SOURCES, SETUP_STEP_OUTCOMES } from "./types";

export const AccountSetupChangeSchema = z
  .object({
    step: z.enum(SETUP_STEP_OUTCOMES).optional(),
    checklist: z.enum(["hidden", "shown"]).optional(),
    guess: z.literal("confirmed").optional(),
  })
  .refine(
    (body) => body.step !== undefined || body.checklist !== undefined || body.guess !== undefined,
    "Nothing to change.",
  );

export const SetupDefaultsSchema = z
  .object({
    place: z
      .object({
        country: z
          .string()
          .max(2)
          .refine((code) => code === "" || isCountryCode(code)),
        from: z.enum(COUNTRY_SOURCES).nullable(),
        timeZone: z
          .string()
          .max(64)
          .refine((zone) => zone === "" || isTimeZone(zone)),
      })
      .refine((place) => (place.country === "") === (place.from === null))
      .optional(),
    lookingFor: z
      .object({
        role: LookingForChoiceSchema.shape.role,
        level: LookingForChoiceSchema.shape.level,
      })
      .refine((choice) => choice.role !== null || choice.level !== null)
      .optional(),
  })
  .refine((body) => body.place !== undefined || body.lookingFor !== undefined, "Nothing to save.");
