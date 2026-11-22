import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { LegalPage, type LegalSection } from "../_components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Acceptable use policy for the AI writing tools",
  description: `What ${BRAND.name} and its AI writing tools may be used for: professional job-search text only. No explicit, hateful, illegal or deceptive content.`,
  path: ROUTES.acceptableUse,
});

const MAILTO = `mailto:${BRAND.supportEmail}`;

const SECTIONS: readonly LegalSection[] = [
  {
    title: "What the AI tools are for",
    body: (
      <p>
        The AI writing tools write and improve job-search text from your own resume and the job
        posts you give them. Use them only for that.
      </p>
    ),
  },
  {
    title: "Not allowed",
    body: (
      <ul>
        <li>
          Sexual, sexually explicit or sexually suggestive content, or any other NSFW (not safe for
          work) content.
        </li>
        <li>Hateful, harassing, threatening or violent content.</li>
        <li>Illegal content, or content that helps someone break the law.</li>
        <li>
          Deceptive content: fake credentials, made-up employers or degrees, or pretending to be
          someone else.
        </li>
        <li>Someone else&apos;s private data uploaded without their permission.</li>
        <li>
          Getting around the service&apos;s safeguards or limits, for example with scripts, bots or
          many accounts.
        </li>
      </ul>
    ),
  },
  {
    title: "How we enforce it",
    body: (
      <p>
        The AI is instructed to write only professional job-search text and to refuse or leave out
        anything this policy forbids. Automated safety checks also block sexual or explicit content
        in what Otto writes and on public pages (portfolios and shared resume links). We may remove
        content that breaks this policy, and suspend or close the account that created it.
      </p>
    ),
  },
  {
    title: "The AI behind it",
    body: (
      <p>
        {BRAND.name} is an independent product. Its AI features run on third-party AI models,
        reached through OpenRouter. We are not affiliated with or endorsed by the companies that
        make those models. Our <Link href={ROUTES.privacy}>privacy policy</Link> says what text is
        sent and how it is protected.
      </p>
    ),
  },
  {
    title: "Report a problem",
    body: (
      <p>
        Seen something that breaks this policy? Email <a href={MAILTO}>{BRAND.supportEmail}</a>. We
        reply within 3 business days.
      </p>
    ),
  },
];

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable use policy"
      intro={
        <p>
          {BRAND.name} helps people with their job search: checking and improving resumes, tailoring
          them to a job, writing cover letters and answers to application questions, preparing for
          interviews, finding jobs and building a portfolio page. This policy says what it may and
          may not be used for. It is part of our <Link href={ROUTES.terms}>terms of service</Link>.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
