"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useMe } from "@/components/account/use-me";
import type { PrepSummary } from "@/lib/insights/prep";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { APPLICATIONS, PREP_PACKS } from "@/lib/queries/keys";
import { prepPacksQuery } from "@/lib/queries/options";

// The account's prep packs, as counts, for the Interview prep page.

export type PrepPacksState = {
  status: "loading" | "ready" | "error";
  items: PrepSummary[];
  retry: () => void;
};

const NONE: PrepSummary[] = [];

/** After a pack is made or changed (on its own page): the list and the applications' prep marks. */
export function forgetPrepPacks(): void {
  const client = getQueryClient();
  void client.invalidateQueries({ queryKey: PREP_PACKS });
  void client.invalidateQueries({ queryKey: APPLICATIONS });
}

export function usePrepPacks(): PrepPacksState {
  const { user } = useMe();
  const userId = user?.id ?? "";
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
