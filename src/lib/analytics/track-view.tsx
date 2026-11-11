"use client";

import { useEffect, useEffectEvent } from "react";
import { track } from "./client";
import type { ClientEvent, ClientEventProps } from "./events";

type TrackViewProps = {
  [E in ClientEvent]: {
    event: E;
    once?: string;
  } & (ClientEventProps[E] extends Record<string, never>
    ? { props?: ClientEventProps[E] }
    : { props: ClientEventProps[E] });
}[ClientEvent];

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
