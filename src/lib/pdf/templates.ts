import { FREE_TEMPLATES, hasProTools, type PlanId } from "@/config/plans";
import {
  DEFAULT_TEMPLATE,
  TEMPLATE_IDS,
  type Resume,
  type SectionKey,
  type TemplateId,
} from "@/lib/resume/schema";

// What each PDF format is called and who it suits. Client-safe and react-pdf free, so the format
// picker and the gallery can list formats without loading the renderer
// (src/components/pdf/registry.ts pairs these with the components that draw them).

export type TemplateInfo = {
  id: TemplateId;
  name: string;
  // How it looks, in one line.
  description: string;
  // Who it suits, in one line.
  bestFor: string;
  // The section order the format is designed around. Offered to the user, never forced: the PDF
  // always follows the resume's own order, so the editor and the page never disagree.
  sectionOrderHint?: readonly SectionKey[];
};

// Each format follows one widely used resume layout (src/components/pdf/templates/ says which).
// Names and copy describe the look, never the school or person it comes from.
export const TEMPLATE_INFO: Record<TemplateId, TemplateInfo> = {
  classic: {
    id: "classic",
    name: "Classic",
    description:
      "The layout university career offices recommend: plain type, centered headings with no lines, and the employer above your title on each job.",
    bestFor: "Any job, anywhere. The safe pick when you're not sure.",
  },
  modern: {
    id: "modern",
    name: "Modern",
    description:
      "A large two-tone name, headings that start in color with a line to the edge, and job titles in small capitals.",
    bestFor: "Tech, startups and design-minded teams.",
  },
  compact: {
    id: "compact",
    name: "Compact",
    description:
      "The one-page format business schools send to banks: Times-style type, capital headings under thin lines, square bullets and years only.",
    bestFor: "Finance, consulting and long careers that must fit one page.",
  },
  executive: {
    id: "executive",
    name: "Executive",
    description:
      "Palatino-style serif, your name in color beside your headline, colored headings over light lines, and roomy spacing.",
    bestFor: "Senior roles, finance, law and consulting.",
  },
  developer: {
    id: "developer",
    name: "Developer",
    description:
      "The template engineers share: book-style serif, small-capital headings over full lines, bold titles over italic company lines. Skills and projects first.",
    bestFor: "Software engineers and other technical roles.",
    sectionOrderHint: [
      "summary",
      "skills",
      "projects",
      "experience",
      "education",
      "certifications",
    ],
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description:
      "Black only: Charter-style serif, a large plain name, bold headings over thin lines, and each job on a single line.",
    bestFor: "Engineers and anyone who wants a calm, simple page.",
  },
};

export const TEMPLATE_LIST: readonly TemplateInfo[] = TEMPLATE_IDS.map((id) => TEMPLATE_INFO[id]);

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);
}

// Copies in localStorage are never re-parsed, so the stored value can be missing or stale.
export function templateOf(resume: Pick<Resume, "template">): TemplateId {
  return isTemplateId(resume.template) ? resume.template : DEFAULT_TEMPLATE;
}

// The hint's sections first (only those the resume shows), then the rest in their current order.
// Hidden sections stay hidden.
export function orderByHint(
  order: readonly SectionKey[],
  hint: readonly SectionKey[],
): SectionKey[] {
  const shown = new Set(order);
  const lead = hint.filter((key) => shown.has(key));
  const leading = new Set(lead);
  return [...lead, ...order.filter((key) => !leading.has(key))];
}

export function followsHint(order: readonly SectionKey[], hint: readonly SectionKey[]): boolean {
  const next = orderByHint(order, hint);
  return next.length === order.length && next.every((key, index) => key === order[index]);
}

export function withTemplate(resume: Resume, id: TemplateId): Resume {
  return { ...resume, template: id };
}

/** Classic and Compact are on every plan; the other formats come with Pro, Max and the trial. */
export function isProTemplate(id: TemplateId): boolean {
  return !(FREE_TEMPLATES as readonly TemplateId[]).includes(id);
}

export function canUseTemplate(plan: PlanId, id: TemplateId): boolean {
  return hasProTools(plan) || !isProTemplate(id);
}

/**
 * The resume as this plan downloads it: a Pro format on Free (say, set before a paid plan ended)
 * comes out in Classic. The resume itself keeps its format, so it's back once Pro is. Returns the
 * same object when nothing changes.
 */
export function forPlan(resume: Resume, plan: PlanId): Resume {
  return canUseTemplate(plan, templateOf(resume)) ? resume : withTemplate(resume, DEFAULT_TEMPLATE);
}
