import { after } from "next/server";
import type { PostHog } from "posthog-node";
import { log } from "@/lib/log";
import { posthogKey, posthogServerHost } from "./config";
import type { ServerEvent, ServerEventProps } from "./events";
import { cleanProps } from "./privacy";

export const ANONYMOUS_ID = "anonymous";

const REQUEST_TIMEOUT_MS = 3_000;

let client: Promise<PostHog> | null = null;

// The SDK loads with the first event, so a route that sends none doesn't load it when it starts cold.
function posthog(key: string): Promise<PostHog> {
  client ??= import("posthog-node").then(
    ({ PostHog }) =>
      new PostHog(key, {
        host: posthogServerHost(),
        flushAt: 1,
        flushInterval: 0,
        requestTimeout: REQUEST_TIMEOUT_MS,
        fetchRetryCount: 1,
        disableGeoip: true,
      }),
    (error: unknown) => {
      client = null;
      throw error;
    },
  );
  return client;
}

type PersonProps = Record<string, string | number | boolean>;

export type CaptureOptions = {
  set?: PersonProps;
};

export function captureServerEvent<E extends ServerEvent>(
  distinctId: string,
  event: E,
  props: ServerEventProps[E],
  options: CaptureOptions = {},
): void {
  const key = posthogKey();
  if (!key) return;
  const properties: Record<string, unknown> = cleanProps(props);
  if (distinctId === ANONYMOUS_ID) properties.$process_person_profile = false;
  if (options.set) properties.$set = cleanProps(options.set);

  const send = async () => {
    try {
      const sdk = await posthog(key);
      await sdk.captureImmediate({ distinctId, event, properties, disableGeoip: true });
    } catch (error) {
      log.warn("analytics.capture_failed", { event }, error);
    }
  };
  try {
    // A function can be frozen the moment it responds; after() keeps it alive for the send.
    after(send);
  } catch {
    void send();
  }
}

export type BatchEvent = {
  event: string;
  distinctId: string;
  properties: Record<string, string | number | boolean>;
};

// One request to PostHog for a whole beacon, instead of one per event.
export function captureBatch(events: readonly BatchEvent[]): void {
  const key = posthogKey();
  if (!key || events.length === 0) return;
  const timestamp = new Date().toISOString();
  const batch = events.map(({ event, distinctId, properties }) => ({
    event,
    distinct_id: distinctId,
    timestamp,
    properties: { ...cleanProps(properties), $lib: "otto-web", $geoip_disable: true },
  }));
  const send = async () => {
    try {
      const res = await fetch(`${posthogServerHost()}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, batch }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) log.warn("analytics.batch_failed", { status: res.status });
    } catch (error) {
      log.warn("analytics.batch_failed", {}, error);
    }
  };
  try {
    after(send);
  } catch {
    void send();
  }
}

export function resetServerAnalyticsForTests(): void {
  client = null;
}
