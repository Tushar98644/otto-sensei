import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { PRO_TRIAL } from "@/config/plans";
import { LegalPage } from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";
import { formatUsd } from "../_components/plan-features";

export const metadata: Metadata = pageMetadata({
  title: "Refund policy",
  description: `Refunds for ${BRAND.name} Pro and Max are handled by ${MERCHANT.name}, our merchant of record, under its buyer terms. Cancel anytime and you won't be charged again.`,
  path: ROUTES.refunds,
});

export default function RefundsPage() {
  const mailto = `mailto:${BRAND.supportEmail}`;
  return (
    <LegalPage title="Refund policy">
      <p>Here&apos;s how payments, refunds and cancelling work on Pro and Max.</p>

      <h2>Who you pay</h2>
      <p>{MERCHANT.disclosure}</p>
      <p>
        After each payment, {MERCHANT.name} emails you a receipt with a link to download your
        invoice.
      </p>

      <h2>Refunds</h2>
      <p>
        Refund requests are handled by {MERCHANT.name} under its{" "}
        <a href={MERCHANT.buyerTermsUrl}>buyer terms</a>. To ask for one, contact {MERCHANT.name}{" "}
        through its <a href={MERCHANT.buyerHelpUrl}>buyer help page</a>, or email us from the
        address you sign in with and we&apos;ll pass your request on.
      </p>

      <h2>Cancel anytime</h2>
      <p>
        Cancel from your <Link href={ROUTES.account}>account page</Link> whenever you like. You keep
        your plan until the end of the period you&apos;ve paid for, then your account moves to the
        Free plan. Your resumes stay yours either way.
      </p>
      <p>
        The {PRO_TRIAL.days}-day Pro trial costs {formatUsd(PRO_TRIAL.priceUsd)}, charged when it
        starts. Cancel before the trial ends and you won&apos;t pay anything more; otherwise your
        first Pro payment is taken when it ends. If you start Max during the trial, the full Max
        price is charged right away and the {formatUsd(PRO_TRIAL.priceUsd)} trial charge isn&apos;t
        taken off.
      </p>

      <h2>Deleting your account</h2>
      <p>
        Deleting your account cancels your paid plan right away, and you won&apos;t be charged
        again. It ends at that moment rather than at the end of the period you&apos;ve paid for.
      </p>

      <h2>Questions about a charge</h2>
      <p>
        Email <a href={mailto}>{BRAND.supportEmail}</a> from the address you sign in with. For a
        payment itself, you can also contact {MERCHANT.name} through its{" "}
        <a href={MERCHANT.buyerHelpUrl}>buyer help page</a>.
      </p>

      <p>This policy doesn&apos;t affect any rights you have under consumer laws where you live.</p>
    </LegalPage>
  );
}
