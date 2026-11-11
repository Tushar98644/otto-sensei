"use client";

import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/components/account/use-me";
import { isApiError } from "@/lib/api/client";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { SHARES } from "@/lib/queries/keys";
import { sharesQuery } from "@/lib/queries/options";
import type { SharedLink } from "@/lib/share/types";

// Shared by every Share dialog and the Shared links list, so a new link shows in both at once.

export type SharesState = {
  status: "idle" | "loading" | "ready" | "error";
  links: SharedLink[];
  error: string | null;
  retry: () => void;
};

const NONE: SharedLink[] = [];

const newestFirst = (a: SharedLink, b: SharedLink) =>
  b.createdAt - a.createdAt || b.id.localeCompare(a.id);

/** Only loaded once `enabled` (a dialog that's open, a list that's shown). */
export function useShares(enabled = true): SharesState {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const client = useAppQueryClient();
  const query = useQuery(
    { ...sharesQuery(userId ?? ""), enabled: enabled && userId !== null },
    client,
  );
  const status: SharesState["status"] = query.data
    ? "ready"
    : query.isError && query.fetchStatus === "idle"
      ? "error"
      : query.fetchStatus === "fetching"
        ? "loading"
        : "idle";
  return {
    status,
    links: query.data ?? NONE,
    error: query.error && isApiError(query.error) ? query.error.message : null,
    retry: () => void query.refetch(),
  };
}

export function ensureShares(owner: string): Promise<SharedLink[]> {
  return getQueryClient().ensureQueryData(sharesQuery(owner));
}

export function putShare(link: SharedLink): void {
  getQueryClient().setQueriesData<SharedLink[]>({ queryKey: SHARES }, (links) =>
    links ? [link, ...links.filter((item) => item.id !== link.id)].sort(newestFirst) : links,
  );
}

export function dropShare(id: string): void {
  getQueryClient().setQueriesData<SharedLink[]>({ queryKey: SHARES }, (links) =>
    links ? links.filter((item) => item.id !== id) : links,
  );
}
