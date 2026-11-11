"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { analyticsEnabled, identifyUser, resetUser, startAnalytics } from "./client";

const noChanges = () => () => {};

const ACCOUNT_PAGES = /^\/(?:studio|dashboard|account|login)(?:\/|$)/;

export function Analytics() {
  const enabled = useSyncExternalStore(noChanges, analyticsEnabled, () => false);
  const pathname = usePathname();

  useEffect(() => {
    if (enabled) startAnalytics();
  }, [enabled]);

  return enabled && ACCOUNT_PAGES.test(pathname) ? <IdentitySync /> : null;
}

function IdentitySync() {
  const { me } = useMe();
  // A failed /api/me leaves `me` null: unknown, not signed out, so nobody is reset.
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
