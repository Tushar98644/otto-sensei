import type { LintIssue, LintIssueId, LintMessage, LintSeverity } from "./types";

// messageId and params ride along unseen by JSON and equality checks, so English issues keep their shape.
export function makeIssue(
  id: LintIssueId,
  severity: LintSeverity,
  message: LintMessage,
  match: string | null,
): LintIssue {
  const issue: LintIssue = { id, severity, message: message.text, match };
  return Object.defineProperties(issue, {
    messageId: { value: message.id },
    params: { value: message.params },
  });
}
