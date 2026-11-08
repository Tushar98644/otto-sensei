import { sentryEnabled, sentryOptions } from "./config";

type Sdk = typeof import("./sentry-browser");

let loading: Promise<Sdk | null> | null = null;

/**
 * Fetches and starts the browser SDK once. Only ever a dynamic import: a static one would put the
 * SDK in the chunk every page downloads, Sentry or not. Resolves to null when Sentry is off or the
 * chunk can't load (offline), and tries again on the next call.
 */
export function loadSentry(): Promise<Sdk | null> {
  if (!sentryEnabled("browser")) return Promise.resolve(null);
  loading ??= import("./sentry-browser").then(
    (Sentry) => {
      Sentry.init(sentryOptions("browser"));
      return Sentry;
    },
    () => {
      loading = null;
      return null;
    },
  );
  return loading;
}

export function reportClientError(error: unknown): void {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
