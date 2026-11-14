import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { PRO_TRIAL } from "@/config/plans";
import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Refund policy",
  description: `${BRAND.name} Pro and Max payments aren't refunded. You can cancel anytime and you won't be charged again.`,
  path: ROUTES.refunds,
});

export default function RefundsPage() {
  const mailto = `mailto:${BRAND.supportEmail}`;
  return (
    <LegalPage title="Refund policy">
      <p>Here&apos;s how payments and cancelling work on Pro and Max.</p>

      <h2>Payments aren&apos;t refunded</h2>
      <p>
        We don&apos;t refund payments for Pro or Max, including the first one. Try the{" "}
        {PRO_TRIAL.days}-day Pro trial or the Free plan first to see if it&apos;s right for you.
      </p>

      <h2>Cancel anytime</h2>
      <p>
        Cancel from your <Link href={ROUTES.account}>account page</Link> whenever you like. You keep
        your plan until the end of the period you&apos;ve paid for, then your account moves to the
        Free plan. Your resumes stay yours either way.
      </p>
      <p>
        On the {PRO_TRIAL.days}-day Pro trial nothing is charged. Cancel before the trial ends and
        you won&apos;t pay anything; otherwise your first Pro payment is taken when it ends.
      </p>

      <h2>Deleting your account</h2>
      <p>
        Deleting your account cancels your paid plan right away, and you won&apos;t be charged
        again. It ends at that moment rather than at the end of the period you&apos;ve paid for.
      </p>

      <h2>Questions about a charge</h2>
      <p>
        Email <a href={mailto}>{BRAND.supportEmail}</a> from the address you sign in with.
      </p>

      <p>This policy doesn&apos;t affect any rights you have under consumer laws where you live.</p>
    </LegalPage>
  );
}
