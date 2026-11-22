import type { Breadcrumb, BrowserOptions, ErrorEvent } from "@sentry/nextjs";
import {
  clean,
  SENTRY_TUNNEL,
  sentryDsn,
  sentryEnabled,
  traceSampleRate,
  type SentryRuntime,
} from "./config";
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

const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} satisfies NonNullable<BrowserOptions["dataCollection"]>;

export function sentryOptions(runtime: SentryRuntime) {
  const release = sentryRelease();
  const traces = runtime === "browser" ? undefined : traceSampleRate();
  return {
    dsn: sentryDsn(runtime),
    enabled: sentryEnabled(runtime),
    environment: sentryEnvironment(),
    // Left out rather than undefined, so the release the build injected still applies.
    ...(release ? { release } : {}),
    sendDefaultPii: false,
    // SDK 11 reads this, not sendDefaultPii, and collects users, cookies and bodies unless told not to.
    dataCollection: DATA_COLLECTION,
    // Left out when off: any number, 0 included, turns tracing on.
    ...(traces ? { tracesSampleRate: traces } : {}),
    ignoreErrors: IGNORE_ERRORS,
    ...(runtime === "browser" ? { denyUrls: DENY_URLS, tunnel: SENTRY_TUNNEL } : {}),
    maxBreadcrumbs: 50,
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
    beforeBreadcrumb: (crumb: Breadcrumb) => scrubBreadcrumb(crumb),
    beforeSendLog: () => null,
  };
}
