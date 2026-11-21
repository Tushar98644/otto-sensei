import { TEMPLATE_INFO, orderByHint, templateOf, withTemplate } from "@/lib/pdf/templates";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { EDIT_LABELS, type EditOptions } from "@/lib/store/history";
import type { StudioStep } from "@/lib/store/resume-store";

type StudioResumes = {
  activeId: string | null;
  order: readonly string[];
  resumes: Readonly<Record<string, Resume>>;
};

export type FormatStore = StudioResumes & {
  setActive: (id: string) => void;
  updateResume: (id: string, updater: (resume: Resume) => Resume, options?: EditOptions) => void;
  setStep: (step: StudioStep) => void;
};

export function formatTarget(
  { activeId, order, resumes }: StudioResumes,
  picked: string | null = null,
): Resume | null {
  const pickedResume = picked ? resumes[picked] : undefined;
  if (pickedResume) return pickedResume;
  const id = activeId ?? order[0];
  return id ? (resumes[id] ?? null) : null;
}

// A sample takes the format's section order too; someone's own resume keeps theirs until they move it.
export function inFormat(resume: Resume, id: TemplateId): Resume {
  const hint = TEMPLATE_INFO[id].sectionOrderHint;
  const sectionOrder =
    resume.source === "sample" && hint
      ? orderByHint(resume.sectionOrder, hint)
      : resume.sectionOrder;
  return { ...withTemplate(resume, id), sectionOrder };
}

export function sampleWithFormat(id: TemplateId, now = Date.now()): Resume {
  return inFormat(createSampleResume(now), id);
}

let chosen: TemplateId | null = null;

export function chosenFormat(): TemplateId | null {
  return chosen;
}

export function clearChosenFormat(): void {
  chosen = null;
}

// With nothing to apply it to, the format waits on Upload for the resume that comes next.
export function openFormat(
  store: FormatStore,
  id: TemplateId,
  picked: string | null = null,
): StudioStep {
  const resume = formatTarget(store, picked);
  if (!resume) {
    chosen = id;
    store.setStep("upload");
    return "upload";
  }
  chosen = null;
  if (store.activeId !== resume.id) store.setActive(resume.id);
  if (templateOf(resume) !== id) {
    store.updateResume(resume.id, (r) => inFormat(r, id), { label: EDIT_LABELS.format });
  }
  store.setStep("download");
  return "download";
}
