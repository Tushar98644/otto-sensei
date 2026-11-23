import type { Metadata } from "next";
import { pageMetadata } from "@/components/site/page-metadata";
import { TrackView } from "@/lib/analytics/track-view";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { HOME_PAGE } from "@/lib/seo-pages/pages";
import { ExtensionShowcase } from "./_components/extension-showcase";
import { Faq } from "./_components/faq";
import { FeaturesOverview } from "./_components/features-overview";
import { FinalCta } from "./_components/final-cta";
import { Hero } from "./_components/hero";
import { HomeUpload } from "./_components/home-upload";
import { HowItWorks } from "./_components/how-it-works";
import { JobsShowcase } from "./_components/jobs-showcase";
import { LazySections } from "./_components/lazy-sections";
import { PortfolioShowcase } from "./_components/portfolio-showcase";
import { PricingTeaser } from "./_components/pricing-teaser";
import { SmoothScroll } from "./_components/smooth-scroll";
import { WebsiteJsonLd } from "./_components/website-json-ld";
import { WontDo } from "./_components/wont-do";

export const metadata: Metadata = pageMetadata(HOME_PAGE);

export const revalidate = 3600;

export default async function HomePage() {
  const jobCounts = await loadJobCounts();
  return (
    <>
      <WebsiteJsonLd />
      <TrackView event="landing_viewed" />
      <SmoothScroll />
      <HomeUpload />
      <Hero />
      <HowItWorks />
      <FeaturesOverview />
      <JobsShowcase jobCounts={jobCounts} />
      <ExtensionShowcase />
      <PortfolioShowcase />
      <WontDo />
      <PricingTeaser />
      <Faq />
      <FinalCta />
      <LazySections />
    </>
  );
}
