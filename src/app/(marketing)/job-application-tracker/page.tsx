import type { Metadata } from "next";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { applicationLimit, PLANS } from "@/config/plans";
import { pluralize } from "@/lib/utils";
import { RELATED, TRACKER_PAGE } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FeaturePage, withTrial } from "../_components/feature-page";
import { TRACKER } from "./content";

export const metadata: Metadata = pageMetadata(TRACKER_PAGE);

const count = new Intl.NumberFormat("en-US");

export default function JobApplicationTrackerPage() {
  const { free, pro, max } = PLANS;
  return (
    <FeaturePage
      path={TRACKER_PAGE.path}
      crumb="Job application tracker"
      eyebrow="Application tracker"
      title={
        <>
          A job application tracker{" "}
          <em className={displayItalic.className}>that keeps up with your inbox.</em>
        </>
      }
      content={TRACKER}
      action={{ href: ROUTES.dashboardApplications, label: "Track my applications" }}
      planNote={withTrial(
        `${free.name} tracks ${pluralize(applicationLimit("free"), "application")}, ${pro.name} up to ${count.format(applicationLimit("pro"))} with email updates, and ${max.name} up to ${count.format(applicationLimit("max"))}.`,
      )}
      check={{
        title: "Send a resume that reads well",
        text: "Before you log the next application, see which of the post's skills your resume shows and what hiring software reads from your file. Both checks are free.",
      }}
      closing={{
        title: "Every application, on one board.",
        pose: "read",
        art: "Otto the otter, reading a job application",
      }}
      related={[RELATED.coverLetters, RELATED.interviewPrep, RELATED.portfolio, RELATED.examples]}
    />
  );
}
