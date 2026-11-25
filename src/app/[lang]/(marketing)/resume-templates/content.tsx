import { TextLink } from "@/components/site/text-link";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { DEFAULT_TEMPLATE, TEMPLATE_IDS } from "@/lib/resume/schema";
import { RELATED } from "@/lib/seo-pages/pages";
import type { FaqItem } from "../_components/faq-list";

export const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");
export const proCount = TEMPLATE_IDS.length - FREE_TEMPLATES.length;
const fallback = TEMPLATE_INFO[DEFAULT_TEMPLATE].name;

export const COMMON: readonly { title: string; text: string }[] = [
  {
    title: "One column of real text",
    text: "Text reads top to bottom in the right order, with each heading on its own line. Every format is tested by reading its PDF back, on Letter and A4 paper.",
  },
  {
    title: "Nothing that scrambles the words",
    text: "No icons, no justified lines, and no wide letter spacing that reads back as “S U M M A R Y”.",
  },
  {
    title: "Same words, any look",
    text: "Switch formats whenever you like. Your resume stays the same; only the page around it changes.",
  },
  {
    title: "PDF free, Word on Pro",
    text: `Download ${freeFormats} as PDFs free, as often as you like. The other ${proCount} formats and Word (.docx) downloads come with Pro.`,
  },
];

export const TEMPLATES_FAQ: readonly FaqItem[] = [
  {
    question: "Are these resume templates free?",
    answer: `${freeFormats} are free, with no paywall at the download step and no account needed. The other ${proCount} formats come with Pro. On Free, a resume set to a Pro format downloads in ${fallback}.`,
  },
  {
    question: "Will hiring software read them?",
    answer: (
      <>
        Each one is a single column of real text in reading order, and each PDF is tested by reading
        it back. Every employer sets up its hiring system differently, so nobody can promise how a
        given system will treat your resume. The{" "}
        <TextLink href={RELATED.ats.href}>ATS guides</TextLink> show what the common ones are known
        to do.
      </>
    ),
  },
  {
    question: "Which one should I pick?",
    answer: `${TEMPLATE_INFO.classic.name} suits any job, anywhere: the safe pick when you're not sure. ${TEMPLATE_INFO.compact.name} fits a long career on one page, and ${TEMPLATE_INFO.developer.name} puts skills and projects first. Switch anytime: your words stay the same.`,
  },
  {
    question: "Can I use my own resume?",
    answer: `Yes. Upload a PDF or Word file in the studio, or start from scratch. “Use this format” applies the format to the resume you have open. With none open, the studio asks for your resume with the format already chosen. You can try a ${PLANS.pro.name} format on ${PLANS.free.name}; it downloads in ${fallback} until you have ${PLANS.pro.name}.`,
  },
];
