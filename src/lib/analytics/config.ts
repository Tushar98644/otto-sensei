// Not src/lib/env.ts (server-only). NEXT_PUBLIC_ names are written in full: Next only inlines
// literals.

const DEFAULT_HOST = "https://us.i.posthog.com";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// A project key can only write events, so it's safe in the bundle. Always off under vitest.
export function posthogKey(): string | undefined {
  if (process.env.NODE_ENV === "test") return undefined;
  return clean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/** A full URL, or a same-site relay path such as "/ingest". */
export function posthogHost(): string {
  return clean(process.env.NEXT_PUBLIC_POSTHOG_HOST)?.replace(/\/+$/, "") ?? DEFAULT_HOST;
}

// A relay path only works from a browser on our own site, so the server goes to PostHog direct.
export function posthogServerHost(): string {
  const host = posthogHost();
  return /^https?:\/\//i.test(host) ? host : DEFAULT_HOST;
}
