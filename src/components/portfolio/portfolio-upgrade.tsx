"use client";

import { Check, Expand } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useTryProLabel } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PRO_TRIAL } from "@/config/plans";
import { trialSentence } from "@/lib/billing/prices";
import { emptyContent } from "@/lib/portfolio/content";
import { contentView } from "@/lib/portfolio/content-view";
import { suggestSlug } from "@/lib/portfolio/slug";
import { PORTFOLIO_TEMPLATE_INFO, templateOrder } from "@/lib/portfolio/templates";
import {
  PORTFOLIO_TEMPLATE_IDS,
  portfolioPath,
  type Portfolio,
  type PortfolioTemplateId,
} from "@/lib/portfolio/types";
import { portfolioView } from "@/lib/portfolio/view";
import type { Resume } from "@/lib/resume/schema";
import type { TemplateSample } from "./live-template";
import { PORTFOLIO_LINES } from "./lines";
import { PreviewSourceBar, usePreviewSource } from "./preview-source";
import { usePortfolioUrl } from "./use-portfolio-url";
import { TemplatePreview } from "./template-preview";

// Loaded on the first "Preview full page": it brings every template with it.
const FullPortfolioPreview = lazy(() =>
  import("./full-preview").then((module) => ({ default: module.FullPortfolioPreview })),
);

/** The page a Free account would get, in any design: its own resume (and kept settings), or null. */
export function freeSample(
  portfolio: Portfolio | null,
  candidates: readonly Resume[],
): TemplateSample | null {
  const source = portfolio
    ? (candidates.find((resume) => resume.id === portfolio.resumeId) ?? null)
    : null;
  const resume = portfolio
    ? portfolio.sync && source
      ? source
      : portfolio.snapshot
    : (candidates[0] ?? null);
  if (!resume) return null;
  const view = portfolioView(
    resume,
    portfolio
      ? {
          showEmail: portfolio.showEmail,
          showPhone: portfolio.showPhone,
          hiddenSections: portfolio.hiddenSections,
        }
      : { showEmail: false, showPhone: false, hiddenSections: [] },
  );
  return {
    view,
    content: contentView({
      view,
      content: portfolio?.content ?? emptyContent(),
      github: portfolio?.github ?? null,
    }),
  };
}

// Sells the page, not the plan. Jordan's sample starts on when their resume is too thin to judge
// a design by (./preview-source.tsx). Someone who dropped to Free is told it's kept, offline.
export function PortfolioUpgrade({
  portfolio,
  candidates,
}: {
  portfolio: Portfolio | null;
  candidates: readonly Resume[];
}) {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<PortfolioTemplateId | null>(null);
  const tryLabel = useTryProLabel();
  const trial = me?.billing.trial === true;
  const own = useMemo(() => freeSample(portfolio, candidates), [portfolio, candidates]);
  const choice = usePreviewSource(own);
  const slug = portfolio?.slug ?? suggestSlug(own?.view.name ?? "");
  const url = usePortfolioUrl(slug).replace(/^https?:\/\//, "") || portfolioPath(slug);

  return (
    <section className="rounded-3xl bg-surface px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow className="mb-3">Hosted for you, no setup</Eyebrow>
          <h2 className="font-sans text-2xl/8 font-medium tracking-tight text-ink">
            {portfolio ? "Your page is offline for now" : "A real portfolio, live at your own link"}
          </h2>
          <p className="mt-2 text-base/7 text-pretty text-muted">
            {portfolio
              ? "Portfolios come with Pro and Max. Your page and its settings are kept, so it comes back as it was."
              : "Not your resume as a web page: a portfolio site with your projects, work, writing and links, in one of eight designs."}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm/6 text-ink">
            <li className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />
              <span>
                Live at <span className="font-mono break-all">{url}</span>
              </span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />
              We host it: no domain, server or code to set up.
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />
              Your resume edits flow in, and you can switch designs any time.
            </li>
          </ul>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
            {tryLabel}
          </Button>
          <p className="text-sm/5 text-subtle">
            {trial ? trialSentence() : "Portfolios come with Pro and Max."}
          </p>
        </div>
      </div>

      <OttoNote
        size="sm"
        className="mt-8"
        message={
          !own
            ? PORTFOLIO_LINES.previewsSample
            : choice.source === "own"
              ? PORTFOLIO_LINES.previews
              : PORTFOLIO_LINES.previewsThin
        }
      />

      <PreviewSourceBar choice={choice} className="mt-6" />

      <ul className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {templateOrder(PORTFOLIO_TEMPLATE_IDS).map((id) => {
          const { name, description } = PORTFOLIO_TEMPLATE_INFO[id];
          return (
            <li key={id} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setFull(id)}
                aria-label={`Preview ${name} full page`}
                className="group relative block rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <TemplatePreview
                  id={id}
                  sample={choice.sample}
                  sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
                  className="transition-shadow group-hover:ring-2 group-hover:ring-ink/20"
                />
              </button>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm/6 font-medium text-ink">{name}</p>
                  <p className="text-sm/5 text-muted">{description}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setFull(id)}
                  aria-label={`Preview ${name} full page`}
                >
                  <Expand aria-hidden />
                  Full page
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {full ? (
        <Suspense fallback={null}>
          <FullPortfolioPreview
            id={full}
            own={own}
            onChange={setFull}
            onClose={() => setFull(null)}
            // One modal at a time: the preview closes, then the plan dialog opens over the page.
            action={{
              label: tryLabel,
              onSelect: () => {
                setFull(null);
                setOpen(true);
              },
            }}
          />
        </Suspense>
      ) : null}

      <LazyUpgradeDialog
        open={open}
        onOpenChange={setOpen}
        plan={PRO_TRIAL.plan}
        interval={PRO_TRIAL.interval}
      />
    </section>
  );
}
