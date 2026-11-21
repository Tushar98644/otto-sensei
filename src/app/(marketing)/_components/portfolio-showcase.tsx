import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { PortfolioShot } from "@/components/portfolio/portfolio-shot";
import type { PortfolioShotId } from "@/components/portfolio/portfolio-shot-data";
import { PLANS, PRO_TRIAL } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { trialPrice } from "@/lib/billing/prices";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import { Section, SectionHeader, SectionLink } from "./section";

const SHOWN: readonly PortfolioShotId[] = ["bento", "dock", "reel"];

export function PortfolioShowcase() {
  return (
    <Section id="portfolio" labelledBy="portfolio-showcase-title">
      <SectionHeader
        id="portfolio-showcase-title"
        eyebrow="Portfolio · hosted for you"
        title={
          <>
            A real portfolio,{" "}
            <em className={cn("block", displayItalic.className)}>live at your own link.</em>
          </>
        }
      >
        Pick one of eight designs. Otto fills it with your projects, work and links, and we host it.
      </SectionHeader>
      <ul className="mt-12 grid gap-x-6 gap-y-8 sm:mt-16 sm:grid-cols-3">
        {SHOWN.map((id) => {
          const { name, description } = PORTFOLIO_TEMPLATE_INFO[id];
          return (
            <li key={id} className="flex flex-col gap-3">
              <PortfolioShot
                id={id}
                sizes="(min-width: 640px) 30vw, 90vw"
                className="rounded-xl ring-1 ring-border"
              />
              <div>
                <p className="text-base/7 font-medium text-ink">{name}</p>
                <p className="text-sm/6 text-muted">{description}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <SectionLink
        href={PORTFOLIO_ROUTE}
        aside={
          trialOffered()
            ? `Comes with ${PLANS.pro.name}. Try ${PRO_TRIAL.days} days for ${trialPrice()}.`
            : `Comes with ${PLANS.pro.name}.`
        }
      >
        Make my portfolio
      </SectionLink>
    </Section>
  );
}
