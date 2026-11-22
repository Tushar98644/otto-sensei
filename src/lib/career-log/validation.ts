import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { isMonth, monthsBetween } from "./month";
import { isTimeZone } from "./schedule";
import { CAREER_LOG_LIMITS, LAST_WEEK } from "./types";

const field = z.string().max(CAREER_LOG_LIMITS.fieldChars);
const month = z.string().refine(isMonth, "Not a month.");

export const MonthSchema = month;

export const EntryChangeSchema = z
  .strictObject({
    shipped: field.optional(),
    numbers: field.optional(),
    learned: field.optional(),
    nothingNew: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change.");

const job = z.strictObject({
  role: z.string().trim().max(CAREER_LOG_LIMITS.jobChars),
  company: z.string().trim().max(CAREER_LOG_LIMITS.jobChars),
});

export const SettingsChangeSchema = z
  .strictObject({
    checkins: z.boolean().optional(),
    emails: z.boolean().optional(),
    day: z
      .strictObject({
        week: z.number().int().min(1).max(LAST_WEEK),
        weekday: z.number().int().min(0).max(6),
      })
      .optional(),
    timeZone: z.string().max(64).refine(isTimeZone, "Not a time zone.").optional(),
    pauseMonths: z.union([z.literal(0), z.literal(1), z.literal(3)]).optional(),
    promptSnoozed: z.literal(true).optional(),
    job: job.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change.");

export const LogLinesSchema = z
  .strictObject({
    role: z.strictObject({
      title: z.string().max(CAREER_LOG_LIMITS.jobChars),
      company: z.string().max(CAREER_LOG_LIMITS.jobChars),
    }),
    from: month,
    to: month,
    existing: z.array(z.string().max(TEXT_LIMITS.bulletChars)).max(CAREER_LOG_LIMITS.existingLines),
  })
  .refine((body) => body.from <= body.to, "The range ends before it starts.")
  .refine(
    (body) => monthsBetween(body.from, body.to) < CAREER_LOG_LIMITS.linesMonths,
    "That range is too long.",
  );

export type LogLinesRequest = z.output<typeof LogLinesSchema>;

export type EntryChangeBody = z.input<typeof EntryChangeSchema>;
export type SettingsChangeBody = z.input<typeof SettingsChangeSchema>;
export type LogLinesBody = z.input<typeof LogLinesSchema>;
