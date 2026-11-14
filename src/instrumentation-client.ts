import { holdEarlyErrors, loadSentrySoon } from "@/lib/observability/browser";
import { isAppPage } from "@/lib/observability/pages";

holdEarlyErrors();

if (isAppPage(window.location.pathname)) loadSentrySoon();

// Navigation spans are off, so this only brings the SDK in once the visitor moves into the app.
export function onRouterTransitionStart(href: string): void {
  if (isAppPage(new URL(href, window.location.origin).pathname)) loadSentrySoon();
}
