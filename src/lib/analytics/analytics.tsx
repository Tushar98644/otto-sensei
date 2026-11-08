"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { analyticsEnabled, identifyUser, resetUser, startAnalytics } from "./client";

// Mounted once in the root layout. Renders nothing; starts PostHog when it's allowed and keeps its
// distinct id in step with the account: the user id when signed in, the device's anonymous id when not.

const noChanges = () => () => {};

// Pages that load the account anyway. Elsewhere (the landing page, policies, share links) the SDK
// keeps the id it already has, so a visit there never costs an /api/me request.
const ACCOUNT_PAGES = /^\/(?:studio|dashboard|account|login)(?:\/|$)/;

export function Analytics() {
  // false on the server and during hydration, so both render the same nothing.
  const enabled = useSyncExternalStore(noChanges, analyticsEnabled, () => false);
  const pathname = usePathname();

  useEffect(() => {
    if (enabled) startAnalytics();
  }, [enabled]);

  return enabled && ACCOUNT_PAGES.test(pathname) ? <IdentitySync /> : null;
}

function IdentitySync() {
  const { me } = useMe();
  // A failed /api/me leaves `me` null: that's "unknown", not "signed out", so nobody is reset.
  const known = me !== null;
  const id = me?.user?.id ?? null;
  const plan = me?.user?.plan ?? null;

  useEffect(() => {
    if (!known) return;
    if (id && plan) identifyUser(id, plan);
    else resetUser();
  }, [known, id, plan]);

  return null;
}
