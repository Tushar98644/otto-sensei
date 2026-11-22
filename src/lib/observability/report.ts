import { after } from "next/server";
import { sentryEnabled, serverRuntime } from "./config";
import { safeTags } from "./scrub";

type Fields = Record<string, string | number | boolean | null | undefined>;

const FLUSH_TIMEOUT_MS = 2_000;

export function reportError(event: string, error: unknown, fields: Fields = {}): void {
  if (!sentryEnabled(serverRuntime())) return;
  const exception =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : event);
  const tags = { ...safeTags(fields), "log.event": event };
  const user = typeof fields.userId === "string" ? { user: { id: fields.userId } } : {};
  const sent = import("@sentry/nextjs")
    .then(({ captureException, flush }) => {
      captureException(exception, { tags, ...user });
      return flush(FLUSH_TIMEOUT_MS);
    })
    .catch(() => false);
  try {
    // A function can be frozen the moment it responds; after() keeps it alive until the report is out.
    after(sent);
  } catch {}
}
