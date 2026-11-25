import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { PortfolioShot } from "@/components/portfolio/portfolio-shot";
import { PRO_TRIAL } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { trialOffered } from "@/lib/billing/intervals";
import { PORTFOLIO_PICKS, PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import type { HomeProps } from "./home-copy";
import { Section, SectionHeader, SectionLink } from "./section";

export function PortfolioShowcase({ t, format }: Pick<HomeProps, "t" | "format">) {
  const words = t.portfolio;
  const offer = trialOffered()
    ? fmt(words.offerTrial, { days: format.number(PRO_TRIAL.days) })
    : words.offer;
  return (
    <Section
      id="portfolio"
      labelledBy="portfolio-showcase-title"
      lazySize="[contain-intrinsic-size:auto_1410px] sm:[contain-intrinsic-size:auto_660px] lg:[contain-intrinsic-size:auto_700px]"
    >
      <SectionHeader
        id="portfolio-showcase-title"
        eyebrow={words.eyebrow}
        title={
          <>
            {words.title} <em className={cn("block", displayItalic.className)}>{words.titleEm}</em>
          </>
        }
      >
        {fmt(words.intro, { count: format.number(PORTFOLIO_TEMPLATE_IDS.length), offer })}
      </SectionHeader>
      <ul className="mt-12 grid gap-x-6 gap-y-8 sm:mt-16 sm:grid-cols-3">
        {PORTFOLIO_PICKS.map((id) => (
          <li key={id} className="flex flex-col gap-3">
            <PortfolioShot
              id={id}
              sizes="(min-width: 640px) 30vw, 90vw"
              className="rounded-xl ring-1 ring-border"
            />
            <div>
              <p className="text-base/7 font-medium text-ink">{PORTFOLIO_TEMPLATE_INFO[id].name}</p>
              <p className="text-sm/6 text-muted">{words.templates[id]}</p>
            </div>
          </li>
        ))}
      </ul>
      <SectionLink href={PORTFOLIO_ROUTE}>{words.link}</SectionLink>
    </Section>
  );
}
