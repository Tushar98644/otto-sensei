import { TEMPLATE_INFO, followsHint, orderByHint, templateOf } from "@/lib/pdf/templates";
import { SECTION_LABELS, type Resume, type SectionKey } from "@/lib/resume/schema";

export type SectionOrderOffer = {
  moved: string;
  count: number;
  order: SectionKey[];
};

function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

export function sectionOrderOffer(resume: Resume): SectionOrderOffer | null {
  const hint = TEMPLATE_INFO[templateOf(resume)].sectionOrderHint;
  if (!hint || followsHint(resume.sectionOrder, hint)) return null;
  const order = orderByHint(resume.sectionOrder, hint);
  const before = resume.sectionOrder;
  const moved = order.filter((key, index) =>
    order.slice(index + 1).some((later) => before.indexOf(later) < before.indexOf(key)),
  );
  if (moved.length === 0) return null;
  return { moved: joinWords(moved.map((key) => SECTION_LABELS[key])), count: moved.length, order };
}
