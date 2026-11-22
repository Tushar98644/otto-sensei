import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { PLAN_ORDER, PLANS, isPaidPlan } from "@/config/plans";
import type { BillingOffer } from "@/lib/billing/intervals";
import { planPrice, priceSentence } from "@/lib/billing/prices";
import { TEMPLATE_LIST, isProTemplate } from "@/lib/pdf/templates";
import { nodeText } from "@/lib/seo/node-text";
import { absoluteUrl } from "@/lib/seo/urls";
import {
  GENERAL_ADVICE,
  INDEXED_ATS_GUIDES,
  type AtsGuide,
  guideHeadline,
  guideSources,
} from "@/lib/seo-pages/ats";
import {
  COMPETITORS,
  COMPETITORS_CHECKED,
  type Competitor,
  bothHaveFreePlans,
  choices,
  compareTitle,
  ottoReasons,
} from "@/lib/seo-pages/compare";
import { LEGAL_LINKS, linkLine, productOverview } from "@/lib/seo-pages/llms";
import {
  ATS_INDEX_PAGE,
  COMPARE_INDEX_PAGE,
  HOME_PAGE,
  JOB_MATCH_PAGE,
  RESUME_TEMPLATES_PAGE,
  atsGuidePage,
  calendarDate,
  comparePage,
} from "@/lib/seo-pages/pages";
import { SEO_PAGES_UPDATED } from "@/lib/seo-pages/paths";
import { HOME_FAQ } from "../(marketing)/_components/faq";
import type { FaqItem } from "../(marketing)/_components/faq-list";
import { planCopy } from "../(marketing)/_components/plan-features";
import { JOB_MATCH_FAQ } from "../(marketing)/job-match/faq";
import { BILLING_FAQ } from "../(marketing)/pricing/billing-faq";
import { COMMON, TEMPLATES_FAQ } from "../(marketing)/resume-templates/content";

// No live job count here: the file is built once, so it makes no claim a count could outdate.
const NO_COUNT = { open: 0, matchable: 0 };

function faqLines(items: readonly FaqItem[]): string[] {
  return items.flatMap((item) => [`### ${item.question}`, "", nodeText(item.answer), ""]);
}

function pageHeader(title: string, path: string, base: string): string[] {
  return [`## ${title}`, "", `Page: ${absoluteUrl(path, base)}`, ""];
}

