import type { Metadata } from "next";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { INTERVIEW_PREP_PAGE, RELATED } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FeaturePage, withTrial } from "../_components/feature-page";
import { INTERVIEW_PREP } from "./content";

export const metadata: Metadata = pageMetadata(INTERVIEW_PREP_PAGE);

export default function InterviewPrepPage() {
  const { pro } = PLANS;
  return (
    <FeaturePage
      path={INTERVIEW_PREP_PAGE.path}
      crumb="Interview prep"
      eyebrow={`Interview prep · ${pro.name}`}
      title={
        <>
          AI interview prep <em className={displayItalic.className}>built from your own resume.</em>
        </>
      }
      content={INTERVIEW_PREP}
      action={{ href: ROUTES.dashboardInterview, label: "Prep for an interview" }}
      planNote={withTrial(
        `Comes with ${pro.name}, ${planPrice("pro", "month")} a month for ${pro.limits.letter} interview preps, letters, messages and answers.`,
      )}
      check={{
        title: "See what the post asks for",
        text: "The job match check lists the skills a post names and where your resume shows each one, a good place to start your prep. It's free, with no sign-in.",
      }}
      closing={{
        title: "Walk in knowing what you'll say.",
        pose: "think",
        art: "Otto the otter, thinking about an interview question",
      }}
      related={[RELATED.coverLetters, RELATED.tracker, RELATED.portfolio, RELATED.examples]}
    />
  );
}
