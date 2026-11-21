"use client";

import type { Library } from "@/components/account/pro-tools";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";

export function latestSampleId({ resumes, order }: Library): string | null {
  let latest: Resume | null = null;
  for (const id of order) {
    const resume = resumes[id];
    if (resume?.source === "sample" && (!latest || resume.updatedAt > latest.updatedAt)) latest = resume;
  }
  return latest?.id ?? null;
}

// Trying the sample again opens the copy already here instead of stacking up another.
export function openSample(now = Date.now()): { id: string; created: boolean } {
  const store = useStudioStore.getState();
  const existing = latestSampleId(store);
  if (existing) {
    store.setActive(existing);
    return { id: existing, created: false };
  }
  const sample = createSampleResume(now);
  store.addResume(sample);
  return { id: sample.id, created: true };
}
