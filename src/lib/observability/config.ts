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

// First-party, so ad blockers that drop requests to Sentry's own host still let reports through.
export const SENTRY_TUNNEL = "/api/relay";

const DEFAULT_TRACE_RATE = 0.05;

// Server spans only; "0" turns them off. The browser never traces.
export function traceSampleRate(): number | undefined {
  const raw = clean(process.env.SENTRY_TRACES_SAMPLE_RATE);
  const rate = raw === undefined ? DEFAULT_TRACE_RATE : Number(raw);
  return Number.isFinite(rate) && rate > 0 ? Math.min(rate, 1) : undefined;
}

export function serverRuntime(): SentryRuntime {
  return process.env.NEXT_RUNTIME === "edge" ? "edge" : "nodejs";
}
