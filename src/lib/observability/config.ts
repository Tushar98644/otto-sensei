// NEXT_PUBLIC_ names are written in full: Next only inlines literal reads.

export type SentryRuntime = "nodejs" | "edge" | "browser";

export function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function sentryDsn(runtime: SentryRuntime): string | undefined {
  const publicDsn = clean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (runtime === "browser") return publicDsn;
  return clean(process.env.SENTRY_DSN) ?? publicDsn;
}

function devOptIn(): boolean {
  const flag = clean(process.env.NEXT_PUBLIC_SENTRY_DEV)?.toLowerCase();
  return flag === "1" || flag === "true";
}

export function sentryEnabled(runtime: SentryRuntime): boolean {
  if (!sentryDsn(runtime)) return false;
  if (process.env.NODE_ENV === "production") return true;
  return process.env.NODE_ENV === "development" && devOptIn();
}

export function serverRuntime(): SentryRuntime {
  return process.env.NEXT_RUNTIME === "edge" ? "edge" : "nodejs";
}
