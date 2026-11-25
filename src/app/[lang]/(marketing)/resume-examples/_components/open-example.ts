import { roomForResume } from "@/components/account/pro-tools";
import type { Locale } from "@/i18n/config";
import { track } from "@/lib/analytics/client";
import { exampleResume } from "@/lib/seo-pages/examples";
import { examplesIn } from "@/lib/seo-pages/locales/examples";
import { flushStudio, useStudioStore } from "@/lib/store/resume-store";

// The copy is the person's own resume from the start, so it takes Free's resume slot like any other; a translated page opens its language's copy.
export async function openExampleInStudio(
  slug: string,
  retry?: () => void,
  locale: Locale = "en",
): Promise<boolean> {
  const example = (await examplesIn(locale)).find((entry) => entry.slug === slug);
  if (!example) return false;
  // A write before the saved studio loads would replace it.
  if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
  if (!(await roomForResume(retry))) return false;
  const { addResume, setStep } = useStudioStore.getState();
  addResume(exampleResume(example));
  track("resume_imported", { source: "example" });
  setStep("fix");
  flushStudio();
  return true;
}
