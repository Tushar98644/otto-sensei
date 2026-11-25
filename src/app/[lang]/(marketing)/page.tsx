import type { Metadata } from "next";
import { TITLE_SUFFIX } from "@/components/site/page-metadata";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { TrackView } from "@/lib/analytics/track-view";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { HOME_PAGE } from "@/lib/seo-pages/pages";
import { EmailTrackingShowcase } from "./_components/email-tracking-showcase";
import { ExtensionShowcase } from "./_components/extension-showcase";
import { Faq, homeFaq } from "./_components/faq";
import { FinalCta } from "./_components/final-cta";
import { Hero } from "./_components/hero";
import { HomeUpload } from "./_components/home-upload";
import { HowItWorks } from "./_components/how-it-works";
import { InterviewPrepShowcase } from "./_components/interview-prep-showcase";
import { JobsShowcase } from "./_components/jobs-showcase";
import { LazySections } from "./_components/lazy-sections";
import { PortfolioShowcase } from "./_components/portfolio-showcase";
import { priceCopy } from "./_components/price-copy";
import { PricingTeaser } from "./_components/pricing-teaser";
import { homeJsonLdLocale, WebsiteJsonLd } from "./_components/website-json-ld";
import { WontDo } from "./_components/wont-do";

const PATH = HOME_PAGE.path;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages("home");
  return localizedMetadata({
    title: `${meta.title}${TITLE_SUFFIX}`,
    description: meta.description,
    path: PATH,
    absoluteTitle: true,
  });
}

export const revalidate = 3600;

export default async function HomePage() {
  await requirePublished(PATH);
  const [t, pricing, common, locale, format, href, jobCounts] = await Promise.all([
    getMessages("home"),
    getMessages("pricing"),
    getMessages("common"),
    getLocale(),
    getFormat(),
    getLocalize(),
    loadJobCounts(),
  ]);
  const home = { t, format, href, common };
  const prices = priceCopy(pricing, format);
  const faq = homeFaq(t, format, href, prices);
  return (
    <>
      <WebsiteJsonLd faq={faq} page={homeJsonLdLocale(locale, common.brand.description, href)} />
      <TrackView event="landing_viewed" />
      <HomeUpload
        copy={{ opening: t.upload.opening, oneFile: t.upload.oneFile, problems: t.upload.problems }}
      />
      <Hero {...home} jobCounts={jobCounts} />
      <HowItWorks {...home} />
      <JobsShowcase {...home} jobCounts={jobCounts} />
      <EmailTrackingShowcase {...home} />
      <InterviewPrepShowcase {...home} />
      <ExtensionShowcase {...home} />
      <PortfolioShowcase {...home} />
      <WontDo {...home} />
      <PricingTeaser {...home} prices={prices} />
      <Faq t={t} items={faq} />
      <FinalCta {...home} />
      <LazySections />
    </>
  );
}
