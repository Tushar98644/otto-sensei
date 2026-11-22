import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { FEATURE_LABELS, FEATURES, FREE_JOB_MATCHES, PLANS, PRO_TRIAL } from "@/config/plans";
import { planPriceLabel } from "@/lib/billing/prices";
import type { FaqItem } from "../_components/faq-list";
import { MERCHANT } from "../_components/merchant";
import { formatUsd } from "../_components/plan-features";

const count = new Intl.NumberFormat("en-US");
const freeLimits = `Free has ${count.format(PLANS.free.limits.fix)} ${FEATURE_LABELS.fix} a month (summary help counts as one), reset at the start of each month, and no other AI help.`;
const monthlyLimits = `Pro and Max limits reset each month, when your plan renews (on a yearly plan, on the day of the month it started): ${FEATURES.map(
  (feature) =>
    `${FEATURE_LABELS[feature]}: ${count.format(PLANS.pro.limits[feature])} on Pro, ${count.format(PLANS.max.limits[feature])} on Max`,
).join("; ")}.`;
const trialLimits = `The ${PRO_TRIAL.days}-day Pro trial has its own allowance for the whole trial: ${FEATURES.map(
  (feature) => `${count.format(PRO_TRIAL.limits[feature])} ${FEATURE_LABELS[feature]}`,
).join(", ")}.`;
const uploadsNote =
  "Uploads always work: on Free, or past the AI reads, the basic reader reads them instead.";

const limitsAnswer = [freeLimits, monthlyLimits, trialLimits, uploadsNote].join(" ");

export const BILLING_FAQ: readonly FaqItem[] = [
  {
    question: "How does the Pro trial work?",
    answer: `New accounts can try Pro for ${PRO_TRIAL.days} days, once per person. You add a card at checkout and pay ${formatUsd(PRO_TRIAL.priceUsd)} (plus any tax) when the trial starts. When it ends, Pro starts at ${planPriceLabel(PRO_TRIAL.plan, PRO_TRIAL.interval)}. Cancel anytime before the trial ends and you pay nothing more. During the trial you can build and preview a portfolio; it goes public once Pro starts.`,
  },
  {
    question: "What stays free?",
    answer: `Uploading with the basic reader, the recruiter view, editing and fixing by hand, ${PLANS.free.limits.fix} line fixes a month with Otto, 1 resume, the Classic and Compact formats, PDF downloads, your ${FREE_JOB_MATCHES} closest job matches and one tracked application with its reminder. No card, no time limit. More line fixes and the rest of Otto's AI help, the other formats, more resumes, Word downloads, the full list of job matches with filters, tracking every application, share links and the work-rights check come with Pro. If a paid plan ends, everything you made stays: you can still open, edit and download it.`,
  },
  {
    question: "Who handles payments?",
    answer: `${MERCHANT.name}, our merchant of record. They process your payment on their own checkout page, send your receipts and handle sales tax or VAT, and your card statement shows the charge under their name, starting with ${MERCHANT.statementPrefix}. We never see your full card number.`,
  },
  {
    question: "Will I pay tax on top?",
    answer:
      "Depending on where you live, sales tax or VAT may be added at checkout. Prices are in US dollars, and your bank may convert them to your currency.",
  },
  {
    question: "How do I cancel?",
    answer:
      "From your account page, anytime. You keep your plan until the end of the period you paid for, and you won't be charged again.",
  },
  {
    question: "Can I get a refund?",
    answer: (
      <>
        Refund requests are handled by {MERCHANT.name}, our merchant of record, under its{" "}
        <TextLink href={MERCHANT.buyerTermsUrl}>buyer terms</TextLink>. You can also cancel anytime
        from your account page and you won&apos;t be charged again. See our{" "}
        <TextLink href={ROUTES.refunds}>refund policy</TextLink>.
      </>
    ),
  },
  {
    question: "What are the limits?",
    answer: limitsAnswer,
  },
  {
    question: "Can I switch between Pro and Max?",
    answer: `You can move up from Pro to Max on your account page, on the billing period you already have. Your subscription changes in place, so you're never billed twice: you pay the difference for the rest of the period right away. On the Pro trial, starting Max ends the trial and charges the full Max price (plus any tax) to your card on file right away; the ${formatUsd(PRO_TRIAL.priceUsd)} trial charge isn't taken off. To move to Pro, or between monthly and yearly, cancel from your account page and pick the new plan once your current period ends.`,
  },
  {
    question: "What happens to my resumes if I cancel?",
    answer:
      "Nothing. They stay yours, and you can keep editing and downloading them for free. A published portfolio goes offline until you're back on Pro or Max; it isn't deleted.",
  },
];
