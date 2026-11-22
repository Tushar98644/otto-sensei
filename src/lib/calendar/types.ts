import { z } from "zod";

export const CalendarFeedRequestSchema = z.strictObject({ renew: z.literal(true).optional() });
export type CalendarFeedBody = z.input<typeof CalendarFeedRequestSchema>;

// The same private link three ways: to copy, for Apple and Outlook, and Google's add-by-link page.
export type FeedLinks = { https: string; webcal: string; google: string };
export type CalendarFeedResponse = { ok: true; links: FeedLinks };
