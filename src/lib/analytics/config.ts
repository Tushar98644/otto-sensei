// Read in the browser and on the server, so it can't use src/lib/env.ts (server-only). Each
// NEXT_PUBLIC_ name is written out in full: Next inlines only literal references into the bundle.

const DEFAULT_HOST = "https://us.i.posthog.com";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The PostHog project key, or undefined when analytics is off. A project key can only write
 * events, so it is safe in the bundle. Always off under vitest, so no test run reaches PostHog.
 */
export function posthogKey(): string | undefined {
  if (process.env.NODE_ENV === "test") return undefined;
  return clean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/** Where the browser sends events: a full URL, or a same-site relay path such as "/ingest". */
export function posthogHost(): string {
  return clean(process.env.NEXT_PUBLIC_POSTHOG_HOST)?.replace(/\/+$/, "") ?? DEFAULT_HOST;
}

// A relay path only works from a browser on our own site, so the server goes to PostHog direct.
export function posthogServerHost(): string {
  const host = posthogHost();
  return /^https?:\/\//i.test(host) ? host : DEFAULT_HOST;
}
