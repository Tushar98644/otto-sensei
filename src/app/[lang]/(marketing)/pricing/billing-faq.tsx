import type { ReactNode } from "react";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import {
  applicationLimit,
  FEATURES,
  FREE_JOB_MATCHES,
  PLANS,
  PRO_TRIAL,
  resumeLimit,
} from "@/config/plans";
import { TOPUP_LIMITS } from "@/config/topup";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Localize } from "@/i18n/pages";
import { rich } from "@/i18n/rich";
import type { FaqItem } from "../_components/faq-list";
import { MERCHANT } from "../_components/merchant";
import { creditCopy, priceCopy, usd, type PricingMessages } from "../_components/price-copy";

const ORDER = [
  "trial",
  "free",
  "payments",
  "tax",
  "cancel",
  "refund",
  "limits",
  "switch",
  "cancelled",
] as const satisfies readonly (keyof PricingMessages["faq"])[];

function limitsAnswer(t: PricingMessages, format: Format): string {
  const words = t.faq.limits;
  const labels = t.features;
  const count = format.number;
  return [
    fmt(words.free, { fix: count(PLANS.free.limits.fix), fixLabel: labels.fix }),
    fmt(words.monthly, {
      list: FEATURES.map((feature) =>
        fmt(words.monthlyItem, {
          label: labels[feature],
          pro: count(PLANS.pro.limits[feature]),
          max: count(PLANS.max.limits[feature]),
        }),
      ).join("; "),
    }),
    fmt(words.trial, {
      days: count(PRO_TRIAL.days),
      list: FEATURES.map((feature) =>
        fmt(words.trialItem, { count: count(PRO_TRIAL.limits[feature]), label: labels[feature] }),
      ).join(", "),
    }),
    fmt(words.kept, {
      freeResumes: count(resumeLimit("free")),
      proResumes: count(resumeLimit("pro")),
      maxResumes: count(resumeLimit("max")),
      freeApplications: count(applicationLimit("free")),
      proApplications: count(applicationLimit("pro")),
      maxApplications: count(applicationLimit("max")),
    }),
    words.uploads,
  ].join(" ");
}

function creditFaq(t: PricingMessages, format: Format): FaqItem {
  const credit = creditCopy(t.credit, format);
  return {
    question: t.faq.credit.question,
    answer: fmt(t.faq.credit.answer, {
      pro: PLANS.pro.name,
      max: PLANS.max.name,
      min: usd(format, TOPUP_LIMITS.minUsd),
      maxUsd: usd(format, TOPUP_LIMITS.maxUsd),
      buys: credit.buysSentence(1),
      prices: credit.priceList(),
      balance: usd(format, TOPUP_LIMITS.maxBalanceUsd),
    }),
  };
}

// The pricing page's billing questions; the credit one is added only while credit is on sale.
export function billingFaq(
  t: PricingMessages,
  format: Format,
  href: Localize,
  credit = false,
): FaqItem[] {
  const faq = t.faq;
  const prices = priceCopy(t, format);
  const count = format.number;
  const answers: Record<(typeof ORDER)[number], ReactNode> = {
    trial: fmt(faq.trial.answer, {
      days: count(PRO_TRIAL.days),
      price: prices.trialPrice(),
      priceLabel: prices.planPriceLabel(PRO_TRIAL.plan, PRO_TRIAL.interval),
    }),
    free: fmt(faq.free.answer, {
      fix: count(PLANS.free.limits.fix),
      resumes: format.plural(t.copy.resumes, resumeLimit("free")),
      matches: count(FREE_JOB_MATCHES),
      applications: format.plural(t.copy.trackedApplications, applicationLimit("free")),
      proResumes: count(resumeLimit("pro")),
      proApplications: count(applicationLimit("pro")),
    }),
    payments: fmt(faq.payments.answer, {
      merchant: MERCHANT.name,
      prefix: MERCHANT.statementPrefix,
    }),
    tax: faq.tax.answer,
    cancel: faq.cancel.answer,
    refund: rich(
      faq.refund.answer,
      {
        link: (chunk, index) => (
          <TextLink href={index === 0 ? MERCHANT.buyerTermsUrl : href(ROUTES.refunds)}>
            {chunk}
          </TextLink>
        ),
      },
      { merchant: MERCHANT.name },
    ),
    limits: limitsAnswer(t, format),
    switch: fmt(faq.switch.answer, { price: prices.trialPrice() }),
    cancelled: faq.cancelled.answer,
  };
  const items = ORDER.map((key) => ({ question: faq[key].question, answer: answers[key] }));
  return credit ? [...items, creditFaq(t, format)] : items;
}
