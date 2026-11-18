"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import type { WritingStyle, WritingStyleBody } from "@/lib/writing-style/schema";

export type WritingStyleState =
  { status: "idle" | "loading" | "error"; style: null } | { status: "ready"; style: WritingStyle };

// One copy per tab, shared by the settings card and the hints in the writing dialogs.
let state: WritingStyleState = { status: "idle", style: null };
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function set(next: WritingStyleState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function load(userId: string) {
  loadedFor = userId;
  set({ status: "loading", style: null });
  try {
    const { style } = await api.writingStyle();
    if (loadedFor === userId) set({ status: "ready", style });
  } catch {
    if (loadedFor === userId) set({ status: "error", style: null });
  }
}

export function useWritingStyle() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

  useEffect(() => {
    if (!userId) {
      loadedFor = null;
      return;
    }
    if (loadedFor !== userId) void load(userId);
  }, [userId]);

  const save = useCallback(async (body: WritingStyleBody): Promise<WritingStyle> => {
    const { style } = await api.saveWritingStyle(body);
    set({ status: "ready", style });
    return style;
  }, []);

  const retry = useCallback(() => {
    if (userId) void load(userId);
  }, [userId]);

  return { ...(userId ? current : { status: "idle" as const, style: null }), save, retry };
}
