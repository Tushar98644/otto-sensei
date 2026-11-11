"use client";

import { create } from "zustand";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { api, isApiError } from "@/lib/api/client";
import {
  emptyContent,
  saveableContent,
  type GitHubStats,
  type PortfolioContent,
} from "@/lib/portfolio/content";

const SAVE_AFTER_MS = 900;

type Status = "idle" | "loading" | "ready" | "error";

type ContentState = {
  status: Status;
  owner: string | null;
  content: PortfolioContent;
  github: GitHubStats | null;
  dirty: boolean;
  saving: boolean;
  error: string | null;
};

export const useContentStore = create<ContentState>()(() => ({
  status: "idle",
  owner: null,
  content: emptyContent(),
  github: null,
  dirty: false,
  saving: false,
  error: null,
}));

let timer: ReturnType<typeof setTimeout> | null = null;
// Each edit bumps it; a save's answer only replaces what's shown if nothing changed since.
let revision = 0;

export async function loadContent(owner: string, { force = false } = {}): Promise<void> {
  const state = useContentStore.getState();
  if (state.owner === owner && (state.status === "loading" || (state.status === "ready" && !force)))
    return;
  useContentStore.setState({ status: "loading", owner, error: null });
  try {
    const { content, github } = await api.portfolioContent();
    if (useContentStore.getState().owner !== owner) return;
    revision += 1;
    useContentStore.setState({ status: "ready", content, github, dirty: false });
  } catch (error) {
    if (useContentStore.getState().owner !== owner) return;
    useContentStore.setState({ status: "error", error: isApiError(error) ? error.message : null });
  }
}

async function save({ keepalive = false } = {}): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const { content, dirty } = useContentStore.getState();
  if (!dirty) return;
  const sent = revision;
  useContentStore.setState({ saving: true });
  try {
    const answer = await api.savePortfolioContent(
      { content: saveableContent(content) },
      { keepalive },
    );
    useContentStore.setState({
      github: answer.github,
      ...(sent === revision ? { dirty: false } : {}),
    });
  } catch (error) {
    toast({
      title: "Couldn't save that",
      description: isApiError(error)
        ? error.message
        : "Check your connection. Your change is kept here.",
      variant: "error",
    });
  } finally {
    useContentStore.setState({ saving: false });
  }
}

export async function flushContent({ keepalive = false } = {}): Promise<void> {
  if (useContentStore.getState().dirty) await save({ keepalive });
}

export function editContent(
  change: (content: PortfolioContent) => PortfolioContent,
  undo?: string,
): void {
  const before = useContentStore.getState().content;
  const next = change(before);
  if (next === before) return;
  revision += 1;
  useContentStore.setState({ content: next, dirty: true });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void save(), SAVE_AFTER_MS);
  if (undo) {
    undoToast({
      title: undo,
      onUndo: () => editContent(() => before),
    });
  }
}

export function setGitHub(github: GitHubStats | null): void {
  useContentStore.setState({ github });
}

export function resetContentStore(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  useContentStore.setState({
    status: "idle",
    owner: null,
    content: emptyContent(),
    github: null,
    dirty: false,
  });
}
