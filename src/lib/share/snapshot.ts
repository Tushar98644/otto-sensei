import { visibleResume } from "@/lib/pdf/visible";
import type { Resume } from "@/lib/resume/schema";

// Pure and client-safe.

/**
 * The copy a share link keeps: what the PDF would print, and nothing else. Hidden lines, entries
 * and sections are drafts the owner chose not to send. The tailoring notes (the job, its keywords,
 * the cover letter) and the owner's own name for the file ("Acme, 2nd try") are not for readers.
 * The page sends this copy to the browser for its PDF button, so leaving them out of the page's
 * markup alone would not be enough.
 */
export function shareSnapshot(resume: Resume): Resume {
  return { ...visibleResume(resume), title: "", tailor: null, hiddenSections: [] };
}

/** The snapshot as a reader gets it: email and phone only when the owner said so. */
export function publicResume(snapshot: Resume, showContact: boolean): Resume {
  if (showContact) return snapshot;
  return { ...snapshot, basics: { ...snapshot.basics, email: "", phone: "" } };
}
