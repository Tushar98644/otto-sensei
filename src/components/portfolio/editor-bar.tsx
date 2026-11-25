"use client";

import { Check, Ellipsis, ExternalLink, EyeOff, Globe, Link2, Smartphone } from "lucide-react";
import { useId } from "react";
import { useMe } from "@/components/account/use-me";
import { useCopyLink } from "@/components/share/copy-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/status";
import { useFormat, useMessages } from "@/i18n/client";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioPath, type Portfolio } from "@/lib/portfolio/types";
import { useContentStore } from "./content/content-store";
import { saveLabel, viewsLabel } from "./lines";
import { setPublished, usePortfolioStore } from "./portfolio-store";
import { usePortfolioUrl } from "./use-portfolio-url";

type EditorBarProps = {
  portfolio: Portfolio;
  onPreview: () => void;
};

export function EditorBar({ portfolio, onPreview }: EditorBarProps) {
  const words = useMessages("portfolio");
  const format = useFormat();
  const bar = words.bar;
  const { user } = useMe();
  const saving = usePortfolioStore((state) => state.saving);
  const writing = useContentStore((state) => state.saving || state.dirty);
  const canPublish = user === null || canPublishPortfolio(user.plan);
  const url = usePortfolioUrl(portfolio.slug);
  const href = url || portfolioPath(portfolio.slug);
  const { copied, copy } = useCopyLink();
  const noteId = useId();
  const { published, views } = portfolio;
  const note = !published && !canPublish ? words.publishNote : null;

  const main = published ? (
    <Button variant="secondary" onClick={() => copy(url)} disabled={!url} className="min-w-32">
      {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
      {copied ? bar.copied : bar.copyLink}
    </Button>
  ) : (
    <Button
      onClick={() => void setPublished(true, words.store)}
      loading={saving}
      disabled={!canPublish}
      aria-describedby={note ? noteId : undefined}
    >
      <Globe aria-hidden />
      {bar.publish}
    </Button>
  );

  return (
    <header className="flex flex-col gap-3 lg:gap-1">
      <div className="flex items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-5">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink lg:text-3xl/9">
            {words.title}
          </h1>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm/5 text-subtle">
            {published ? (
              <StatusPill status="pass">{bar.live}</StatusPill>
            ) : (
              <Badge>{bar.draft}</Badge>
            )}
            {published ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate font-mono text-muted underline decoration-border-strong underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                {portfolioPath(portfolio.slug)}
                <span className="sr-only"> {bar.newTab}</span>
              </a>
            ) : (
              <span className="min-w-0 truncate font-mono text-muted">
                {portfolioPath(portfolio.slug)}
              </span>
            )}
            {published ? (
              <>
                <span aria-hidden>·</span>
                <span>{viewsLabel(words, format, views)}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>{saveLabel(words, saving || writing, published)}</span>
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
              {bar.openPage}
              <ExternalLink aria-hidden />
              <span className="sr-only">{bar.newTab}</span>
            </a>
          ) : null}
          {published ? (
            <Menu
              label={bar.pageActions}
              align="end"
              triggerLabel={bar.moreActions}
              triggerClassName={buttonClasses({ variant: "ghost", size: "icon" })}
              trigger={<Ellipsis aria-hidden />}
              items={[
                {
                  label: bar.openPage,
                  icon: ExternalLink,
                  onSelect: () => window.open(href, "_blank", "noopener,noreferrer"),
                },
                "separator",
                {
                  label: bar.takeDown,
                  icon: EyeOff,
                  description: bar.takeDownHint,
                  tone: "danger",
                  disabled: saving,
                  onSelect: () => void setPublished(false, words.store),
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
        {copied ? bar.linkCopied : ""}
      </span>

      <div className="fixed inset-x-4 bottom-4 z-20 flex justify-end lg:hidden">
        <div className="flex gap-1.5 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5">
          <Button variant="secondary" onClick={onPreview}>
            <Smartphone aria-hidden />
            {bar.preview}
          </Button>
          {main}
        </div>
      </div>
    </header>
  );
}
