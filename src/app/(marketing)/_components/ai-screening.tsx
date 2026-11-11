import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { Section, SectionHeader } from "./section";

type Point = { title: string; text: string; link: { href: string; label: string } };

// Each point must stay true of the product and point to where a visitor can see it. Change the
// copy if the behavior changes. No scores, no "guaranteed", no numbers about employers.
const POINTS: readonly Point[] = [
  {
    // src/components/pdf/formats.test.tsx and templates.test.tsx read every format back.
    title: "Every format reads top to bottom",
    text: "We test every PDF format so its text reads top to bottom in the right order, with headings on their own lines, on Letter and A4 paper.",
    link: { href: ROUTES.studio, label: "Try it on your resume" },
  },
  {
    title: "See what hiring software reads",
    text: "The recruiter view shows the text hiring software pulls from your file, with a plain check and a reason for each problem.",
    link: { href: "#how-recruiter-view", label: "See the recruiter view" },
  },
  {
    title: "Otto does the busywork",
    text: "Every day Otto reads new jobs and matches them to your resume. On Pro he also tailors it to a job, drafts cover letters and preps you for interviews.",
    link: { href: ROUTES.pricing, label: "See what Pro includes" },
  },
  {
    // The ProfilePage data on /p/<slug> (src/lib/portfolio/json-ld.ts).
    title: "A portfolio AI can read too",
    text: "Your portfolio page carries a machine-readable summary of what it shows, so search engines and AI agents read your name, role, work and skills as clearly as people do. Nothing you hide goes in.",
    link: { href: "#portfolio", label: "See the portfolio designs" },
  },
];

export function AiScreening() {
  return (
    <Section id="ai-screening" labelledBy="ai-screening-title">
      <SectionHeader id="ai-screening-title" title="Built for AI screening">
        Hiring software reads and ranks resumes before a person does, and more and more of it uses
        AI. Otto makes sure it reads yours right.
      </SectionHeader>
      <ul role="list" className="mt-12 divide-y divide-border border-y border-border sm:mt-16">
        {POINTS.map(({ title, text, link }) => (
          <li key={title} className="grid gap-2 py-8 sm:grid-cols-2 sm:gap-8">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
            <p className="max-w-prose text-base/7 text-muted">
              {text} <TextLink href={link.href}>{link.label}</TextLink>
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
