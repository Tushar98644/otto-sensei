import type { Metadata } from "next";
import { pageMetadata } from "@/components/site/page-metadata";
import { BRAND } from "@/config/brand";
import { TrackView } from "@/lib/analytics/track-view";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { Faq } from "./_components/faq";
import { FinalCta } from "./_components/final-cta";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { PortfolioShowcase } from "./_components/portfolio-showcase";
import { PricingTeaser } from "./_components/pricing-teaser";
import { SmoothScroll } from "./_components/smooth-scroll";
import { WebsiteJsonLd } from "./_components/website-json-ld";
import { WontDo } from "./_components/wont-do";

export const metadata: Metadata = pageMetadata({
  title: `Free ATS resume checker and builder · ${BRAND.name}`,
  absoluteTitle: true,
  description: BRAND.description,
  path: "/",
});

// Built ahead of time; rebuilt at most hourly so the job counts stay current.
export const revalidate = 3600;

export default async function HomePage() {
  const jobCounts = await loadJobCounts();
  return (
    <>
      <WebsiteJsonLd />
      <TrackView event="landing_viewed" />
      <SmoothScroll />
      <Hero />
      <HowItWorks />
      <PortfolioShowcase />
      <WontDo />
      <PricingTeaser jobCounts={jobCounts} />
      <Faq />
      <FinalCta />
    </>
  );
}
