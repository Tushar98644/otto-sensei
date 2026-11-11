import type { ReactNode } from "react";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { Section, SectionHeader } from "./section";

type Pledge = { claim: string; reason: ReactNode };

// Each claim here must stay true of the product. Change the copy if the behavior changes.
const PLEDGES: readonly Pledge[] = [
  {
    claim: "Make up a score.",
    reason: "You get clear checks with reasons, not a mystery number out of 100.",
  },
  {
    claim: "Invent your numbers.",
    reason: "Otto asks for your real numbers and results, and you approve every change.",
  },
  {
    claim: "Charge you to download.",
    reason: "Edit and download as many PDFs as you like. No paywall at the last step.",
  },
  {
    claim: "Keep your file.",
    reason: (
      <>
        We read your upload to get the text, then let it go. Your resumes stay in your browser
        unless you sign in to back them up.{" "}
        <TextLink href={ROUTES.privacy}>How we handle data</TextLink>
      </>
    ),
  },
];

export function WontDo() {
  return (
    <Section labelledBy="wont-do-title">
      <SectionHeader id="wont-do-title" title="What Otto won’t do" />
      <ul role="list" className="mt-12 divide-y divide-border border-y border-border sm:mt-16">
        {PLEDGES.map(({ claim, reason }) => (
          <li key={claim} className="grid gap-2 py-8 sm:grid-cols-2 sm:gap-8">
            <p className="font-display text-3xl/9 text-ink sm:text-4xl/10">{claim}</p>
            <p className="max-w-prose text-base/7 text-muted sm:pt-1">{reason}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
