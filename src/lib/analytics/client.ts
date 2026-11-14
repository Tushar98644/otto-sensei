import type { BeforeSendFn, PostHog, PostHogConfig } from "posthog-js/dist/module.slim.js";
import type { PlanId } from "@/config/plans";
import { posthogHost, posthogKey } from "./config";
import type { ClientEvent, ClientEventProps, EventArgs } from "./events";
import { cleanProps, trackingRefused } from "./privacy";

type Identity = { id: string; plan: PlanId };

let loading: Promise<PostHog | null> | null = null;
// Held so a sign-in seen during hydration applies once the SDK is up, not racing init().
let identity: Identity | null | undefined;

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined" || !posthogKey()) return false;
  const legacyDnt = (window as Window & { doNotTrack?: string | null }).doNotTrack;
  return !trackingRefused(window.navigator, legacyDnt);
}

const scrub: BeforeSendFn = (event) => ({
  ...event,
  properties: cleanProps(event.properties),
  ...(event.$set && { $set: cleanProps(event.$set) }),
  ...(event.$set_once && { $set_once: cleanProps(event.$set_once) }),
});

const CONFIG: Partial<PostHogConfig> = {
  defaults: "2026-05-30",
  // Clicks and fields in the studio are a person's resume: only named events are sent.
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
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
  mask_all_text: true,
  mask_all_element_attributes: true,
  respect_dnt: true,
  persistence: "localStorage",
  person_profiles: "identified_only",
  save_referrer: false,
  property_denylist: ["$referrer", "$referring_domain", "$initial_referrer", "$initial_referring_domain"],
  before_send: scrub,
};

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
    // The slim build leaves out every extension CONFIG turns off; it is a dist path, so recheck it on upgrades.
    .then(() => import("posthog-js/dist/module.slim.js"))
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
  } catch {}
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
    if (posthog._isIdentified()) posthog.reset();
    return;
  }
  if (posthog.get_distinct_id() === identity.id) return;
  // Someone else signed in on this browser without signing out: never merge two people.
  if (posthog._isIdentified()) posthog.reset();
  posthog.identify(identity.id, { plan: identity.plan });
  const props: ClientEventProps["signed_in"] = { plan: identity.plan };
  posthog.capture("signed_in", props);
}

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
