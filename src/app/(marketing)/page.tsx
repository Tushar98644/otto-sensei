import type { Metadata } from "next";
import { pageMetadata } from "@/components/site/page-metadata";
import { BRAND } from "@/config/brand";
import { TrackView } from "@/lib/analytics/track-view";
import { Faq } from "./_components/faq";
import { FinalCta } from "./_components/final-cta";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { PricingTeaser } from "./_components/pricing-teaser";
import { WebsiteJsonLd } from "./_components/website-json-ld";
import { WontDo } from "./_components/wont-do";

export const metadata: Metadata = pageMetadata({
  title: `Free ATS resume checker and builder · ${BRAND.name}`,
  absoluteTitle: true,
  description: BRAND.description,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <WebsiteJsonLd />
      <TrackView event="landing_viewed" />
      <Hero />
      <HowItWorks />
      <WontDo />
      <PricingTeaser />
      <Faq />
      <FinalCta />
    </>
  );
}
