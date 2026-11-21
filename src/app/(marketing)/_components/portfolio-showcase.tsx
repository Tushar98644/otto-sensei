import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { PortfolioShot } from "@/components/portfolio/portfolio-shot";
import type { PortfolioShotId } from "@/components/portfolio/portfolio-shot-data";
import { PRO_TRIAL } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
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
        Not your resume as a web page. Pick one of eight designs and Otto fills it with your
        projects, work, writing and links. We host it, so there&apos;s nothing to set up. It comes
        with Pro{trialOffered() ? `, and you can start with a ${PRO_TRIAL.days}-day trial` : ""}.
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
      <SectionLink href={PORTFOLIO_ROUTE}>Make my portfolio</SectionLink>
    </Section>
  );
}
