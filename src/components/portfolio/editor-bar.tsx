"use client";

import { Check, Ellipsis, ExternalLink, EyeOff, Globe, Link2, Smartphone } from "lucide-react";
import { useId } from "react";
import { useMe } from "@/components/account/use-me";
import { useCopyLink } from "@/components/share/copy-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/status";
import { isTrialing } from "@/config/plans";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioPath, type Portfolio } from "@/lib/portfolio/types";
import { trialEndDay } from "@/lib/usage-copy";
import { useContentStore } from "./content/content-store";
import { publishNote, saveLabel, viewsLabel } from "./lines";
import { setPublished, usePortfolioStore } from "./portfolio-store";
import { usePortfolioUrl } from "./use-portfolio-url";

type EditorBarProps = {
  portfolio: Portfolio;
  // Phones: the page full screen, since there's no room beside the panel.
  onPreview: () => void;
};

// The editor's top bar: the page's name and state on the left, its one main action on the right.
// Every change saves at once, so a live page needs no "Update": the bar says it's saved instead.
// On phones the actions move to a bar pinned at the bottom, with Preview beside them.
export function EditorBar({ portfolio, onPreview }: EditorBarProps) {
  const { user } = useMe();
  const saving = usePortfolioStore((state) => state.saving);
  const writing = useContentStore((state) => state.saving || state.dirty);
  // A trial builds and previews; going live waits for the first Pro payment.
  const trialing = user !== null && isTrialing(user);
  const canPublish = user === null || canPublishPortfolio(user.plan, trialing);
  const url = usePortfolioUrl(portfolio.slug);
  const href = url || portfolioPath(portfolio.slug);
  const { copied, copy } = useCopyLink();
  const noteId = useId();
  const { published, views } = portfolio;
  const note =
    !published && !canPublish
      ? publishNote(user?.trialEndsAt ? trialEndDay(user.trialEndsAt) : null)
      : null;

  const main = published ? (
    <Button variant="secondary" onClick={() => copy(url)} disabled={!url} className="min-w-32">
      {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  ) : (
    <Button
      onClick={() => void setPublished(true)}
      loading={saving}
      disabled={!canPublish}
      aria-describedby={note ? noteId : undefined}
    >
      <Globe aria-hidden />
      Publish
    </Button>
  );

  return (
    <header className="flex flex-col gap-3 lg:gap-1">
      <div className="flex items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-5">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink lg:text-3xl/9">
            Portfolio
          </h1>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm/5 text-subtle">
            {published ? <StatusPill status="pass">Live</StatusPill> : <Badge>Draft</Badge>}
            {published ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate font-mono text-muted underline decoration-border-strong underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                {portfolioPath(portfolio.slug)}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span className="min-w-0 truncate font-mono text-muted">
                {portfolioPath(portfolio.slug)}
              </span>
            )}
            {published ? (
              <>
                <span aria-hidden>·</span>
                <span>{viewsLabel(views)}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>{saveLabel(saving || writing, published)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {published ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "ghost", className: "max-lg:hidden" })}
            >
              Open page
              <ExternalLink aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
          {published ? (
            <Menu
              label="Page actions"
              align="end"
              triggerLabel="More page actions"
              triggerClassName={buttonClasses({ variant: "ghost", size: "icon" })}
              trigger={<Ellipsis aria-hidden />}
              items={[
                {
                  label: "Open page",
                  icon: ExternalLink,
                  onSelect: () => window.open(href, "_blank", "noopener,noreferrer"),
                },
                "separator",
                {
                  label: "Take down",
                  icon: EyeOff,
                  description: "Visitors see the page is down. You can undo.",
                  tone: "danger",
                  onSelect: () => void setPublished(false),
                },
              ]}
            />
          ) : null}
          <div className="max-lg:hidden">{main}</div>
        </div>
      </div>
      {note ? (
        <p id={noteId} className="max-w-prose text-sm/5 text-muted">
          {note}
        </p>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>

      {/* Phones: pinned to the bottom, so Preview and the main action are always one tap away. */}
      <div className="fixed inset-x-4 bottom-4 z-20 flex justify-end lg:hidden">
        <div className="flex gap-1.5 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5">
          <Button variant="secondary" onClick={onPreview}>
            <Smartphone aria-hidden />
            Preview
          </Button>
          {main}
        </div>
      </div>
    </header>
  );
}
