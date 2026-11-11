import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { PRO_TRIAL } from "@/config/plans";
import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Refund policy",
  description: `A full refund within 7 days of your first ${BRAND.name} Pro or Max payment, and you can cancel anytime.`,
  path: ROUTES.refunds,
});

export default function RefundsPage() {
  const mailto = `mailto:${BRAND.supportEmail}`;
  return (
    <LegalPage title="Refund policy">
      <p>
        We want Pro and Max to be worth it. If they aren&apos;t, here&apos;s how refunds and cancelling work.
      </p>

      <h2>7-day refund on your first payment</h2>
      <p>
        If you&apos;re not happy with your plan, email us within 7 days of your first payment and
        we&apos;ll refund it in full. You don&apos;t need a reason.
      </p>
      <p>
        This covers your first payment only. Later payments aren&apos;t refunded, but
        you can cancel anytime so you&apos;re not charged again.
      </p>

      <h2>Cancel anytime</h2>
      <p>
        Cancel from your <Link href={ROUTES.account}>account page</Link> whenever you like. You keep
        your plan until the end of the period you&apos;ve paid for, then your account moves to the Free
        plan. Your resumes stay yours either way.
      </p>
      <p>
        On the {PRO_TRIAL.days}-day Pro trial nothing is charged. Cancel before the trial ends and
        you won&apos;t pay anything; otherwise your first Pro payment is taken when it ends, and the
        7 days above start from that payment.
      </p>

      <h2>How to ask for a refund</h2>
      <ol>
        <li>
          Email <a href={mailto}>{BRAND.supportEmail}</a> from the address you sign in with, within
          7 days of your first payment.
        </li>
        <li>We refund the payment through Creem, our merchant of record.</li>
        <li>
          The money goes back to your original payment method. It can take a few business days to
          show up, depending on your bank.
        </li>
      </ol>

      <h2>Deleting your account</h2>
      <p>
        Deleting your account cancels your paid plan right away, and you won&apos;t be charged again. It ends
        at that moment rather than at the end of the period you&apos;ve paid for.
      </p>

      <p>This policy doesn&apos;t affect any rights you have under consumer laws where you live.</p>
    </LegalPage>
  );
}
