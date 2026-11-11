"use client";

import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { useMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { UNDO_MS } from "@/components/ui/undo-toast";
import { api, isApiError } from "@/lib/api/client";
import type { UpdatePortfolioBody } from "@/lib/api/types";
import type { Portfolio } from "@/lib/portfolio/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { PORTFOLIO } from "@/lib/queries/keys";
import { portfolioQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";

// The account's portfolio, from the tab's query cache, and the one piece of screen state its
// editor shares: whether a write is on its way.

// A write is on its way; the editor shows it and keeps a second one from racing it.
export const usePortfolioStore = create<{ saving: boolean }>()(() => ({ saving: false }));

export type PortfolioState = {
  status: "loading" | "ready" | "error";
  portfolio: Portfolio | null;
  error: string | null;
  retry: () => void;
};

export function usePortfolio(): PortfolioState {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const client = useAppQueryClient();
  const query = useQuery({ ...portfolioQuery(userId ?? ""), enabled: userId !== null }, client);
  const status: PortfolioState["status"] =
    query.data !== undefined
      ? "ready"
      : query.isError && query.fetchStatus === "idle"
        ? "error"
        : "loading";
  return {
    status,
    portfolio: query.data ?? null,
    error: query.error && isApiError(query.error) ? query.error.message : null,
    retry: () => void query.refetch(),
  };
}

function currentPortfolio(): Portfolio | null {
  const [entry] = getQueryClient().getQueriesData<Portfolio | null>({ queryKey: PORTFOLIO });
  return entry?.[1] ?? null;
}

export function putPortfolio(portfolio: Portfolio | null): void {
  getQueryClient().setQueriesData<Portfolio | null>({ queryKey: PORTFOLIO }, () => portfolio);
}

export function messageOf(error: unknown): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** Makes the portfolio from this resume (or points the existing one at it). Null on failure. */
export async function makePortfolio(resume: Resume): Promise<Portfolio | null> {
  usePortfolioStore.setState({ saving: true });
  try {
    const { portfolio } = await api.createPortfolio({ resume });
    putPortfolio(portfolio);
    return portfolio;
  } catch (error) {
    toast({
      title: "Couldn't make your portfolio",
      description: messageOf(error),
      variant: "error",
    });
    return null;
  } finally {
    usePortfolioStore.setState({ saving: false });
  }
}

let latestSave = 0;

// The settings in a change, shown before the server answers. The address and a new copy of the
// resume wait for the server: it normalizes the one and trims the other.
function withSettings(portfolio: Portfolio, patch: UpdatePortfolioBody): Portfolio {
  const next = { ...portfolio };
  if (patch.template !== undefined) next.template = patch.template;
  if (patch.showEmail !== undefined) next.showEmail = patch.showEmail;
  if (patch.showPhone !== undefined) next.showPhone = patch.showPhone;
  if (patch.hiddenSections !== undefined) next.hiddenSections = patch.hiddenSections;
  if (patch.sync !== undefined) next.sync = patch.sync;
  if (patch.published !== undefined) next.published = patch.published;
  if (patch.allowIndexing !== undefined) next.allowIndexing = patch.allowIndexing;
  return next;
}

/**
 * Saves a change. Settings show at once (optimistic) and go back if the server says no; the
 * server's answer is the final word. Resolves false after telling the person why it failed.
 */
export async function savePortfolio(patch: UpdatePortfolioBody): Promise<boolean> {
  const before = currentPortfolio();
  if (!before) return false;
  // Two quick switches send two requests; only the newest answer may replace what's shown, or a
  // late first answer would undo the second switch on screen.
  const mine = ++latestSave;
  putPortfolio(withSettings(before, patch));
  usePortfolioStore.setState({ saving: true });
  try {
    const { portfolio } = await api.updatePortfolio(patch);
    if (mine === latestSave) putPortfolio(portfolio);
    return true;
  } catch (error) {
    if (isApiError(error, "not_found")) putPortfolio(null);
    else if (mine === latestSave) putPortfolio(before);
    toast({ title: "Couldn't save that", description: messageOf(error), variant: "error" });
    return false;
  } finally {
    if (mine === latestSave) usePortfolioStore.setState({ saving: false });
  }
}

/** Publishes or takes the page down at once, with Undo instead of "Are you sure?". */
export async function setPublished(published: boolean): Promise<void> {
  if (!(await savePortfolio({ published }))) return;
  toast({
    title: published ? "Your page is live" : "Your page is down",
    description: published
      ? "Anyone with the address can open it now."
      : "Anyone who opens the address now sees that it doesn't work.",
    variant: "success",
    durationMs: UNDO_MS,
    action: { label: "Undo", onAction: () => void savePortfolio({ published: !published }) },
  });
}
