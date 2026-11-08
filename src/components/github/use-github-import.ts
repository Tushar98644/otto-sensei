"use client";

import { useReducer, useRef } from "react";
import { api, isApiError } from "@/lib/api/client";
import {
  GITHUB_PICK_LIMITS,
  type GitHubDraftResult,
  type GitHubLookup,
} from "@/lib/github/types";
import { suggestPicks } from "@/lib/github/suggest";
import { parseGitHubUsername } from "@/lib/github/username";
import type { Resume } from "@/lib/resume/schema";
import { contactOf, usernameFromResume } from "./format";

// State for the "Import from GitHub" dialog: name → (pick) → review. A username already on the
// resume is looked up as soon as the dialog opens, the best repos are picked and drafted by
// themselves, and the person lands on the drafts to say which to keep; "Pick other repos" goes
// back to choosing. Nothing reaches the resume here; the dialog adds the kept entries only when
// the person confirms.

export type GitHubImportStep = "name" | "pick" | "review";

type State = {
  step: GitHubImportStep;
  // null until the person types, so the field shows the name from the resume's links.
  typed: string | null;
  profile: GitHubLookup | null;
  repos: string[];
  pulls: number[];
  draft: GitHubDraftResult | null;
  // Drafted entries the person unticked.
  left: string[];
  busy: "lookup" | "draft" | null;
  error: string | null;
};

type Action =
  | { type: "type"; value: string }
  | { type: "start"; busy: "lookup" | "draft" }
  | { type: "failed"; error: string }
  | { type: "found"; profile: GitHubLookup; repos: string[]; pulls: number[] }
  | { type: "drafted"; draft: GitHubDraftResult; left: string[] }
  | { type: "toggleRepo"; fullName: string }
  | { type: "togglePull"; id: number }
  | { type: "toggleEntry"; key: string }
  | { type: "back" }
  | { type: "reset" };

const INITIAL: State = {
  step: "name",
  typed: null,
  profile: null,
  repos: [],
  pulls: [],
  draft: null,
  left: [],
  busy: null,
  error: null,
};

function toggle<T>(list: readonly T[], value: T, limit: number): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  return list.length >= limit ? [...list] : [...list, value];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "type":
      return { ...state, typed: action.value, error: null };
    case "start":
      return { ...state, busy: action.busy, error: null };
    case "failed":
      return { ...state, busy: null, error: action.error };
    case "found":
      return {
        ...state,
        busy: null,
        step: "pick",
        profile: action.profile,
        repos: action.repos,
        pulls: action.pulls,
        draft: null,
      };
    case "drafted":
      return { ...state, busy: null, step: "review", draft: action.draft, left: action.left };
    case "toggleRepo":
      return { ...state, repos: toggle(state.repos, action.fullName, GITHUB_PICK_LIMITS.repos) };
    case "togglePull":
      return { ...state, pulls: toggle(state.pulls, action.id, GITHUB_PICK_LIMITS.pulls) };
    case "toggleEntry":
      return {
        ...state,
        left: state.left.includes(action.key)
          ? state.left.filter((key) => key !== action.key)
          : [...state.left, action.key],
      };
    case "back":
      return {
        ...state,
        busy: null,
        error: null,
        step: state.step === "review" ? "pick" : "name",
        draft: state.step === "review" ? null : state.draft,
      };
    case "reset":
      return INITIAL;
  }
}

function messageOf(error: unknown, fallback: string): string {
  if (isApiError(error, "network_error")) return "Can't reach Otto right now. Check your connection.";
  return isApiError(error) ? error.message : fallback;
}

export type GitHubImport = ReturnType<typeof useGitHubImport>;

/**
 * `alreadyOn` names drafted entries the resume already lists; they start unticked so a second
 * import doesn't add the same project twice.
 */
export function useGitHubImport(
  resume: Resume,
  alreadyOn: (draft: GitHubDraftResult) => string[],
  // Sees every failed draft first, e.g. to offer the next plan at the monthly limit.
  onDraftError?: (error: unknown) => void,
) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  // Answers that arrive after the person went back or closed the dialog are dropped.
  const run = useRef(0);

  const username = state.typed ?? usernameFromResume(resume);

  async function draftPicks(profile: GitHubLookup, repos: string[], pulls: number[], id: number) {
    dispatch({ type: "start", busy: "draft" });
    try {
      const { entries, usedAI, missing } = await api.githubDraft({
        username: profile.username,
        repos,
        pulls,
        contact: contactOf(resume),
      });
      const result = { entries, usedAI, missing };
      if (id === run.current) dispatch({ type: "drafted", draft: result, left: alreadyOn(result) });
    } catch (error) {
      if (id === run.current) {
        dispatch({ type: "failed", error: messageOf(error, "Otto couldn't draft those projects. Try again.") });
        onDraftError?.(error);
      }
    }
  }

  async function lookup() {
    const name = parseGitHubUsername(username);
    if (!name) {
      dispatch({
        type: "failed",
        error: username.trim()
          ? "That isn't a GitHub username. Use the name in your profile link, like github.com/octocat."
          : "Type your GitHub username, like octocat.",
      });
      return;
    }
    const id = ++run.current;
    dispatch({ type: "start", busy: "lookup" });
    let profile: GitHubLookup;
    try {
      profile = (await api.githubLookup({ username: name })).profile;
    } catch (error) {
      if (id === run.current) dispatch({ type: "failed", error: messageOf(error, "Couldn't read GitHub. Try again.") });
      return;
    }
    if (id !== run.current) return;
    const picks = suggestPicks(profile, resume);
    dispatch({ type: "found", profile, ...picks });
    // Straight on to the drafts; with nothing worth picking, the pick step says why.
    if (picks.repos.length + picks.pulls.length > 0) await draftPicks(profile, picks.repos, picks.pulls, id);
  }

  async function draft() {
    const profile = state.profile;
    if (!profile || state.repos.length + state.pulls.length === 0) return;
    await draftPicks(profile, state.repos, state.pulls, ++run.current);
  }

  return {
    state,
    username,
    setUsername: (value: string) => dispatch({ type: "type", value }),
    lookup,
    draft,
    toggleRepo: (fullName: string) => dispatch({ type: "toggleRepo", fullName }),
    togglePull: (id: number) => dispatch({ type: "togglePull", id }),
    toggleEntry: (key: string) => dispatch({ type: "toggleEntry", key }),
    back: () => {
      run.current += 1;
      dispatch({ type: "back" });
    },
    reset: () => {
      run.current += 1;
      dispatch({ type: "reset" });
    },
  };
}
