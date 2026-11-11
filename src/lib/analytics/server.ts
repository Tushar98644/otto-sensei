import { after } from "next/server";
import { PostHog } from "posthog-node";
import { log } from "@/lib/log";
import { posthogKey, posthogServerHost } from "./config";
import type { ServerEvent, ServerEventProps } from "./events";
import { cleanProps } from "./privacy";

// Sent after the response, so analytics never slows or fails a request.

/** Counted, never profiled. */
export const ANONYMOUS_ID = "anonymous";

const REQUEST_TIMEOUT_MS = 3_000;

let client: PostHog | null = null;

function posthog(key: string): PostHog {
  client ??= new PostHog(key, {
    host: posthogServerHost(),
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: REQUEST_TIMEOUT_MS,
    fetchRetryCount: 1,
    // Our server's location says nothing about the person.
    disableGeoip: true,
  });
  return client;
}

type PersonProps = Record<string, string | number | boolean>;

export type CaptureOptions = {
  set?: PersonProps;
};

// Never throws.
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
      await posthog(key).captureImmediate({ distinctId, event, properties, disableGeoip: true });
    } catch (error) {
      log.warn("analytics.capture_failed", { event }, error);
    }
  };
  try {
    // A function can be frozen the moment it responds; after() keeps it alive for the send.
    after(send);
  } catch {
    // Outside a request (a script, a test): nothing to wait for, so send now.
    void send();
  }
}

export function resetServerAnalyticsForTests(): void {
  client = null;
}
