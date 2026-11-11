import type { BeforeSendFn, PostHog, PostHogConfig } from "posthog-js";
import type { PlanId } from "@/config/plans";
import { posthogHost, posthogKey } from "./config";
import type { ClientEvent, ClientEventProps, EventArgs } from "./events";
import { cleanProps, trackingRefused } from "./privacy";

// Every export is a no-op without a key, on the server, and under Do Not Track or GPC.

type Identity = { id: string; plan: PlanId };

// Not imported: the SDK is ~90 KB no page needs to render.
let loading: Promise<PostHog | null> | null = null;
// Held here so a sign-in seen during hydration is applied once the SDK is up, not racing init().
let identity: Identity | null | undefined;

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined" || !posthogKey()) return false;
  const legacyDnt = (window as Window & { doNotTrack?: string | null }).doNotTrack;
  return !trackingRefused(window.navigator, legacyDnt);
}

const scrub: BeforeSendFn = (event) => ({
  ...event,
  properties: cleanProps(event.properties),
  // $set and $set_once carry their own copies of the URL and referrer.
  ...(event.$set && { $set: cleanProps(event.$set) }),
  ...(event.$set_once && { $set_once: cleanProps(event.$set_once) }),
});

const CONFIG: Partial<PostHogConfig> = {
  defaults: "2026-05-30",
  // Clicks and form fields in the studio are a person's resume, so only named events are sent.
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_dead_clicks: false,
  capture_heatmaps: false,
  capture_exceptions: false,
  rageclick: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  // So nothing else is ever fetched from PostHog.
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
  mask_all_text: true,
  mask_all_element_attributes: true,
  respect_dnt: true,
  // A random device id in localStorage, never a cookie, and no person profile until sign-in.
  persistence: "localStorage",
  person_profiles: "identified_only",
  save_referrer: false,
  property_denylist: ["$referrer", "$referring_domain", "$initial_referrer", "$initial_referring_domain"],
  before_send: scrub,
};

// Analytics has nothing to say about a page that hasn't rendered.
function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout: 4_000 });
    } else {
      window.setTimeout(resolve, 1_500);
    }
  });
}

function load(): Promise<PostHog | null> {
  if (loading) return loading;
  const key = posthogKey();
  if (!key || !analyticsEnabled()) return Promise.resolve(null);
  loading = whenIdle()
    .then(() => import("posthog-js"))
    .then(({ default: posthog }) => {
      posthog.init(key, { ...CONFIG, api_host: posthogHost() });
      attempt(posthog, applyIdentity);
      return posthog;
    })
    .catch(() => null);
  return loading;
}

function attempt(posthog: PostHog, run: (posthog: PostHog) => void): void {
  try {
    run(posthog);
  } catch {
    // A blocked or half-loaded SDK must never surface to the person using the app.
  }
}

function withPosthog(run: (posthog: PostHog) => void): void {
  if (!analyticsEnabled()) return;
  void load().then((posthog) => {
    if (posthog) attempt(posthog, run);
  });
}

export function startAnalytics(): void {
  void load();
}

export function track<E extends ClientEvent>(event: E, ...args: EventArgs<ClientEventProps[E]>): void {
  const [props] = args;
  withPosthog((posthog) => posthog.capture(event, cleanProps(props)));
}

function applyIdentity(posthog: PostHog): void {
  if (identity === undefined) return;
  if (identity === null) {
    // Signed out: the next person on this browser gets a fresh anonymous id, not this account.
    if (posthog._isIdentified()) posthog.reset();
    return;
  }
  // Only a change of person counts as a sign-in; later page loads keep the same distinct id.
  if (posthog.get_distinct_id() === identity.id) return;
  // Someone else signed in on this browser without signing out: never merge two people.
  if (posthog._isIdentified()) posthog.reset();
  posthog.identify(identity.id, { plan: identity.plan });
  const props: ClientEventProps["signed_in"] = { plan: identity.plan };
  posthog.capture("signed_in", props);
}

/** The user id only: never an email or a name. */
export function identifyUser(id: string, plan: PlanId): void {
  identity = { id, plan };
  withPosthog(applyIdentity);
}

export function resetUser(): void {
  identity = null;
  withPosthog(applyIdentity);
}

export function resetAnalyticsForTests(): void {
  loading = null;
  identity = undefined;
}
