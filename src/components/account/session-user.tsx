"use client";

import { createContext, use, useLayoutEffect, type ReactNode } from "react";
import { seedMe, useMe, type Me } from "./use-me";

const ServerUserId = createContext<string | null>(null);

// Hands the account the dashboard layout verified to the hooks below, so their requests start at once.
export function SessionUserProvider({
  userId,
  me,
  children,
}: {
  userId: string;
  me: Me | null;
  children: ReactNode;
}) {
  // Layout effects run before any useMe effect could ask /api/me, and never on the server.
  useLayoutEffect(() => {
    if (me) seedMe(me);
  }, [me]);
  return <ServerUserId value={userId}>{children}</ServerUserId>;
}

// The store's account once it has one (null after signing out), until then the server's.
export function useSessionUserId(): string | null {
  const serverUserId = use(ServerUserId);
  const { me } = useMe();
  return me ? (me.user?.id ?? null) : serverUserId;
}
