import { sentryEnabled, serverRuntime } from "./config";
import { safeTags } from "./scrub";

type Fields = Record<string, string | number | boolean | null | undefined>;

// Log fields become tags. Without a DSN it returns before loading the SDK.
export function reportError(event: string, error: unknown, fields: Fields = {}): void {
  if (!sentryEnabled(serverRuntime())) return;
  // A thrown string or object would be serialized whole; the event name says where it came from.
  const exception =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : event);
  const tags = { ...safeTags(fields), "log.event": event };
  // On demand so log.ts stays light where Sentry is off.
  void import("@sentry/nextjs")
    .then(({ captureException }) => {
      captureException(exception, { tags });
    })
    .catch(() => {
      // Reporting must never break the code that was reporting.
    });
}
