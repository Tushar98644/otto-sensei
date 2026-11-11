import { TEMPLATE_INFO, orderByHint } from "@/lib/pdf/templates";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume, TemplateId } from "@/lib/resume/schema";

type StudioResumes = {
  activeId: string | null;
  order: readonly string[];
  resumes: Readonly<Record<string, Resume>>;
};

export function formatTarget({ activeId, order, resumes }: StudioResumes): Resume | null {
  const id = activeId ?? order[0];
  return id ? (resumes[id] ?? null) : null;
}

export function sampleWithFormat(id: TemplateId, now = Date.now()): Resume {
  const sample = createSampleResume(now);
  const hint = TEMPLATE_INFO[id].sectionOrderHint;
  return {
    ...sample,
    template: id,
    sectionOrder: hint ? orderByHint(sample.sectionOrder, hint) : sample.sectionOrder,
  };
}
