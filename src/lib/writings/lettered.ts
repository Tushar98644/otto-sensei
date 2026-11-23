import type { Writing } from "./schema";

// The applications a letter was written for; its own module so the query options stay small.
export function letteredApplications(
  writings: readonly Pick<Writing, "kind" | "applicationId">[],
): Set<string> {
  const ids = new Set<string>();
  for (const writing of writings) {
    if (writing.kind === "letter" && writing.applicationId) ids.add(writing.applicationId);
  }
  return ids;
}
