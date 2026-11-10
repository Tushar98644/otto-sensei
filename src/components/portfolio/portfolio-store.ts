"use client";

import { create } from "zustand";
import { toast } from "@/components/ui/toast";
import { UNDO_MS } from "@/components/ui/undo-toast";
import { api, isApiError } from "@/lib/api/client";
import type { UpdatePortfolioBody } from "@/lib/api/types";
import type { Portfolio } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";

// The account's portfolio, loaded once and shared by the Portfolio screen and the resume cards.

type Status = "idle" | "loading" | "ready" | "error";

type PortfolioState = {
  status: Status;
  // Whose portfolio this is: another account signing in on this tab starts from scratch.
  owner: string | null;
  portfolio: Portfolio | null;
  error: string | null;
  // A write is on its way; the editor shows it and keeps a second one from racing it.
  saving: boolean;
  load: (owner: string, options?: { force?: boolean }) => Promise<void>;
  put: (portfolio: Portfolio | null) => void;
};

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  status: "idle",
  owner: null,
  portfolio: null,
  error: null,
  saving: false,
  async load(owner, { force = false } = {}) {
    const current = get();
    const same = current.owner === owner;
    if (same && current.status === "loading") return;
    if (same && current.status === "ready" && !force) return;
    set(
      same
        ? { status: "loading", error: null }
        : { status: "loading", owner, portfolio: null, error: null },
    );
    try {
      const { portfolio } = await api.portfolio();
      if (get().owner !== owner) return;
      set({ status: "ready", portfolio });
    } catch (error) {
      if (get().owner !== owner) return;
      set({ status: "error", error: isApiError(error) ? error.message : null });
    }
  },
  put(portfolio) {
    set({ portfolio });
  },
}));

export function messageOf(error: unknown): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** Makes the portfolio from this resume (or points the existing one at it). Null on failure. */
export async function makePortfolio(resume: Resume): Promise<Portfolio | null> {
  usePortfolioStore.setState({ saving: true });
  try {
    const { portfolio } = await api.createPortfolio({ resume });
    usePortfolioStore.getState().put(portfolio);
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
  const before = usePortfolioStore.getState().portfolio;
  if (!before) return false;
  // Two quick switches send two requests; only the newest answer may replace what's shown, or a
  // late first answer would undo the second switch on screen.
  const mine = ++latestSave;
  usePortfolioStore.setState({ portfolio: withSettings(before, patch), saving: true });
  try {
    const { portfolio } = await api.updatePortfolio(patch);
    if (mine === latestSave) usePortfolioStore.getState().put(portfolio);
    return true;
  } catch (error) {
    if (isApiError(error, "not_found")) usePortfolioStore.getState().put(null);
    else if (mine === latestSave) usePortfolioStore.getState().put(before);
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
