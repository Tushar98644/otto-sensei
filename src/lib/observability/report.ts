import { sentryEnabled, serverRuntime } from "./config";
import { safeTags } from "./scrub";

type Fields = Record<string, string | number | boolean | null | undefined>;

/**
 * Sends an error that server code caught and logged to Sentry, with the log fields as tags.
 * Without a DSN (or in development and tests) it returns before loading the SDK at all.
 */
export function reportError(event: string, error: unknown, fields: Fields = {}): void {
  if (!sentryEnabled(serverRuntime())) return;
  // A thrown string or object would be serialized whole; the event name says where it came from.
  const exception =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : event);
  const tags = { ...safeTags(fields), "log.event": event };
  // Loaded on demand so log.ts stays light where Sentry is off. In production, src/instrumentation.ts
  // has already loaded it, so this resolves at once.
  void import("@sentry/nextjs")
    .then(({ captureException }) => {
      captureException(exception, { tags });
    })
    .catch(() => {
      // Reporting must never break the code that was reporting.
    });
}
