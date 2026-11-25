import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import en from "@/i18n/messages/en/job-match";
import type { Localize } from "@/i18n/pages";
import { rich } from "@/i18n/rich";
import { candidateCount } from "@/lib/match-check/vocabulary";
import type { FaqItem } from "../_components/faq-list";

const known = Math.round(candidateCount() / 50) * 50;

type JobMatchFaq = Messages["jobMatch"]["faq"];

// In the English file's order, so a translation can't reorder the questions.
const ORDER = Object.keys(en.faq) as (keyof JobMatchFaq)[];

export function jobMatchFaq(t: JobMatchFaq, format: Format, href: Localize): FaqItem[] {
  const values = { known: format.number(known) };
  const link = (chunk: string) => <TextLink href={href(ROUTES.pricing)}>{chunk}</TextLink>;
  return ORDER.map((key) => ({
    question: t[key].question,
    answer: rich(t[key].answer, { link }, values),
  }));
}
