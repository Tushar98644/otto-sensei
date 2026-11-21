import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Otto } from "@/components/mascot/otto";
import { JobMatchTool } from "@/components/match-check/job-match-tool";
import { IntentLink } from "@/components/site/intent-link";
import { HERO_CTA_ID } from "@/components/site/page-cta";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { candidateCount } from "@/lib/match-check/vocabulary";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { type FaqItem, FaqList } from "../_components/faq-list";
import { SECTION_TITLE_CLASSES } from "../_components/section";

export const metadata: Metadata = pageMetadata({
  title: "Free resume to job match check",
  description:
    "Paste your resume and a job post or its link to see which skills, tools and licences the post names, where your resume shows each one and which are missing. Counts, not a made-up score. Free, no sign-in, nothing stored.",
  path: SEO_PATHS.jobMatch,
});

const known = Math.round(candidateCount() / 50) * 50;

const faq: readonly FaqItem[] = [
  {
    question: "What does the check look for?",
    answer: `The skills, tools, licences and languages the post names, from about ${known} that Otto knows, such as Python, Figma, Salesforce, BLS or fluent Spanish. He looks for each one in your resume and shows you the line it's in.`,
  },
  {
    question: "How does it tell must-haves from nice-to-haves?",
    answer:
      "From the post's own headings and words. A skill under “Requirements” or “What you'll need”, or next to “required” or “must”, is a must-have. One under “Nice to have”, or next to “a plus” or “preferred”, is a nice-to-have. When a post doesn't say, Otto doesn't guess.",
  },
  {
    question: "Why is there no match score?",
    answer:
      "A percentage would claim more than a word check knows. Hiring software and recruiters each weigh things their own way, so Otto shows you the counts and the lines and leaves the judging to you.",
  },
  {
    question: "What doesn't it check?",
    answer:
      "Meaning. It matches the post's words, so “led a team of five” won't count as “leadership”. It can't judge years of experience, degrees or how good your work was either, so it quotes those asks from the post for you to check. Real recruiters read for all of it.",
  },
  {
    question: "What does “Listed, not shown” mean?",
    answer:
      "The skill is in a list, such as your skills section or headline, but no line about your work says where you used it. Recruiters look for that, so “Rebuilt the billing service in Go” says more than “Go” in a list.",
  },
  {
    question: "Is my resume stored?",
    answer:
      "No. Pasted text is checked in your browser and never leaves it. An uploaded file goes to our server so its text can be read, the way hiring software reads it, and is then thrown away. A job link goes to our server too, which opens the post and sends its text back. You don't need an account.",
  },
  {
    question: "How is this different from tailoring?",
    answer: (
      <>
        This check shows what&apos;s already there. Tailoring on Pro goes further: Otto reads the
        post for meaning, puts your best lines for the job first, writes a summary for it and helps
        you add lines for what&apos;s missing, from facts you give him, in a tailored copy. See{" "}
        <TextLink href={ROUTES.pricing}>what Pro includes</TextLink>.
      </>
    ),
  },
];

export default function JobMatchPage() {
  return (
    <>
      <div className="container-page pt-12 sm:pt-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow className="mb-4">Free, no sign-in</Eyebrow>
          <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
            Does your resume{" "}
            <em className={cn("block", displayItalic.className)}>match this job?</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg/7 text-balance text-muted sm:text-xl/8">
            See which skills the post names and where your resume shows each. No made-up score.
          </p>
        </div>
        <Panel id={HERO_CTA_ID} className="mt-10 sm:mt-12">
          <JobMatchTool />
        </Panel>
        <section
          aria-labelledby="job-match-faq-title"
          className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
        >
          <h2 id="job-match-faq-title" className={SECTION_TITLE_CLASSES}>
            What the check does
          </h2>
          <FaqList items={faq} className="lg:col-span-2" />
        </section>
      </div>
      <ClosingPanel />
    </>
  );
}

// The check above is this page's main action, so the studio link here is a second one.
function ClosingPanel() {
  return (
    <section aria-labelledby="job-match-end-title" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:py-24">
          <Otto
            pose="read"
            size={144}
            title="Otto the otter, reading a resume"
            className="size-28 sm:size-36"
          />
          <h2 id="job-match-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
            See what the software sees.
          </h2>
          <IntentLink
            href={ROUTES.studio}
            className={buttonClasses({
              variant: "secondary",
              size: "lg",
              className: "mt-8 w-full sm:w-auto",
            })}
          >
            Check my resume
            <ArrowRight />
          </IntentLink>
          <p className="mt-3 text-sm text-subtle">
            Checking and PDFs are free. Pro and Max add more help from Otto.
          </p>
        </div>
      </div>
    </section>
  );
}
