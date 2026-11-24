import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Otto, type OttoPose } from "@/components/mascot/otto";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { trialHeadline, trialPrice } from "@/lib/billing/prices";
import { faqJsonLd } from "@/lib/seo/json-ld";
import type { RelatedLink } from "@/lib/seo-pages/pages";
import { cn } from "@/lib/utils";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { type FaqItem, FaqList, faqEntries } from "./faq-list";
import { type Note, NoteRows } from "./note-rows";
import { SECTION_TITLE_CLASSES } from "./section";

// The words a product page shares with llms-full.txt.
export type FeatureContent = {
  intro: string;
  featuresTitle: string;
  features: readonly Note[];
  steps: readonly Note[];
  faq: readonly FaqItem[];
};

export type FeatureAction = { href: string; label: string };

export type FeaturePageProps = {
  path: string;
  crumb: string;
  eyebrow: string;
  title: ReactNode;
  content: FeatureContent;
  action: FeatureAction;
  planNote: string;
  check: { title: string; text: string };
  closing: { title: string; pose: OttoPose; art: string };
  related: readonly RelatedLink[];
};

export function withTrial(sentence: string): string {
  return `${sentence} ${trialOffered() ? `${trialHeadline()} for ${trialPrice()}.` : "Cancel anytime."}`;
}

function Actions({
  action,
  note,
  className,
}: {
  action: FeatureAction;
  note: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <IntentLink
          href={action.href}
          className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
        >
          {action.label}
          <ArrowRight />
        </IntentLink>
        <IntentLink
          href={ROUTES.pricing}
          className={buttonClasses({
            variant: "secondary",
            size: "lg",
            className: "w-full sm:w-auto",
          })}
        >
          See what {PLANS.pro.name} includes
        </IntentLink>
      </div>
      <p className="mt-3 text-sm/6 text-pretty text-subtle">{note}</p>
    </div>
  );
}

function ClosingPanel({
  closing,
  action,
  note,
}: Pick<FeaturePageProps, "closing" | "action"> & { note: string }) {
  return (
    <section
      aria-labelledby="feature-end-title"
      className="mt-24 flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:mt-32 sm:py-24"
    >
      <Otto pose={closing.pose} size={144} title={closing.art} className="size-28 sm:size-36" />
      <h2 id="feature-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
        {closing.title}
      </h2>
      <IntentLink
        href={action.href}
        className={buttonClasses({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
      >
        {action.label}
        <ArrowRight />
      </IntentLink>
      <p className="mt-3 max-w-prose text-sm/6 text-pretty text-subtle">{note}</p>
    </section>
  );
}

export function FeaturePage({
  path,
  crumb,
  eyebrow,
  title,
  content,
  action,
  planNote,
  check,
  closing,
  related,
}: FeaturePageProps) {
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd data={faqJsonLd(faqEntries(content.faq))} />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: crumb, path },
        ]}
      />
      <PageIntro eyebrow={eyebrow} title={title}>
        <p>{content.intro}</p>
      </PageIntro>
      <Actions action={action} note={planNote} className="mt-8" />

      <section aria-labelledby="features-title" className="mt-24 sm:mt-32">
        <h2 id="features-title" className={H2_CLASSES}>
          {content.featuresTitle}
        </h2>
        <NoteRows notes={content.features} className="mt-8" />
      </section>

      <section aria-labelledby="steps-title" className="mt-24 sm:mt-32">
        <h2 id="steps-title" className={H2_CLASSES}>
          How it works
        </h2>
        <NoteRows notes={content.steps} numbered className="mt-8" />
      </section>

      <CheckCta className="mt-24 sm:mt-32" title={check.title}>
        {check.text}
      </CheckCta>

      <section
        aria-labelledby="feature-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2 id="feature-faq-title" className={H2_CLASSES}>
          Questions
        </h2>
        <FaqList items={content.faq} className="lg:col-span-2" />
      </section>

      <ClosingPanel closing={closing} action={action} note={planNote} />

      <RelatedLinks className="mt-24 sm:mt-32" links={related} />
    </div>
  );
}