function pricingLines(offer: BillingOffer, base: string): string[] {
  const plans = PLAN_ORDER.filter((plan) => !isPaidPlan(plan) || offer[plan].length > 0);
  const paid = plans.filter(isPaidPlan);
  const plansText = plans.flatMap((plan) => {
    const copy = planCopy(plan, "month", NO_COUNT);
    const prices = isPaidPlan(plan)
      ? offer[plan].map((interval) => priceSentence(plan, interval))
      : ["Free, with no card and no time limit."];
    return [
      `### ${PLANS[plan].name}`,
      "",
      copy.summary,
      ...prices,
      "",
      ...(copy.lead ? [copy.lead, ""] : []),
      ...copy.features.map((feature) => `- ${feature}`),
      `- ${copy.quota}`,
      "",
    ];
  });
  return [
    ...pageHeader("Pricing", ROUTES.pricing, base),
    `Prices are in US dollars, and taxes may apply. ${paid.map((plan) => `${PLANS[plan].name} is ${planPrice(plan, "month")} a month`).join("; ")}.`,
    "",
    ...plansText,
    "### Billing questions",
    "",
    ...faqLines(BILLING_FAQ).map((line) => line.replace(/^### /, "#### ")),
  ];
}

function templateLines(base: string): string[] {
  return [
    ...pageHeader("Resume templates", RESUME_TEMPLATES_PAGE.path, base),
    RESUME_TEMPLATES_PAGE.description,
    "",
    ...TEMPLATE_LIST.flatMap((info) => [
      `### ${info.name} (${isProTemplate(info.id) ? PLANS.pro.name : PLANS.free.name})`,
      "",
      `Best for: ${info.bestFor}`,
      info.description,
      "",
    ]),
    "### What every format has in common",
    "",
    ...COMMON.map(({ title, text }) => `- ${title}: ${text}`),
    "",
    ...faqLines(TEMPLATES_FAQ),
  ];
}

function guideLines(guide: AtsGuide, base: string): string[] {
  const page = atsGuidePage(guide);
  return [
    `### ${guideHeadline(guide)}`,
    "",
    `Page: ${absoluteUrl(page.path, base)}`,
    "",
    guide.what,
    `How to tell a job uses ${guide.name}: ${guide.spot}`,
    "",
    ...guide.sections.flatMap((section) => [
      `#### ${section.title}`,
      "",
      ...section.notes.flatMap((note) => [
        `- ${note.fact}${note.optIn ? " (Only if the employer turns it on.)" : ""}`,
        `  What to do: ${note.todo}`,
        `  Source: ${note.source.label}, ${note.source.url}`,
      ]),
      "",
    ]),
    "#### Sources",
    "",
    ...guideSources(guide).map((source) => `- ${source.label}: ${source.url}`),
    "",
  ];
}

function atsLines(base: string): string[] {
  return [
    ...pageHeader("ATS guides", ATS_INDEX_PAGE.path, base),
    `${ATS_INDEX_PAGE.description} Updated ${calendarDate(SEO_PAGES_UPDATED)}.`,
    "",
    "### Advice for any hiring system",
    "",
    ...GENERAL_ADVICE.map((tip) => `- ${tip.title}: ${tip.text}`),
    "",
    ...INDEXED_ATS_GUIDES.flatMap((guide) => guideLines(guide, base)),
  ];
}

function comparisonLines(competitor: Competitor, base: string): string[] {
  const page = comparePage(competitor);
  return [
    `### ${compareTitle(competitor)}`,
    "",
    `Page: ${absoluteUrl(page.path, base)}`,
    "",
    competitor.summary,
    "",
    ...choices(competitor).map((choice) => `- Pick ${choice.name} if ${choice.clause}`),
    ...(bothHaveFreePlans(competitor)
      ? ["- Both have a free plan, so you can try each one before you pay."]
      : []),
    "",
    "#### At a glance",
    "",
    ...competitor.rows.flatMap((row) => [
      `- ${row.label}`,
      `  ${BRAND.name}: ${[row.otto.answer, row.otto.detail].filter(Boolean).join(". ")}`,
      `  ${competitor.name}: ${[row.them.answer, row.them.detail].filter(Boolean).join(". ")}`,
    ]),
    "",
    `#### Why pick ${BRAND.name}`,
    "",
    ...ottoReasons(competitor).map((note) => `- ${note.title}: ${note.text}`),
    "",
    `#### What ${competitor.name} does well`,
    "",
    ...competitor.strengths.map((strength) => `- ${strength}`),
    "",
    "#### Sources",
    "",
    ...competitor.sources.map((source) => `- ${source.label}: ${source.url}`),
    "",
  ];
}

function compareLines(base: string): string[] {
  return [
    ...pageHeader("Comparisons", COMPARE_INDEX_PAGE.path, base),
    `${COMPARE_INDEX_PAGE.description} Facts about each product come from its own website, checked on ${calendarDate(COMPETITORS_CHECKED)}. Prices and plans change, so check the sources.`,
    "",
    ...COMPETITORS.flatMap((competitor) => comparisonLines(competitor, base)),
  ];
}

export function llmsFullTxt(base: string, offer: BillingOffer): string {
  return [
    `# ${BRAND.name}: full text`,
    "",
    ...productOverview(),
    "",
    ...pageHeader("Questions people ask", HOME_PAGE.path, base),
    ...faqLines(HOME_FAQ),
    ...pricingLines(offer, base),
    ...pageHeader("Job match check", JOB_MATCH_PAGE.path, base),
    JOB_MATCH_PAGE.description,
    "",
    ...faqLines(JOB_MATCH_FAQ),
    ...templateLines(base),
    ...atsLines(base),
    ...compareLines(base),
    "## Policies",
    "",
    ...LEGAL_LINKS.map((link) => linkLine(link, base)),
    "",
  ].join("\n");
}
