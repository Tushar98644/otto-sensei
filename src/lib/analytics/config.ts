// NEXT_PUBLIC_ names are written in full: Next only inlines literal process.env reads.

const DEFAULT_HOST = "https://us.i.posthog.com";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function posthogKey(): string | undefined {
  if (process.env.NODE_ENV === "test") return undefined;
  return clean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function posthogHost(): string {
  return clean(process.env.NEXT_PUBLIC_POSTHOG_HOST)?.replace(/\/+$/, "") ?? DEFAULT_HOST;
}

export function posthogServerHost(): string {
  const host = posthogHost();
  return /^https?:\/\//i.test(host) ? host : DEFAULT_HOST;
}
