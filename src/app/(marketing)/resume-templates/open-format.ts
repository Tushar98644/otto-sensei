import { openFormat } from "@/components/formats/apply-format";
import type { TemplateId } from "@/lib/resume/schema";
import { flushStudio, useStudioStore } from "@/lib/store/resume-store";

// Same as the dashboard's gallery: any format opens, and the download step is where the plan applies.
export async function openFormatInStudio(id: TemplateId): Promise<void> {
  // A write before the saved studio loads would replace it.
  if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
  openFormat(useStudioStore.getState(), id);
  flushStudio();
}
