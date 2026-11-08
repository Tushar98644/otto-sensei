import type { captureRequestError } from "@sentry/nextjs";
import { sentryEnabled, serverRuntime } from "@/lib/observability/config";

// Sentry.init must run inside register() (@sentry/nextjs 11 checks for it at build time). The SDK
// is only loaded when Sentry is on for this runtime, so a server without a DSN never pays for it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && sentryEnabled("nodejs")) {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge" && sentryEnabled("edge")) {
    await import("../sentry.edge.config");
  }
}

// Errors that escape a server component, route handler, server action or the proxy. Errors code
// catches itself reach Sentry through log.error.
export async function onRequestError(
  ...args: Parameters<typeof captureRequestError>
): Promise<void> {
  if (!sentryEnabled(serverRuntime())) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
