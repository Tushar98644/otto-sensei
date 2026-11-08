"use client";

import { create } from "zustand";
import { api, isApiError } from "@/lib/api/client";
import type { SharedLink } from "@/lib/share/types";

// The account's live share links, loaded once and shared by every card's Share dialog and the
// Shared links list, so a link made in one shows up in the other at once.

type Status = "idle" | "loading" | "ready" | "error";

type ShareState = {
  status: Status;
  // Whose links these are: another account signing in on this tab starts from scratch.
  owner: string | null;
  links: SharedLink[];
  // Why the last load failed, in words for the person.
  error: string | null;
  load: (owner: string, options?: { force?: boolean }) => Promise<void>;
  put: (link: SharedLink) => void;
  drop: (id: string) => void;
};

const newestFirst = (a: SharedLink, b: SharedLink) =>
  b.createdAt - a.createdAt || b.id.localeCompare(a.id);

export const useShareStore = create<ShareState>()((set, get) => ({
  status: "idle",
  owner: null,
  links: [],
  error: null,
  async load(owner, { force = false } = {}) {
    const current = get();
    const same = current.owner === owner;
    if (same && current.status === "loading") return;
    if (same && current.status === "ready" && !force) return;
    set(
      same
        ? { status: "loading", error: null }
        : { status: "loading", owner, links: [], error: null },
    );
    try {
      const { links } = await api.shares();
      // Signed out and in as someone else while this was on its way.
      if (get().owner !== owner) return;
      set({ status: "ready", links });
    } catch (error) {
      if (get().owner !== owner) return;
      set({ status: "error", error: isApiError(error) ? error.message : null });
    }
  },
  put(link) {
    set(({ links }) => ({
      links: [link, ...links.filter((item) => item.id !== link.id)].sort(newestFirst),
    }));
  },
  drop(id) {
    set(({ links }) => ({ links: links.filter((item) => item.id !== id) }));
  },
}));
