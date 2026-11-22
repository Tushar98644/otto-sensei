import { z } from "zod";
import { isDay } from "./week";

export const RecapWeekSchema = z.string().refine(isDay, "Not a week.");

export const EnsureRecapSchema = z.strictObject({
  timeZone: z.string().min(1).max(64).optional(),
});

export const RecapSeenSchema = z.strictObject({ week: RecapWeekSchema });

export type EnsureRecapBody = z.input<typeof EnsureRecapSchema>;
export type RecapSeenBody = z.input<typeof RecapSeenSchema>;
