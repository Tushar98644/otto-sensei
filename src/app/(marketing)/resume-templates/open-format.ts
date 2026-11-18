import { unlockProTool } from "@/components/account/pro-tools";
import { formatTarget, sampleWithFormat } from "@/components/formats/apply-format";
import { isProTemplate, templateOf, withTemplate } from "@/lib/pdf/templates";
import type { TemplateId } from "@/lib/resume/schema";
import { flushStudio, useStudioStore } from "@/lib/store/resume-store";

// Same as the dashboard's format gallery: a Pro format offers Pro first, then the open resume (or a sample) takes it.
export async function openFormatInStudio(id: TemplateId): Promise<boolean> {
  if (isProTemplate(id) && !(await unlockProTool("formats"))) return false;
  // A write before the saved studio loads would replace it.
  if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
  const store = useStudioStore.getState();
  const resume = formatTarget(store);
  if (resume) {
    if (store.activeId !== resume.id) store.setActive(resume.id);
    if (templateOf(resume) !== id) store.updateResume(resume.id, (r) => withTemplate(r, id));
  } else {
    store.addResume(sampleWithFormat(id));
  }
  store.setStep("download");
  flushStudio();
  return true;
}
