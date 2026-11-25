import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { applicationLimit, FREE_JOB_MATCHES, PLANS } from "@/config/plans";
import type { Format } from "@/i18n/intl";
import type { Localize } from "@/i18n/pages";
import { rich } from "@/i18n/rich";
import type { MessageValue } from "@/i18n/types";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { type FaqItem, FaqList } from "./faq-list";
import type { HomeMessages } from "./home-copy";
import type { PriceCopy } from "./price-copy";
import { Section, SectionHeader } from "./section";

type FaqKey = keyof HomeMessages["faq"]["items"];

const QUESTIONS: readonly FaqKey[] = [
  "free",
  "ats",
  "invent",
  "talk",
  "account",
  "data",
  "cancel",
  "anyJob",
];

// The home page's questions, shared with its JSON-LD and llms-full.txt.
export function homeFaq(
  t: HomeMessages,
  format: Format,
  href: Localize,
  prices: PriceCopy,
): FaqItem[] {
  const words = t.faq;
  const fixes = format.number(PLANS.free.limits.fix);
  const values: Partial<Record<FaqKey, Record<string, MessageValue>>> = {
    free: { fixes },
    account: {
      fixes,
      matches: format.number(FREE_JOB_MATCHES),
      applications: format.plural(words.applications, applicationLimit("free")),
      pro: PLANS.pro.name,
      trialHeadline: prices.trialHeadline(),
      trialSentence: prices.trialSentence(),
    },
    anyJob: { count: format.number(ROLE_EXAMPLES.length) },
  };
  const links: Partial<Record<FaqKey, string>> = {
    data: href(ROUTES.privacy),
    anyJob: href(SEO_PATHS.resumeExamples),
  };
  return QUESTIONS.map((key) => {
    const link = links[key];
    const tags = link ? { link: (chunk: string) => <TextLink href={link}>{chunk}</TextLink> } : {};
    return {
      question: words.items[key].question,
      answer: rich(words.items[key].answer, tags, values[key]),
    };
  });
}

export function Faq({ t, items }: { t: HomeMessages; items: readonly FaqItem[] }) {
  return (
    <Section
      labelledBy="faq-title"
      lazySize="[contain-intrinsic-size:auto_705px] sm:[contain-intrinsic-size:auto_685px] lg:[contain-intrinsic-size:auto_585px]"
    >
      <div className="grid gap-12 lg:grid-cols-3">
        <SectionHeader id="faq-title" title={t.faq.title} />
        <FaqList items={items} className="lg:col-span-2" />
      </div>
    </Section>
  );
}
