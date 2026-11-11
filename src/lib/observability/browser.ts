import { sentryEnabled, sentryOptions } from "./config";

type Sdk = typeof import("./sentry-browser");

let loading: Promise<Sdk | null> | null = null;

// Only ever a dynamic import: a static one would put the SDK in every page's chunk. null when
// Sentry is off or the chunk can't load; tries again on the next call.
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
