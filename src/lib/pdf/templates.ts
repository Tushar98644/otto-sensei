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

export const TEMPLATE_INFO: Record<TemplateId, TemplateInfo> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Clean sans-serif type with a ruled line under each heading.",
    bestFor: "Any job, anywhere. The safe pick when you're not sure.",
  },
  modern: {
    id: "modern",
    name: "Modern",
    description: "A big bold name, quiet gray details and thin lines beside each heading.",
    bestFor: "Tech, startups and design-minded teams.",
  },
  compact: {
    id: "compact",
    name: "Compact",
    description: "Smaller type and tighter spacing, so more fits on one page.",
    bestFor: "Long careers or lots of projects that should still fit one page.",
  },
  executive: {
    id: "executive",
    name: "Executive",
    description: "Serif type, a centered header and generous spacing.",
    bestFor: "Senior roles, finance, law and consulting.",
  },
  developer: {
    id: "developer",
    name: "Developer",
    description: "Skills and projects up top, links easy to spot, code-style accents.",
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
    description: "Wide margins, no lines and small spaced capitals for headings.",
    bestFor: "Short resumes and roles that value a calm, simple page.",
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
