"use client";

import { useEffect, useEffectEvent } from "react";
import { toast } from "@/components/ui/toast";
import {
  GITHUB_CONNECT_ERRORS,
  GITHUB_ERROR_PARAM,
  GITHUB_RETURN_PARAM,
  type GitHubConnectError,
} from "@/lib/github/connect";

// Connecting GitHub leaves the page for GitHub and comes back through /auth/callback. The page's
// address carries what to reopen there: a resume id (its import dialog) or "portfolio".

export function returnPathFor(target: string): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(GITHUB_ERROR_PARAM);
  url.searchParams.set(GITHUB_RETURN_PARAM, target);
  return `${url.pathname}${url.search}${url.hash}`;
}

function errorMessage(code: string | null): string | null {
  return code && Object.hasOwn(GITHUB_CONNECT_ERRORS, code)
    ? GITHUB_CONNECT_ERRORS[code as GitHubConnectError]
    : null;
}

/** The marks come off the address at once, so a reload or a second button doesn't reopen it. */
function takeReturn(target: string): { error: string | null } | null {
  const url = new URL(window.location.href);
  if (url.searchParams.get(GITHUB_RETURN_PARAM) !== target) return null;
  const error = errorMessage(url.searchParams.get(GITHUB_ERROR_PARAM));
  url.searchParams.delete(GITHUB_RETURN_PARAM);
  url.searchParams.delete(GITHUB_ERROR_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return { error };
}

/** The error passed to `reopen` was already shown as a toast. */
export function useGitHubReturn(target: string, reopen: (error: string | null) => void): void {
  const onReturn = useEffectEvent((error: string | null) => {
    if (error) toast({ title: "GitHub isn't connected", description: error, variant: "error" });
    reopen(error);
  });
  useEffect(() => {
    const back = takeReturn(target);
    if (!back) return;
    // After this render, so no state is set inside the effect. Not cancelled on cleanup: the
    // marks are already gone, and Strict Mode's second run would otherwise lose the reopen.
    window.setTimeout(() => onReturn(back.error), 0);
  }, [target]);
}
