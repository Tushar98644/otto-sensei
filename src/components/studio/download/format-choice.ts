import { TEMPLATE_INFO, followsHint, orderByHint, templateOf } from "@/lib/pdf/templates";
import { SECTION_LABELS, type Resume, type SectionKey } from "@/lib/resume/schema";

// State behind the format picker on the download step. Pure, so it's tested without a browser.

export type SectionOrderOffer = {
  // The sections that jump ahead of others, in their new order: "Skills and Projects".
  moved: string;
  count: number;
  order: SectionKey[];
};

function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

// A format built around a section order (Developer: skills and projects first) offers to apply it
// when the resume doesn't follow it yet. The user's order wins until they say yes.
export function sectionOrderOffer(resume: Resume): SectionOrderOffer | null {
  const hint = TEMPLATE_INFO[templateOf(resume)].sectionOrderHint;
  if (!hint || followsHint(resume.sectionOrder, hint)) return null;
  const order = orderByHint(resume.sectionOrder, hint);
  const before = resume.sectionOrder;
  // A section "moves up" when something that used to come before it now comes after it.
  const moved = order.filter((key, index) =>
    order.slice(index + 1).some((later) => before.indexOf(later) < before.indexOf(key)),
  );
  if (moved.length === 0) return null;
  return { moved: joinWords(moved.map((key) => SECTION_LABELS[key])), count: moved.length, order };
}
