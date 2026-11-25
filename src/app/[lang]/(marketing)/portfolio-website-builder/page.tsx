import type { Metadata } from "next";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { pageMetadata } from "@/components/site/page-metadata";
import { PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { PORTFOLIO_PAGE, RELATED } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FeaturePage, withTrial } from "../_components/feature-page";
import { PORTFOLIO } from "./content";

export const metadata: Metadata = pageMetadata(PORTFOLIO_PAGE);

export default function PortfolioWebsiteBuilderPage() {
  const { pro } = PLANS;
  return (
    <FeaturePage
      path={PORTFOLIO_PAGE.path}
      crumb="Portfolio website builder"
      eyebrow={`Portfolio · ${pro.name}`}
      title={
        <>
          From resume to portfolio website,{" "}
          <em className={displayItalic.className}>hosted at your own link.</em>
        </>
      }
      content={PORTFOLIO}
      action={{ href: PORTFOLIO_ROUTE, label: "Make my portfolio" }}
      planNote={withTrial(
        `Comes with ${pro.name}, ${planPrice("pro", "month")} a month with hosting included.`,
      )}
      check={{
        title: "Start from a resume that reads well",
        text: "Your portfolio is built from your resume, so check it first: see what hiring software reads from your file, or match it to a job. Both are free.",
      }}
      closing={{
        title: "Your resume, as a site of its own.",
        pose: "wave",
        art: "Otto the otter, waving",
      }}
      related={[RELATED.coverLetters, RELATED.tracker, RELATED.interviewPrep, RELATED.examples]}
    />
  );
}
