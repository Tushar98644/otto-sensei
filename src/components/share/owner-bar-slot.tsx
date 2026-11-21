"use client";

import { SessionUserProvider } from "@/components/account/session-user";
import { Lazy, lazyComponent } from "@/components/ui/lazy";

const ownerBar = lazyComponent(() => import("./owner-bar").then((module) => module.ShareOwnerBar));

// Mounted only when the owner is reading, so visitors never fetch the bar or ask for links.
export function ShareOwnerBarSlot({ ownerId, slug }: { ownerId: string; slug: string }) {
  return (
    <SessionUserProvider userId={ownerId} me={null}>
      <Lazy loader={ownerBar} wanted props={{ slug }} />
    </SessionUserProvider>
  );
}
