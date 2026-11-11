import { z } from "zod";
import { isCountryCode } from "@/lib/eligibility/places";
import {
  ASKED_APPLIED_ANSWERS,
  DEFAULT_FILTERS,
  LEVELS,
  LOOKING_FOR_LIMITS,
  MATCH_PROFILE_LIMITS,
  MAX_JOB_PAGE,
  NOT_FIT_REASONS,
  OCCUPATION_CODE,
  PLACE_GROUPS,
  ROLE_FAMILIES,
  SENIORITIES,
  type PlaceChoice,
} from "./types";

export const MatchProfileSchema = z.object({
  skills: z.array(z.string().max(60)).max(MATCH_PROFILE_LIMITS.skills),
  titles: z
    .array(z.string().trim().max(MATCH_PROFILE_LIMITS.titleChars))
    .max(MATCH_PROFILE_LIMITS.titles),
  years: z.number().min(0).max(70).nullable(),
});

const PLACE_CHOICE = z
  .string()
  .max(24)
  .refine(
    (value) =>
      value === "anywhere" ||
      (value.startsWith("c:") && isCountryCode(value.slice(2))) ||
      (value.startsWith("g:") && (PLACE_GROUPS as readonly string[]).includes(value.slice(2))),
    "Pick a place from the list.",
  )
  .transform((value) => value as PlaceChoice);

const OccupationCodeSchema = z.string().regex(OCCUPATION_CODE);

export const LookingForSchema = z.object({
  title: z.string().trim().max(LOOKING_FOR_LIMITS.titleChars),
  family: z.enum(ROLE_FAMILIES).nullable(),
  occupation: OccupationCodeSchema.nullable().default(null),
  level: z.enum(SENIORITIES).nullable(),
  place: PLACE_CHOICE,
  remote: z.boolean(),
});

export const LookingForChoiceSchema = z.object({
  role: z
    .object({
      title: z.string().trim().max(LOOKING_FOR_LIMITS.titleChars),
      family: z.enum(ROLE_FAMILIES).nullable(),
      occupation: OccupationCodeSchema.nullable().default(null),
    })
    .nullable(),
  level: z.enum(SENIORITIES).nullable(),
  place: PLACE_CHOICE.nullable(),
  remote: z.boolean(),
});

export const JobFiltersSchema = z.object({
  q: z.string().trim().max(100).default(""),
  remote: z.boolean().default(false),
  place: z.string().trim().max(60).default(""),
  role: z.enum(ROLE_FAMILIES).nullable().default(null),
  level: z.enum(LEVELS).nullable().default(null),
  postedWithin: z
    .union([z.literal(7), z.literal(30)])
    .nullable()
    .default(null),
  eligibleOnly: z.boolean().default(false),
});

export const JobMatchesRequestSchema = z.object({
  view: z.enum(["matches", "saved"]).default("matches"),
  profile: MatchProfileSchema,
  filters: JobFiltersSchema.default(DEFAULT_FILTERS),
  page: z.number().int().min(1).max(MAX_JOB_PAGE).default(1),
  deviceTimeZone: z.string().max(64).default(""),
  lookingFor: LookingForSchema.nullable().default(null),
});

// Ids and labels only: never resume text.
export const MatchActionSchema = z
  .object({
    kind: z.enum(["open", "save", "tailor", "applied", "not_fit", "asked_applied"]),
    jobId: z.uuid(),
    requestId: z.uuid().nullable().default(null),
    position: z.number().int().min(1).max(1_000).nullable().default(null),
    label: z.enum(["strong", "good", "stretch"]).nullable().default(null),
    variant: z
      .string()
      .regex(/^[a-z0-9-]{1,40}$/)
      .default("unknown"),
    resumeHash: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,64}$/)
      .nullable()
      .default(null),
    reason: z.enum(NOT_FIT_REASONS).nullable().default(null),
    answer: z.enum(ASKED_APPLIED_ANSWERS).nullable().default(null),
  })
  .refine((event) => (event.kind === "not_fit") === (event.reason !== null), {
    message: "A reason goes with “not a fit” and nothing else",
  })
  .refine((event) => (event.kind === "asked_applied") === (event.answer !== null), {
    message: "An answer goes with “did you apply?” and nothing else",
  });
