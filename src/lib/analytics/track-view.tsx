"use client";

import { useEffect, useEffectEvent } from "react";
import { track } from "./client";
import type { ClientEvent, ClientEventProps } from "./events";

// Sends an event when something is shown, from a server or client component:
// <TrackView event="landing_viewed" /> or <TrackView event="screener_viewed" props={...} once={id} />.

type TrackViewProps = {
  [E in ClientEvent]: {
    event: E;
    // Sent at most once per page load for each value, e.g. once per resume.
    once?: string;
  } & (ClientEventProps[E] extends Record<string, never>
    ? { props?: ClientEventProps[E] }
    : { props: ClientEventProps[E] });
}[ClientEvent];

// The union above already ties each event to its props; this only drops the per-event generic.
const send = track as (event: ClientEvent, props?: ClientEventProps[ClientEvent]) => void;

const sent = new Set<string>();

export function TrackView({ event, once, props }: TrackViewProps): null {
  const fire = useEffectEvent(() => {
    if (once !== undefined) {
      const key = `${event}:${once}`;
      if (sent.has(key)) return;
      sent.add(key);
    }
    send(event, props);
  });

  useEffect(() => {
    fire();
  }, [event, once]);

  return null;
}
