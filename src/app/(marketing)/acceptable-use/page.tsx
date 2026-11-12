import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Acceptable use policy",
  description: `What ${BRAND.name} and its AI writing tools may and may not be used for.`,
  path: ROUTES.acceptableUse,
});

export default function AcceptableUsePage() {
  const mailto = `mailto:${BRAND.supportEmail}`;
  return (
    <LegalPage title="Acceptable use policy">
      <p>
        {BRAND.name} helps people with their job search: checking and improving resumes, tailoring
        them to a job, writing cover letters and answers to application questions, preparing for
        interviews, finding jobs and building a portfolio page. This policy says what it may and may
        not be used for. It is part of our <Link href={ROUTES.terms}>terms of service</Link>.
      </p>

      <h2>What the AI tools are for</h2>
      <p>
        The AI writing tools write and improve job-search text from your own resume and the job
        posts you give them. Use them only for that.
      </p>

      <h2>Not allowed</h2>
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

      <h2>How we enforce it</h2>
      <p>
        The AI is instructed to write only professional job-search text and to refuse or leave out
        anything this policy forbids. Automated safety checks also block sexual or explicit content
        in what Otto writes and on public pages (portfolios and shared resume links). We may remove
        content that breaks this policy, and suspend or close the account that created it.
      </p>

      <h2>The AI behind it</h2>
      <p>
        {BRAND.name} is an independent product. Its AI features run on third-party AI models,
        reached through OpenRouter. We are not affiliated with or endorsed by the companies that
        make those models. Our <Link href={ROUTES.privacy}>privacy policy</Link> says what text is
        sent and how it is protected.
      </p>

      <h2>Report a problem</h2>
      <p>
        Seen something that breaks this policy? Email <a href={mailto}>{BRAND.supportEmail}</a>. We
        reply within 3 business days.
      </p>
    </LegalPage>
  );
}
