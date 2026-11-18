import type { Metadata } from "next";
import { JobMatchTool } from "@/components/match-check/job-match-tool";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { candidateCount } from "@/lib/match-check/vocabulary";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { type FaqItem, FaqList } from "../_components/faq-list";
import { FinalCta } from "../_components/final-cta";
import { SECTION_TITLE_CLASSES } from "../_components/section";

export const metadata: Metadata = pageMetadata({
  title: "Free resume to job match check",
  description:
    "Paste your resume and a job post to see which skills, tools and licences the post names, where your resume shows each one and which are missing. Counts, not a made-up score. Free, no sign-in, nothing stored.",
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
      "No. Pasted text is checked in your browser and never leaves it. An uploaded file goes to our server so its text can be read, the way hiring software reads it, and is then thrown away. You don't need an account.",
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
      <div className="container-page pt-16 sm:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow className="mb-4">Free, no sign-in</Eyebrow>
          <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
            Does your resume{" "}
            <em className={cn("block", displayItalic.className)}>match this job?</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg/7 text-muted sm:text-xl/8">
            See which skills the post names, where your resume shows each one, and what&apos;s
            missing. Counts, not a made-up score.
          </p>
        </div>
        <Panel className="mt-12 sm:mt-16">
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
      <FinalCta />
    </>
  );
}
