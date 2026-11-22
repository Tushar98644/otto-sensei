"use client";

import type { QueryClient } from "@tanstack/react-query";
import { readJsonItem, removeItem, writeJsonItem } from "@/lib/browser-storage";
import type { JobMatchesResponse } from "@/lib/job-feed/types";
import { JOB_MATCHES } from "./keys";
import { JOB_MATCHES_STALE_MS } from "./options";

// The opening Jobs list last shown in this browser, so a reload while it's still fresh shows it at once.
const KEY = "otto-job-matches-v1";

type Remembered = {
  userId: string;
  queryKey: readonly unknown[];
  data: JobMatchesResponse;
  at: number;
};

function isRemembered(value: unknown): value is Remembered {
  const saved = value as Partial<Remembered> | null;
  return (
    typeof saved?.userId === "string" &&
    Array.isArray(saved.queryKey) &&
    saved.queryKey[0] === JOB_MATCHES[0] &&
    saved.queryKey[1] === saved.userId &&
    typeof saved.at === "number" &&
    typeof saved.data === "object" &&
    saved.data !== null &&
    Array.isArray(saved.data.jobs)
  );
}

export function rememberShownMatches(
  queryKey: readonly unknown[],
  data: JobMatchesResponse,
  at: number,
): void {
  const [, userId, body] = queryKey;
  const request = body as { view?: unknown; page?: unknown } | undefined;
  if (typeof userId !== "string" || request?.view !== "matches" || request.page !== 1) return;
  if (data.locked || at <= 0) return;
  writeJsonItem(KEY, { userId, queryKey, data, at } satisfies Remembered);
}

// Fresh only: a list past its staleTime would refetch at once and could change while being read.
export function recallMatches(client: QueryClient, userId: string, now = Date.now()): void {
  const saved = readJsonItem(KEY);
  if (!isRemembered(saved)) return;
  if (saved.userId !== userId) {
    forgetMatches();
    return;
  }
  const age = now - saved.at;
  if (age < 0 || age >= JOB_MATCHES_STALE_MS) return;
  if (client.getQueryData(saved.queryKey) !== undefined) return;
  client.setQueryData(saved.queryKey, saved.data, { updatedAt: saved.at });
}

export function forgetMatches(): void {
  removeItem(KEY);
}
