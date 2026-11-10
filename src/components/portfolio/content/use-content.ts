"use client";

import { useEffect, useMemo } from "react";
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

/**
 * The content document for this portfolio (the copy it loaded with, then the editor's live one),
 * drawn twice: as the page shows it, and in full for the editor, so hiding a section on the page
 * never hides what the owner wrote for it.
 */
export function usePortfolioContent(portfolio: Portfolio, resume: Resume): PortfolioContentState {
  const { user } = useMe();
  const status = useContentStore((state) => state.status);
  const owner = useContentStore((state) => state.owner);
  const stored = useContentStore((state) => state.content);
  const storedGitHub = useContentStore((state) => state.github);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId) void loadContent(userId);
  }, [userId]);

  const ready = status === "ready" && owner === userId;
  const content = ready ? stored : portfolio.content;
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
