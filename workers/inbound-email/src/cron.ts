import type { Env } from "./types";

export const INTERVIEW_BRIEFS_PATH = "/api/cron/interview-briefs";
const TIMEOUT_MS = 90_000;

// The hourly interview run: Otto stamps every interview day it handles, so a repeat or a retry never doubles up.
export async function runInterviewBriefs(env: Env, send: typeof fetch = fetch): Promise<void> {
  const base = env.APP_URL.trim().replace(/\/+$/, "");
  const secret = env.CRON_SECRET?.trim();
  if (!base || !secret) throw new Error("APP_URL or CRON_SECRET is not set");
  const response = await send(`${base}${INTERVIEW_BRIEFS_PATH}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.ok) return;
  if (response.status === 401) throw new Error("Otto refused CRON_SECRET; use the value on Vercel");
  // The next hour picks up what's left.
  throw new Error(`Otto answered ${response.status}`);
}
