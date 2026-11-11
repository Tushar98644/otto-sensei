import { loadSentry } from "@/lib/observability/browser";

// Marketing pages pay most for the SDK download and have no session worth debugging, so it loads
// once the visitor moves into the app. A crash there still reports through global-error.tsx.
const MARKETING_PATHS = new Set(["/", "/pricing", "/privacy", "/terms", "/refunds"]);

const wanted = (path: string) => !MARKETING_PATHS.has(path);

if (wanted(window.location.pathname)) void loadSentry();

export function onRouterTransitionStart(href: string, navigationType: string): void {
  if (!wanted(new URL(href, window.location.origin).pathname)) return;
  void loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart(href, navigationType));
}
