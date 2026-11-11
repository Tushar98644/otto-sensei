import type { Resume } from "@/lib/resume/schema";
import { jsonResumeFileName, toJsonResume } from "./export";

export function downloadJsonResume(resume: Resume): void {
  const blob = new Blob([`${JSON.stringify(toJsonResume(resume), null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = jsonResumeFileName(resume);
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers start the download after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
