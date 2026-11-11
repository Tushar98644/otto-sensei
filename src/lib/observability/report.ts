import { sentryEnabled, serverRuntime } from "./config";
import { safeTags } from "./scrub";

type Fields = Record<string, string | number | boolean | null | undefined>;

export function reportError(event: string, error: unknown, fields: Fields = {}): void {
  if (!sentryEnabled(serverRuntime())) return;
  const exception =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : event);
  const tags = { ...safeTags(fields), "log.event": event };
  void import("@sentry/nextjs")
    .then(({ captureException }) => {
      captureException(exception, { tags });
    })
    .catch(() => {});
}
