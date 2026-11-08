import { TEMPLATE_INFO, orderByHint } from "@/lib/pdf/templates";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume, TemplateId } from "@/lib/resume/schema";

// Pure pieces of "Use this format", shared with scripts/render-format-previews.tsx so the gallery
// pictures show exactly what "Try it with a sample" opens.

type StudioResumes = {
  activeId: string | null;
  order: readonly string[];
  resumes: Readonly<Record<string, Resume>>;
};

// The resume a format applies to: the one open in the studio, else the newest.
export function formatTarget({ activeId, order, resumes }: StudioResumes): Resume | null {
  const id = activeId ?? order[0];
  return id ? (resumes[id] ?? null) : null;
}

// A brand-new sample has no order of its own yet, so it takes the format's suggested one.
export function sampleWithFormat(id: TemplateId, now = Date.now()): Resume {
  const sample = createSampleResume(now);
  const hint = TEMPLATE_INFO[id].sectionOrderHint;
  return {
    ...sample,
    template: id,
    sectionOrder: hint ? orderByHint(sample.sectionOrder, hint) : sample.sectionOrder,
  };
}
