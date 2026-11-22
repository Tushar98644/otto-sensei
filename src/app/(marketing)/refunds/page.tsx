import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IntentLink } from "@/components/site/intent-link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { PRO_TRIAL } from "@/config/plans";
import { LegalPage, type LegalSection } from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";
import { formatUsd } from "../_components/plan-features";

export const metadata: Metadata = pageMetadata({
  title: "Refund policy: cancelling Pro and Max",
  description: `Refunds for Pro and Max plans are handled by ${MERCHANT.name}, our merchant of record, under its buyer terms. Cancel anytime and you won't be charged again.`,
  path: ROUTES.refunds,
});

const BILLING_HREF = `${ROUTES.account}#plan`;

const MAILTO = `mailto:${BRAND.supportEmail}`;

const SUMMARY = [
  <>
    Cancel anytime from your account page. You keep your plan until the end of the period
    you&apos;ve paid for.
  </>,
  <>
    The {PRO_TRIAL.days}-day Pro trial costs {formatUsd(PRO_TRIAL.priceUsd)}, charged when it
    starts. Cancel before it ends and you won&apos;t pay anything more.
  </>,
  <>
    To ask for a refund, contact {MERCHANT.name} through its{" "}
    <TextLink href={MERCHANT.buyerHelpUrl}>buyer help page</TextLink>, or{" "}
    <TextLink href={MAILTO}>email us</TextLink> from the address you sign in with.
  </>,
];

const SECTIONS: readonly LegalSection[] = [
  {
    title: "Who you pay",
    body: (
      <>
        <p>{MERCHANT.disclosure}</p>
        <p>
          After each payment, {MERCHANT.name} emails you a receipt with a link to download your
          invoice.
        </p>
      </>
    ),
  },
  {
    title: "Refunds",
    body: (
      <p>
        Refund requests are handled by {MERCHANT.name} under its{" "}
        <a href={MERCHANT.buyerTermsUrl}>buyer terms</a>. To ask for one, contact {MERCHANT.name}{" "}
        through its <a href={MERCHANT.buyerHelpUrl}>buyer help page</a>, or email us from the
        address you sign in with and we&apos;ll pass your request on.
      </p>
    ),
  },
  {
    title: "Cancel anytime",
    body: (
      <>
        <p>
          Cancel from your <Link href={ROUTES.account}>account page</Link> whenever you like. You
          keep your plan until the end of the period you&apos;ve paid for, then your account moves
          to the Free plan. Your resumes stay yours either way.
        </p>
        <p>
          The {PRO_TRIAL.days}-day Pro trial costs {formatUsd(PRO_TRIAL.priceUsd)}, charged when it
          starts. Cancel before the trial ends and you won&apos;t pay anything more; otherwise your
          first Pro payment is taken when it ends. If you start Max during the trial, the full Max
          price is charged right away and the {formatUsd(PRO_TRIAL.priceUsd)} trial charge
          isn&apos;t taken off.
        </p>
      </>
    ),
  },
  {
    title: "Deleting your account",
    body: (
      <p>
        Deleting your account cancels your paid plan right away, and you won&apos;t be charged
        again. It ends at that moment rather than at the end of the period you&apos;ve paid for.
      </p>
    ),
  },
  {
    title: "Questions about a charge",
    body: (
      <>
        <p>
          Email <a href={MAILTO}>{BRAND.supportEmail}</a> from the address you sign in with. For a
          payment itself, you can also contact {MERCHANT.name} through its{" "}
          <a href={MERCHANT.buyerHelpUrl}>buyer help page</a>.
        </p>
        <p>
          This policy doesn&apos;t affect any rights you have under consumer laws where you live.
        </p>
      </>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund policy"
      intro={
        <p>
          {MERCHANT.name} is our merchant of record, and your card statement shows the charge under
          their name, starting with <strong>{MERCHANT.statementPrefix}</strong>. Here&apos;s how
          payments, refunds and cancelling work on Pro and Max.
        </p>
      }
      summary={SUMMARY}
      action={
        <IntentLink href={BILLING_HREF} className={buttonClasses()}>
          Manage billing
          <ArrowRight />
        </IntentLink>
      }
      sections={SECTIONS}
    />
  );
}
