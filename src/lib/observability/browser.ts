import { sentryEnabled } from "./config";

type Sdk = typeof import("./sentry-browser");
type Held = { error: Error; type: string };

const MAX_HELD = 10;

let loading: Promise<Sdk | null> | null = null;
let scheduled = false;
const held: Held[] = [];

function hold(error: unknown, type: string): void {
  // Other origins' "Script error." events and non-Error rejections would be dropped by Sentry anyway.
  if (!(error instanceof Error)) return;
  if (held.length < MAX_HELD) held.push({ error, type });
  void loadSentry();
}

const onError = (event: ErrorEvent) => hold(event.error, "auto.browser.global_handlers.onerror");
const onRejection = (event: PromiseRejectionEvent) =>
  hold(event.reason, "auto.browser.global_handlers.onunhandledrejection");

// Uncaught errors from before the SDK is up are kept and sent once it is, so loading it late loses none.
export function holdEarlyErrors(): void {
  if (!sentryEnabled("browser")) return;
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
}

function release(Sentry: Sdk): void {
  window.removeEventListener("error", onError);
  window.removeEventListener("unhandledrejection", onRejection);
  for (const { error, type } of held.splice(0)) {
    Sentry.captureException(error, { mechanism: { handled: false, type } });
  }
}

function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4_000 });
  } else {
    window.setTimeout(run, 1_500);
  }
}

// Idle, so the SDK never competes with hydration or a navigation's own chunks.
export function loadSentrySoon(): void {
  if (scheduled || !sentryEnabled("browser")) return;
  scheduled = true;
  whenIdle(() => void loadSentry());
}

// Only ever a dynamic import: a static one would put the SDK in every page's chunk.
function loadSentry(): Promise<Sdk | null> {
  if (!sentryEnabled("browser")) return Promise.resolve(null);
  loading ??= import("./sentry-browser").then(
    (Sentry) => {
      Sentry.init(Sentry.sentryOptions("browser"));
      release(Sentry);
      return Sentry;
    },
    () => {
      loading = null;
      scheduled = false;
      return null;
    },
  );
  return loading;
}

export function reportClientError(error: unknown): void {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
