"use client";

import { useEffect, useEffectEvent } from "react";
import { toast } from "@/components/ui/toast";
import {
  GITHUB_CONNECT_ERRORS,
  GITHUB_ERROR_PARAM,
  GITHUB_RETURN_PARAM,
  type GitHubConnectError,
} from "@/lib/github/connect";
import { useGitHubWords } from "./use-github-words";

export function returnPathFor(target: string): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(GITHUB_ERROR_PARAM);
  url.searchParams.set(GITHUB_RETURN_PARAM, target);
  return `${url.pathname}${url.search}${url.hash}`;
}

function errorMessage(
  code: string | null,
  errors: Record<GitHubConnectError, string> = GITHUB_CONNECT_ERRORS,
): string | null {
  return code && Object.hasOwn(GITHUB_CONNECT_ERRORS, code)
    ? errors[code as GitHubConnectError]
    : null;
}

function takeReturn(
  target: string,
  errors?: Record<GitHubConnectError, string>,
): { error: string | null } | null {
  const url = new URL(window.location.href);
  if (url.searchParams.get(GITHUB_RETURN_PARAM) !== target) return null;
  const error = errorMessage(url.searchParams.get(GITHUB_ERROR_PARAM), errors);
  url.searchParams.delete(GITHUB_RETURN_PARAM);
  url.searchParams.delete(GITHUB_ERROR_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return { error };
}

export function useGitHubReturn(target: string, reopen: (error: string | null) => void): void {
  const t = useGitHubWords().connect;
  const onReturn = useEffectEvent((error: string | null) => {
    if (error) toast({ title: t.notConnected, description: error, variant: "error" });
    reopen(error);
  });
  const errors = useEffectEvent(() => t.errors);
  useEffect(() => {
    const back = takeReturn(target, errors());
    if (!back) return;
    // Not cancelled on cleanup: the marks are gone, so Strict Mode's rerun would lose the reopen.
    window.setTimeout(() => onReturn(back.error), 0);
  }, [target]);
}
