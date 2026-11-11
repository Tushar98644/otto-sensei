import type { captureRequestError } from "@sentry/nextjs";
import { sentryEnabled, serverRuntime } from "@/lib/observability/config";

// Sentry.init must run inside register(): @sentry/nextjs 11 checks for it at build time.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && sentryEnabled("nodejs")) {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge" && sentryEnabled("edge")) {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  ...args: Parameters<typeof captureRequestError>
): Promise<void> {
  if (!sentryEnabled(serverRuntime())) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
