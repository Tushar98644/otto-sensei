"use client";

import { useEffect } from "react";
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
import type { ContentMessages } from "../i18n";

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
let running: Promise<void> | null = null;
let rerun = false;
// Edits typed while the saved content loads, replayed onto it when it arrives.
let early: Array<(content: PortfolioContent) => PortfolioContent> = [];

// `shown` is what the editor shows until the answer, so edits typed meanwhile apply to it.
export async function loadContent(
  owner: string,
  { force = false, shown }: { force?: boolean; shown?: PortfolioContent } = {},
): Promise<void> {
  const state = useContentStore.getState();
  if (state.owner === owner && (state.status === "loading" || (state.status === "ready" && !force)))
    return;
  early = [];
  useContentStore.setState({
    status: "loading",
    owner,
    error: null,
    ...(shown ? { content: shown, dirty: false } : {}),
  });
  try {
    const { content, github } = await api.portfolioContent();
    if (useContentStore.getState().owner !== owner) return;
    revision += 1;
    useContentStore.setState({
      status: "ready",
      content: early.reduce((next, edit) => edit(next), content),
      github,
      dirty: early.length > 0,
    });
  } catch (error) {
    if (useContentStore.getState().owner !== owner) return;
    useContentStore.setState({ status: "error", error: isApiError(error) ? error.message : null });
  }
  const typed = early.length > 0;
  early = [];
  if (typed) void save();
}

// Saves run from timers, outside React: the editor hands over its words while it's open.
let failWords: { title: string; detail: string } | null = null;

export function setContentSaveWords(words: ContentMessages): void {
  failWords = { title: words.saveFailed, detail: words.savedHere };
}

export function useContentSaveWords(words: ContentMessages): void {
  useEffect(() => setContentSaveWords(words), [words]);
}

async function send(keepalive: boolean): Promise<void> {
  const { content, dirty, status } = useContentStore.getState();
  // Until the saved content is known, a save could overwrite it; the load sends the edits.
  if (!dirty || status === "loading") return;
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
    if (failWords) {
      toast({
        title: failWords.title,
        description: isApiError(error) ? error.message : failWords.detail,
        variant: "error",
      });
    }
  } finally {
    useContentStore.setState({ saving: false });
  }
}

// One save at a time, so an older copy can't land after a newer one; a page being left can't wait.
function save({ keepalive = false } = {}): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (running && keepalive) return send(true);
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      let leaving = keepalive;
      do {
        rerun = false;
        await send(leaving);
        leaving = false;
      } while (rerun);
    } finally {
      running = null;
    }
  })();
  return running;
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
  if (useContentStore.getState().status === "loading") early.push(change);
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
  early = [];
  useContentStore.setState({
    status: "idle",
    owner: null,
    content: emptyContent(),
    github: null,
    dirty: false,
  });
}
