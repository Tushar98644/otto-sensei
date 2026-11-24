import type { Metadata } from "next";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { COVER_LETTER_PAGE, RELATED } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FeaturePage, withTrial } from "../_components/feature-page";
import { LETTERS } from "./content";

export const metadata: Metadata = pageMetadata(COVER_LETTER_PAGE);

export default function CoverLetterGeneratorPage() {
  const { pro } = PLANS;
  return (
    <FeaturePage
      path={COVER_LETTER_PAGE.path}
      crumb="Cover letter generator"
      eyebrow={`Cover letters · ${pro.name}`}
      title={
        <>
          An AI cover letter generator{" "}
          <em className={displayItalic.className}>that sticks to your facts.</em>
        </>
      }
      content={LETTERS}
      action={{ href: ROUTES.dashboardLetters, label: "Write a cover letter" }}
      planNote={withTrial(
        `Comes with ${pro.name}, ${planPrice("pro", "month")} a month for ${pro.limits.letter} letters, messages, answers and interview preps.`,
      )}
      check={{
        title: "Check the match before you write",
        text: "A letter lands better when your resume already shows what the post asks for. The job match check and the recruiter view are free, with no card.",
      }}
      closing={{
        title: "A letter for every job, from your own resume.",
        pose: "point",
        art: "Otto the otter, pointing at a letter",
      }}
      related={[RELATED.tracker, RELATED.interviewPrep, RELATED.portfolio, RELATED.examples]}
    />
  );
}
