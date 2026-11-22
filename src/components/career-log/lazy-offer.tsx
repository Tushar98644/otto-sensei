"use client";

import { Lazy, lazyComponent } from "@/components/ui/lazy";
import type { CareerLogOfferProps } from "./career-log-offer";

const offer = lazyComponent(() => import("./career-log-offer").then((m) => m.CareerLogOffer));

// Its code loads only when there's an offer to congratulate.
export function LazyCareerLogOffer(props: CareerLogOfferProps) {
  if (!props.moment && !props.hired) return null;
  return <Lazy loader={offer} wanted props={props} />;
}
