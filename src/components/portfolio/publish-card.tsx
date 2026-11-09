"use client";

import { Check, ExternalLink, Globe } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { useCopyLink } from "@/components/share/copy-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import { isTrialing } from "@/config/plans";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioPath, type Portfolio } from "@/lib/portfolio/types";
import { trialEndDay } from "@/lib/usage-copy";
import { EditorCard } from "./check-row";
import { setPublished, usePortfolioStore } from "./portfolio-store";

const noSubscribe = () => () => {};

/** The page's full address from wherever the app runs; "" on the server. */
export function usePortfolioUrl(slug: string): string {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  return origin ? new URL(portfolioPath(slug), origin).href : "";
}

const COUNT = new Intl.NumberFormat("en-US");

export function PublishCard({ portfolio }: { portfolio: Portfolio }) {
  const { user } = useMe();
  const saving = usePortfolioStore((state) => state.saving);
  // A trial builds and previews; going live waits for the first Pro payment.
  const trialing = user !== null && isTrialing(user);
  const canPublish = user === null || canPublishPortfolio(user.plan, trialing);
  const url = usePortfolioUrl(portfolio.slug);
  const { copied, copy } = useCopyLink();
  const { published, views } = portfolio;
  return (
    <EditorCard title="Your page">
      <div className="flex flex-wrap items-center gap-2">
        {published ? <StatusPill status="pass">Live</StatusPill> : <Badge>Draft</Badge>}
        <p className="min-w-0 truncate font-mono text-sm/6 text-muted">
          {portfolioPath(portfolio.slug)}
        </p>
      </div>
      <p className="mt-1 text-sm/5 text-subtle">
        {views === 0 ? "No views yet" : `${COUNT.format(views)} ${views === 1 ? "view" : "views"}`}
        {" · Counts leave out you, link previews and search engines"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {published ? (
          <>
            <Button
              variant="secondary"
              onClick={() => copy(url)}
              disabled={!url}
              className="min-w-28"
            >
              {copied ? <Check aria-hidden /> : null}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a
              href={url || portfolioPath(portfolio.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "ghost" })}
            >
              Open page
              <ExternalLink aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <Button
              variant="ghost"
              onClick={() => void setPublished(false)}
              disabled={saving}
              className="text-fail-ink"
            >
              Take down
            </Button>
          </>
        ) : (
          <Button
            onClick={() => void setPublished(true)}
            loading={saving}
            disabled={!canPublish}
            aria-describedby={canPublish ? undefined : "portfolio-publish-note"}
          >
            <Globe aria-hidden />
            Publish
          </Button>
        )}
      </div>
      {!published && !canPublish ? (
        <p id="portfolio-publish-note" className="mt-3 text-sm/5 text-muted">
          {user?.trialEndsAt
            ? `Publishing comes with paid Pro. Your trial ends on ${trialEndDay(user.trialEndsAt)}; then one click puts this page live, hosted by us. Until then only you can see it.`
            : "Publishing comes with paid Pro, and we host the page for you. Until then only you can see it."}
        </p>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </EditorCard>
  );
}
