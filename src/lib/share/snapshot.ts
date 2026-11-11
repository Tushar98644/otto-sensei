import { visibleResume } from "@/lib/pdf/visible";
import type { Resume } from "@/lib/resume/schema";

// What the PDF would print and nothing else: no hidden drafts, tailoring notes or the owner's own
// file name. The page sends this copy to the browser for its PDF button, so leaving them out of the
// markup alone wouldn't be enough.
export function shareSnapshot(resume: Resume): Resume {
  return { ...visibleResume(resume), title: "", tailor: null, hiddenSections: [] };
}

/** Email and phone only when the owner said so. */
export function publicResume(snapshot: Resume, showContact: boolean): Resume {
  if (showContact) return snapshot;
  return { ...snapshot, basics: { ...snapshot.basics, email: "", phone: "" } };
}
