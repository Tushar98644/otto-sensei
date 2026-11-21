import { MINUTE_MS } from "@/lib/time";

// Sent with a paid AI call, so a retry after a reload gets the same answer instead of paying again.
export const REQUEST_ID_HEADER = "x-otto-request-id";
// Asks only for an answer already paid for under that id, so picking a run up after a reload never starts one.
export const RESUME_HEADER = "x-otto-resume";
export const RESULT_TTL_MS = 10 * MINUTE_MS;

export type MeteredRun = { id: string; resume?: boolean };
