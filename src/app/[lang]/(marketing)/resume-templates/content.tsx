import { TextLink } from "@/components/site/text-link";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { formatFor, type Format } from "@/i18n/intl";
import en from "@/i18n/messages/en/resume-templates";
import type { Localize } from "@/i18n/pages";
import { TEMPLATE_INFO, type TemplateInfo } from "@/lib/pdf/templates";
import { DEFAULT_TEMPLATE, TEMPLATE_IDS } from "@/lib/resume/schema";
import { RELATED } from "@/lib/seo-pages/pages";
import type { FaqItem } from "../_components/faq-list";
import type { Note } from "../_components/note-rows";
import { faqItems, freeFormats, noteList } from "../_components/product-copy";
import type { TemplatesMessages } from "../_components/seo-copy";

export const proCount = TEMPLATE_IDS.length - FREE_TEMPLATES.length;

// The words the templates page shares with llms-full.txt, in a page's language.
export function templatesContent(
  t: TemplatesMessages,
  format: Format,
  href: Localize,
): { common: Note[]; faq: FaqItem[] } {
  const values = {
    freeFormats: freeFormats(format),
    proCount: format.number(proCount),
    pro: PLANS.pro.name,
    free: PLANS.free.name,
    fallback: TEMPLATE_INFO[DEFAULT_TEMPLATE].name,
    classic: TEMPLATE_INFO.classic.name,
    compact: TEMPLATE_INFO.compact.name,
    developer: TEMPLATE_INFO.developer.name,
  };
  const guides = (chunk: string) => <TextLink href={href(RELATED.ats.href)}>{chunk}</TextLink>;
  return {
    common: noteList(en.common, t.common, values),
    faq: faqItems(en.faq, t.faq, values, { ats: { link: guides } }),
  };
}

// A format's description and best use in the page's language; the name stays as it is.
export function formatInfo(t: TemplatesMessages, info: TemplateInfo): TemplateInfo {
  return { ...info, ...t.formats[info.id] };
}

const english = templatesContent(en, formatFor("en"), (path) => path);

export const COMMON: readonly { title: string; text: string }[] = english.common.map((note) => ({
  title: note.title,
  text: String(note.text),
}));

export const TEMPLATES_FAQ: readonly FaqItem[] = english.faq;
