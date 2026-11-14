"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { markPrepped } from "@/components/dashboard/applications/use-applications";
import type { PrepSummary } from "@/lib/insights/prep";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { APPLICATIONS, PREP_PACKS } from "@/lib/queries/keys";
import { prepPacksQuery } from "@/lib/queries/options";

export type PrepPacksState = {
  status: "loading" | "ready" | "error";
  items: PrepSummary[];
  retry: () => void;
};

const NONE: PrepSummary[] = [];

// A saved pack changes only the application's hasPrep; an unsaved one means the application is gone.
export function forgetPrepPacks(applicationId: string, saved: boolean): void {
  const client = getQueryClient();
  void client.invalidateQueries({ queryKey: PREP_PACKS });
  if (saved) markPrepped(applicationId);
  else void client.invalidateQueries({ queryKey: APPLICATIONS });
}

export function usePrepPacks(): PrepPacksState {
  const userId = useSessionUserId() ?? "";
  const client = useAppQueryClient();
  const query = useQuery({ ...prepPacksQuery(userId), enabled: userId !== "" }, client);
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);
  const status: PrepPacksState["status"] = query.data
    ? "ready"
    : query.isError
      ? "error"
      : "loading";
  return { status, items: query.data ?? NONE, retry };
}
