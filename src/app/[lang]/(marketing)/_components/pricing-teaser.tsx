import { ROUTES } from "@/components/site/routes";
import { applicationLimit, PLANS, PRO_TRIAL, resumeLimit } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { trialOffered } from "@/lib/billing/intervals";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import type { HomeProps } from "./home-copy";
import type { PriceCopy } from "./price-copy";
import { Section, SectionHeader, SectionLink } from "./section";

const plan = (chunk: string) => <strong className="font-medium text-ink">{chunk}</strong>;

export function PricingTeaser({ t, format, href, prices }: HomeProps & { prices: PriceCopy }) {
  const words = t.pricingTeaser;
  const { free, pro } = PLANS;
  const close = trialOffered()
    ? fmt(words.trial, { days: format.number(PRO_TRIAL.days), price: prices.trialPrice() })
    : prices.cancelAnytime;
  return (
    <Section
      labelledBy="pricing-teaser-title"
      lazySize="[contain-intrinsic-size:auto_430px] sm:[contain-intrinsic-size:auto_360px]"
    >
      <SectionHeader
        id="pricing-teaser-title"
        eyebrow={words.eyebrow}
        title={
          <>
            {words.title} <em className={cn("block", displayItalic.className)}>{words.titleEm}</em>
          </>
        }
      />
      <ul role="list" className="mt-8 flex max-w-prose flex-col gap-3 text-lg/7 text-muted">
        <li>
          {rich(
            words.free,
            { b: plan },
            {
              plan: free.name,
              resumes: format.plural(words.resumes, resumeLimit("free")),
              fixes: format.number(free.limits.fix),
            },
          )}
        </li>
        <li>
          {rich(
            words.pro,
            { b: plan },
            {
              plan: pro.name,
              price: prices.planPrice("pro", "month"),
              resumes: format.plural(words.resumes, resumeLimit("pro")),
              applications: format.plural(words.trackedApplications, applicationLimit("pro")),
              close,
            },
          )}
        </li>
      </ul>
      <SectionLink href={href(ROUTES.pricing)}>{words.link}</SectionLink>
    </Section>
  );
}
