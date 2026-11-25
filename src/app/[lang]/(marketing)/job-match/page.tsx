import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Otto } from "@/components/mascot/otto";
import { JobMatchTool } from "@/components/match-check/job-match-tool";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { appUrl } from "@/lib/env";
import { faqJsonLd, freeToolJsonLd } from "@/lib/seo/json-ld";
import { JOB_MATCH_PAGE } from "@/lib/seo-pages/pages";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { SECTION_TITLE_CLASSES } from "../_components/section";
import { jobMatchFaq } from "./faq";

const PATH = JOB_MATCH_PAGE.path;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages("jobMatch");
  return localizedMetadata({ title: meta.title, description: meta.description, path: PATH });
}

export default async function JobMatchPage() {
  await requirePublished(PATH);
  const t = await getMessages("jobMatch");
  const tool = await getMessages("matchCheck");
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const faq = jobMatchFaq(t.faq, format, href);
  const app = {
    name: fmt(t.toolName, { brand: BRAND.name }),
    path: href(PATH),
    description: t.intro,
  };
  return (
    <>
      <JsonLd data={freeToolJsonLd(app, appUrl(), locale)} />
      <JsonLd data={faqJsonLd(faqEntries(faq), locale)} />
      <div className="container-page pt-16 sm:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow className="mb-4">{t.eyebrow}</Eyebrow>
          <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
            {t.title} <em className={cn("block", displayItalic.className)}>{t.titleEm}</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg/7 text-muted sm:text-xl/8">{t.intro}</p>
        </div>
        <Panel className="mt-12 sm:mt-16">
          <JobMatchTool t={tool} locale={locale} />
        </Panel>
        <section
          aria-labelledby="job-match-faq-title"
          className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
        >
          <h2 id="job-match-faq-title" className={SECTION_TITLE_CLASSES}>
            {t.faqTitle}
          </h2>
          <FaqList items={faq} className="lg:col-span-2" />
        </section>
      </div>
      <ClosingPanel t={t.closing} />
    </>
  );
}

// The check above is this page's main action, so the studio link here is a second one.
function ClosingPanel({ t }: { t: Messages["jobMatch"]["closing"] }) {
  return (
    <section aria-labelledby="job-match-end-title" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:py-24">
          <Otto pose="read" size={144} title={t.otto} className="size-28 sm:size-36" />
          <h2 id="job-match-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
            {t.title}
          </h2>
          <IntentLink
            href={ROUTES.studio}
            className={buttonClasses({
              variant: "secondary",
              size: "lg",
              className: "mt-8 w-full sm:w-auto",
            })}
          >
            {t.cta}
            <ArrowRight />
          </IntentLink>
          <p className="mt-3 text-sm text-subtle">{t.note}</p>
        </div>
      </div>
    </section>
  );
}
