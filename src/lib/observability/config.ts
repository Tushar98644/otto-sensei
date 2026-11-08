import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { scrubBreadcrumb, scrubEvent } from "./scrub";

// Read on the server, the edge and in the browser, so it can't use src/lib/env.ts (server-only).
// Each NEXT_PUBLIC_ name is written out in full: Next inlines only literal references into the
// client bundle.

export type SentryRuntime = "nodejs" | "edge" | "browser";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** The DSN for this runtime, or undefined. The browser only ever sees the public one. */
export function sentryDsn(runtime: SentryRuntime): string | undefined {
  const publicDsn = clean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (runtime === "browser") return publicDsn;
  return clean(process.env.SENTRY_DSN) ?? publicDsn;
}

// `bun dev` stays quiet unless asked: hot-reload errors and half-typed code would bury real ones.
function devOptIn(): boolean {
  const flag = clean(process.env.NEXT_PUBLIC_SENTRY_DEV)?.toLowerCase();
  return flag === "1" || flag === "true";
}

/** On with a DSN in production; in development only with NEXT_PUBLIC_SENTRY_DEV=1; never in tests. */
export function sentryEnabled(runtime: SentryRuntime): boolean {
  if (!sentryDsn(runtime)) return false;
  if (process.env.NODE_ENV === "production") return true;
  return process.env.NODE_ENV === "development" && devOptIn();
}

/** The current server runtime, for code that runs on both Node.js and the edge. */
export function serverRuntime(): SentryRuntime {
  return process.env.NEXT_RUNTIME === "edge" ? "edge" : "nodejs";
}

// Previews are NODE_ENV=production too; Vercel's own name keeps their errors apart from live ones.
function sentryEnvironment(): string {
  return (
    clean(process.env.NEXT_PUBLIC_VERCEL_ENV) ??
    clean(process.env.VERCEL_ENV) ??
    process.env.NODE_ENV ??
    "development"
  );
}

// Vercel exposes the commit to the browser bundle only under its NEXT_PUBLIC_ name.
function sentryRelease(): string | undefined {
  return (
    clean(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) ?? clean(process.env.VERCEL_GIT_COMMIT_SHA)
  );
}

// The visitor's network or a browser extension, not a bug in the app.
const IGNORE_ERRORS: (string | RegExp)[] = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  /^AbortError/,
  "Failed to fetch",
  "NetworkError when attempting to fetch resource",
  "The network connection was lost",
  "Load failed",
  "Non-Error promise rejection captured",
];

const DENY_URLS = [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//];

/** Sentry.init options shared by every runtime. Errors only: no tracing, replay or logs. */
export function sentryOptions(runtime: SentryRuntime) {
  const release = sentryRelease();
  return {
    dsn: sentryDsn(runtime),
    enabled: sentryEnabled(runtime),
    environment: sentryEnvironment(),
    // Left out rather than undefined, so the release the build injected still applies.
    ...(release ? { release } : {}),
    sendDefaultPii: false,
    // No tracesSampleRate: any number, 0 included, turns tracing on and spends the quota on spans.
    ignoreErrors: IGNORE_ERRORS,
    ...(runtime === "browser" ? { denyUrls: DENY_URLS } : {}),
    maxBreadcrumbs: 50,
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
    beforeBreadcrumb: (crumb: Breadcrumb) => scrubBreadcrumb(crumb),
    // Nothing here writes Sentry logs; drop any a dependency sends, since they skip beforeSend.
    beforeSendLog: () => null,
  };
}
