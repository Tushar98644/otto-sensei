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
  compareTitle,
  ottoReasons,
} from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES, type RoleExample } from "@/lib/seo-pages/examples";
import { LEGAL_LINKS, linkLine, productOverview } from "@/lib/seo-pages/llms";
import {
  ATS_INDEX_PAGE,
  COMPARE_INDEX_PAGE,
  COVER_LETTER_PAGE,
  HOME_PAGE,
  INTERVIEW_PREP_PAGE,
  JOB_MATCH_PAGE,
  PORTFOLIO_PAGE,
  RELATED,
  RESUME_BUILDER_PAGE,
  RESUME_EXAMPLES_PAGE,
  RESUME_TEMPLATES_PAGE,
  type SeoPage,
  TRACKER_PAGE,
  atsGuidePage,
  calendarDate,
  calendarMonth,
  comparePage,
  exampleHeadline,
  examplePage,
} from "@/lib/seo-pages/pages";
import { SEO_PAGES_UPDATED } from "@/lib/seo-pages/paths";
import { HOME_FAQ } from "../(marketing)/_components/faq";
import type { FaqItem } from "../(marketing)/_components/faq-list";
import type { FeatureContent } from "../(marketing)/_components/feature-page";
import { LETTERS } from "../(marketing)/cover-letter-generator/content";
import { INTERVIEW_PREP } from "../(marketing)/interview-prep/content";
import { TRACKER } from "../(marketing)/job-application-tracker/content";
import { PORTFOLIO } from "../(marketing)/portfolio-website-builder/content";
import type { Note } from "../(marketing)/_components/note-rows";
import { planCopy } from "../(marketing)/_components/plan-features";
import { JOB_MATCH_FAQ } from "../(marketing)/job-match/faq";
import { BILLING_FAQ } from "../(marketing)/pricing/billing-faq";
import {
  AUDIENCES,
  BUILDER_FAQ,
  BUILD_STEPS,
  INDIA_NOTES,
} from "../(marketing)/resume-builder/content";
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

function noteLines(notes: readonly Note[]): string[] {
  return notes.map((note) => `- ${note.title}: ${nodeText(note.text)}`);
}

function builderLines(base: string): string[] {
  return [
    ...pageHeader("Resume builder", RESUME_BUILDER_PAGE.path, base),
    RESUME_BUILDER_PAGE.description,
    "",
    "### How it builds and checks a resume",
    "",
    ...noteLines(BUILD_STEPS),
    "",
    "### Who it's for",
    "",
    ...noteLines(AUDIENCES),
    "",
    "### Resumes for jobs in India",
    "",
    ...noteLines(INDIA_NOTES),
    "",
    ...faqLines(BUILDER_FAQ),
  ];
}

const TOOLS: readonly { title: string; page: SeoPage; content: FeatureContent }[] = [
  { title: RELATED.coverLetters.title, page: COVER_LETTER_PAGE, content: LETTERS },
  { title: RELATED.tracker.title, page: TRACKER_PAGE, content: TRACKER },
  { title: RELATED.interviewPrep.title, page: INTERVIEW_PREP_PAGE, content: INTERVIEW_PREP },
  { title: RELATED.portfolio.title, page: PORTFOLIO_PAGE, content: PORTFOLIO },
];

function toolLines(base: string): string[] {
  return TOOLS.flatMap(({ title, page, content }) => [
    ...pageHeader(title, page.path, base),
    content.intro,
    "",
    `### ${content.featuresTitle}`,
    "",
    ...noteLines(content.features),
    "",
    "### How it works",
    "",
    ...noteLines(content.steps),
    "",
    ...faqLines(content.faq),
  ]);
}

function exampleLines(example: RoleExample, base: string): string[] {
  return [
    `### ${exampleHeadline(example)}`,
    "",
    `Page: ${absoluteUrl(examplePage(example).path, base)}`,
    "",
    example.intro,
    "",
    "#### Lines that turn duties into results",
    "",
    ...example.lines.flatMap((line) => [`- Before: ${line.weak}`, `  After: ${line.strong}`]),
    "",
    "#### Skills to show",
    "",
    ...example.skills.map((group) => `- ${group.label}: ${group.items.join(", ")}`),
    `- Job titles to search: ${example.titles.join(", ")}`,
    "",
    "#### What to show",
    "",
    ...noteLines(example.tips),
    "",
    "#### Mistakes to skip",
    "",
    ...noteLines(example.mistakes),
    "",
    ...faqLines(example.faq).map((line) => line.replace(/^### /, "#### ")),
  ];
}

function examplesLines(base: string): string[] {
  return [
    ...pageHeader("Resume examples", RESUME_EXAMPLES_PAGE.path, base),
    `${RESUME_EXAMPLES_PAGE.description} The people, companies and numbers in them are made up.`,
    "",
    ...ROLE_EXAMPLES.flatMap((example) => exampleLines(example, base)),
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
    `${competitor.asListed ? `As listed in ${calendarMonth(competitor.checked)}` : `Checked on ${calendarDate(competitor.checked)}`}.${competitor.pricedByCountry ? ` ${competitor.name} shows each country its own prices; any here are the ones it showed in India.` : ""}`,
    "",
    `#### Why pick ${BRAND.name}`,
    "",
    ...ottoReasons(competitor).map((note) => `- ${note.title}: ${note.text}`),
    "",
    `#### ${BRAND.shortName} and ${competitor.name}, side by side`,
    "",
    ...competitor.rows.flatMap((row) => [
      `- ${row.label}`,
      `  ${BRAND.name}: ${[row.otto.answer, row.otto.detail].filter(Boolean).join(". ")}`,
      `  ${competitor.name}: ${[row.them.answer, row.them.detail].filter(Boolean).join(". ")}`,
    ]),
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
    `${COMPARE_INDEX_PAGE.description} Facts about each product come from its own website, as of ${calendarMonth(COMPETITORS_CHECKED)}; each comparison says when. Prices and plans change, so check the sources.`,
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
    ...builderLines(base),
    ...toolLines(base),
    ...examplesLines(base),
    ...templateLines(base),
    ...atsLines(base),
    ...compareLines(base),
    "## Policies",
    "",
    ...LEGAL_LINKS.map((link) => linkLine(link, base)),
    "",
  ].join("\n");
}
