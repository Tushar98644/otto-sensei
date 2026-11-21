"use client";

import { useEffect, useEffectEvent, useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import type { GitHubStats, PortfolioContent } from "@/lib/portfolio/content";
import { portfolioViews, type PortfolioViews } from "@/lib/portfolio/content-view";
import type { Portfolio } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { loadContent, useContentStore } from "./content-store";

export type PortfolioContentState = PortfolioViews & {
  content: PortfolioContent;
  github: GitHubStats | null;
};

export function usePortfolioContent(portfolio: Portfolio, resume: Resume): PortfolioContentState {
  const { user } = useMe();
  const status = useContentStore((state) => state.status);
  const owner = useContentStore((state) => state.owner);
  const stored = useContentStore((state) => state.content);
  const storedGitHub = useContentStore((state) => state.github);
  const userId = user?.id ?? null;

  const load = useEffectEvent((id: string) => loadContent(id, { shown: portfolio.content }));
  useEffect(() => {
    if (userId) void load(userId);
  }, [userId]);

  const ready = status === "ready" && owner === userId;
  // From the start of its load the store holds the shown copy, with any edit typed meanwhile.
  const content = status !== "idle" && owner === userId ? stored : portfolio.content;
  const github = ready ? storedGitHub : portfolio.github;
  const { showEmail, showPhone, hiddenSections } = portfolio;
  const views = useMemo(
    () =>
      portfolioViews({
        resume,
        settings: { showEmail, showPhone, hiddenSections },
        content,
        github,
      }),
    [resume, showEmail, showPhone, hiddenSections, content, github],
  );
  return { ...views, content, github };
}
