import { visibleResume } from "@/lib/pdf/visible";
import type { Resume } from "@/lib/resume/schema";

// The page sends this copy to the browser, so hiding things only in the markup isn't enough.
export function shareSnapshot(resume: Resume): Resume {
  return { ...visibleResume(resume), title: "", tailor: null, hiddenSections: [] };
}

export function publicResume(snapshot: Resume, showContact: boolean): Resume {
  if (showContact) return snapshot;
  return { ...snapshot, basics: { ...snapshot.basics, email: "", phone: "" } };
}
