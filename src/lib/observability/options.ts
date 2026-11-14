import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { clean, sentryDsn, sentryEnabled, type SentryRuntime } from "./config";
import { scrubBreadcrumb, scrubEvent } from "./scrub";

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
    beforeSendLog: () => null,
  };
}
