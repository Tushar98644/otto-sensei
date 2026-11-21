"use client";

import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { signedInUserId, useMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { UNDO_MS } from "@/components/ui/undo-toast";
import { api, isApiError } from "@/lib/api/client";
import type { UpdatePortfolioBody } from "@/lib/api/types";
import type { Portfolio, PortfolioTemplateId } from "@/lib/portfolio/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { PORTFOLIO, queryKeys } from "@/lib/queries/keys";
import { portfolioQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";

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

// The signed-in user's own entry: a first render before the user is known also leaves an empty one.
function currentPortfolio(): Portfolio | null {
  const userId = signedInUserId();
  if (!userId) return null;
  return getQueryClient().getQueryData<Portfolio | null>(queryKeys.portfolio(userId)) ?? null;
}

export function putPortfolio(portfolio: Portfolio | null): void {
  getQueryClient().setQueriesData<Portfolio | null>({ queryKey: PORTFOLIO }, () => portfolio);
}

export function messageOf(error: unknown): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export async function makePortfolio(
  resume: Resume,
  template?: PortfolioTemplateId,
): Promise<Portfolio | null> {
  usePortfolioStore.setState({ saving: true });
  try {
    const { portfolio } = await api.createPortfolio(template ? { resume, template } : { resume });
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
let queue: Promise<unknown> = Promise.resolve();

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

export async function savePortfolio(patch: UpdatePortfolioBody): Promise<boolean> {
  const before = currentPortfolio();
  if (!before) {
    toast({
      title: "Couldn't save that",
      description: "Your portfolio hasn't loaded yet. Please try again in a moment.",
      variant: "error",
    });
    return false;
  }
  // Only the newest answer may replace what's shown, or a late one would undo a later switch.
  const mine = ++latestSave;
  putPortfolio(withSettings(before, patch));
  usePortfolioStore.setState({ saving: true });
  // Sent one after another, or a quick "Take down" could commit before the publish it follows.
  const sent = queue.then(() => api.updatePortfolio(patch));
  queue = sent.catch(() => undefined);
  try {
    const { portfolio } = await sent;
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
