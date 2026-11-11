import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { PortfolioShot, type PortfolioShotId } from "@/components/portfolio/portfolio-shot";
import { buttonClasses } from "@/components/ui/button";
import { PRO_TRIAL } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { Section, SectionHeader } from "./section";

const SHOWN: readonly PortfolioShotId[] = ["bento", "dock", "reel"];

export function PortfolioShowcase() {
  return (
    <Section id="portfolio" labelledBy="portfolio-showcase-title">
      <SectionHeader
        id="portfolio-showcase-title"
        eyebrow="Portfolio · hosted for you"
        title={
          <>
            A real portfolio, <em className="block">live at your own link.</em>
          </>
        }
      >
        Not your resume as a web page. Pick one of eight designs and Otto fills it with your
        projects, work, writing and links. We host it, so there&apos;s nothing to set up. It comes
        with Pro{trialOffered() ? `, and you can try it free for ${PRO_TRIAL.days} days` : ""}.
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
      <Link
        href={PORTFOLIO_ROUTE}
        className={buttonClasses({ variant: "ghost", className: "mt-6 -ml-5" })}
      >
        Make my portfolio
        <ArrowRight />
      </Link>
    </Section>
  );
}
