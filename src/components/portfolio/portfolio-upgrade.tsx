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
import { planPriceIn, trialPriceIn } from "@/components/account/local-prices";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { suggestSlug } from "@/lib/portfolio/slug";
import { portfolioPath, type Portfolio, type PortfolioTemplateId } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { PreviewSourceBar, usePreviewSource } from "./preview-source";
import { pageSample } from "./sample";
import { TemplateGallery } from "./template-gallery";
import { usePortfolioUrl } from "./use-portfolio-url";

const FullPortfolioPreview = lazy(() =>
  import("./full-preview").then((module) => ({ default: module.FullPortfolioPreview })),
);

export function PortfolioUpgrade({
  portfolio,
  candidates,
}: {
  portfolio: Portfolio | null;
  candidates: readonly Resume[];
}) {
  const words = useMessages("portfolio");
  const up = words.upgrade;
  const format = useFormat();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<PortfolioTemplateId | null>(null);
  const tryLabel = useTryProLabel();
  const trial = me?.billing.trial === true;
  const own = useMemo(() => pageSample(portfolio, candidates), [portfolio, candidates]);
  const choice = usePreviewSource(own);
  const slug = portfolio?.slug ?? suggestSlug(own?.view.name ?? "");
  const url = usePortfolioUrl(slug).replace(/^https?:\/\//, "") || portfolioPath(slug);

  return (
    <section className="rounded-3xl bg-surface px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow className="mb-3">{up.eyebrow}</Eyebrow>
          <h2 className="font-sans text-2xl/8 font-medium tracking-tight text-ink">
            {portfolio ? up.offlineTitle : up.title}
          </h2>
          <p className="mt-2 text-base/7 text-pretty text-muted">
            {portfolio ? up.offline : fmt(up.pitch, { count: PORTFOLIO_TEMPLATE_IDS.length })}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm/6 text-ink">
            <li className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />
              <span>
                {rich(
                  up.liveAt,
                  { b: (chunk) => <span className="font-mono break-all">{chunk}</span> },
                  { url },
                )}
              </span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />
              {up.hosted}
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />
              {up.flows}
            </li>
          </ul>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
            {tryLabel}
          </Button>
          <p className="text-sm/5 text-subtle">
            {trial
              ? fmt(up.trial, {
                  price: trialPriceIn(format),
                  days: PRO_TRIAL.days,
                  plan: planPriceIn(format, PRO_TRIAL.plan, PRO_TRIAL.interval),
                })
              : up.comesWith}
          </p>
        </div>
      </div>

      <OttoNote
        size="sm"
        className="mt-8"
        message={
          !own
            ? words.otto.previewsSample
            : choice.source === "own"
              ? words.otto.previews
              : words.otto.previewsThin
        }
      />

      <PreviewSourceBar choice={choice} className="mt-6" />

      <TemplateGallery
        className="mt-4"
        sample={choice.sample}
        onPreview={setFull}
        action={(id, name) => (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setFull(id)}
            aria-label={fmt(words.previewFull, { name })}
          >
            <Expand aria-hidden />
            {up.fullPage}
          </Button>
        )}
      />

      {full ? (
        <Suspense fallback={null}>
          <FullPortfolioPreview
            id={full}
            own={own}
            onChange={setFull}
            onClose={() => setFull(null)}
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
