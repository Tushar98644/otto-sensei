"use client";

import { createContext, use, useLayoutEffect, type ReactNode } from "react";
import type { PlanId } from "@/config/plans";
import { seedMe, useMe, type Me } from "./use-me";

const ServerUserId = createContext<string | null>(null);
const ServerPlan = createContext<PlanId | null>(null);

// Hands the account the dashboard layout verified to the hooks below, so their requests start at once.
export function SessionUserProvider({
  userId,
  plan = null,
  me,
  children,
}: {
  userId: string;
  plan?: PlanId | null;
  me: Me | null;
  children: ReactNode;
}) {
  // Layout effects run before any useMe effect could ask /api/me, and never on the server.
  useLayoutEffect(() => {
    if (me) seedMe(me);
  }, [me]);
  return (
    <ServerUserId value={userId}>
      <ServerPlan value={plan}>{children}</ServerPlan>
    </ServerUserId>
  );
}

// The store's plan once it has an account, until then the one the layout read (known from the first paint).
export function useSessionPlan(): PlanId | null {
  const serverPlan = use(ServerPlan);
  const { me } = useMe();
  return me ? (me.user?.plan ?? null) : serverPlan;
}

// The store's account once it has one (null after signing out), until then the server's.
export function useSessionUserId(): string | null {
  const serverUserId = use(ServerUserId);
  const { me } = useMe();
  return me ? (me.user?.id ?? null) : serverUserId;
}
