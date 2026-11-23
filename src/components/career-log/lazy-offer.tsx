"use client";

import { useSessionUserId } from "@/components/account/session-user";
import { Lazy, lazyComponent, useLazy } from "@/components/ui/lazy";
import type { CareerLogOfferProps } from "./career-log-offer";
import { useCareerLog } from "./use-career-log";

const offer = lazyComponent(() => import("./career-log-offer").then((m) => m.CareerLogOffer));

// Whether the offer can draw now, or never will, so a page above which it sits can wait for it once.
export function useCareerLogOfferSettled(moment: boolean): boolean {
  const userId = useSessionUserId();
  const code = useLazy(offer, moment);
  const { status } = useCareerLog(userId, moment);
  return !moment || !userId || (code !== null && status !== "pending");
}

// Its code loads only when there's an offer to congratulate.
export function LazyCareerLogOffer(props: CareerLogOfferProps) {
  if (!props.moment && !props.hired) return null;
  return <Lazy loader={offer} wanted props={props} />;
}
