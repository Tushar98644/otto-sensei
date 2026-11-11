"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { WRITINGS } from "@/lib/queries/keys";
import { writingsQuery } from "@/lib/queries/options";
import type { Writing } from "@/lib/writings/schema";

// Changes go into the shared cache as they happen, so the board's letter marks see them too.

export type WritingsState = {
  status: "loading" | "ready" | "error";
  items: Writing[];
  // How many the account keeps in all; the list holds the newest WRITING_LIMITS.listed.
  total: number;
  retry: () => void;
  add: (writing: Writing) => void;
  replace: (writing: Writing) => void;
  hide: (id: string) => void;
  restore: (writing: Writing) => void;
};

type Writings = { items: Writing[]; total: number };

const NONE: Writing[] = [];
// Deletes still inside their undo window: the server keeps them until then, so a fresh load must
// not bring them back.
const hidden = new Set<string>();

function update(change: (data: Writings) => Writings) {
  getQueryClient().setQueriesData<Writings>({ queryKey: WRITINGS }, (data) =>
    data ? change(data) : data,
  );
}

/** After a letter or answer is written somewhere else (the studio): lists read it again. */
export function forgetWritings(): void {
  void getQueryClient().invalidateQueries({ queryKey: WRITINGS });
}

export function useWritings(): WritingsState {
  const { user } = useMe();
  const userId = user?.id ?? "";
  const client = useAppQueryClient();
  const query = useQuery({ ...writingsQuery(userId), enabled: userId !== "" }, client);
  const { refetch } = query;

  const retry = useCallback(() => void refetch(), [refetch]);

  const add = useCallback((writing: Writing) => {
    update(({ items, total }) => ({
      items: [writing, ...items.filter((item) => item.id !== writing.id)],
      total: total + 1,
    }));
  }, []);

  const replace = useCallback((writing: Writing) => {
    update((data) => ({
      ...data,
      items: data.items.map((item) => (item.id === writing.id ? writing : item)),
    }));
  }, []);

  const hide = useCallback((id: string) => {
    hidden.add(id);
    update(({ items, total }) => ({
      items: items.filter((item) => item.id !== id),
      total: Math.max(0, total - 1),
    }));
  }, []);

  const restore = useCallback((writing: Writing) => {
    hidden.delete(writing.id);
    update(({ items, total }) => ({
      items: [...items.filter((item) => item.id !== writing.id), writing].sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
      total: total + 1,
    }));
  }, []);

  const items = useMemo(() => {
    const list = query.data?.items ?? NONE;
    return hidden.size > 0 ? list.filter((item) => !hidden.has(item.id)) : list;
  }, [query.data]);

  const status: WritingsState["status"] = query.data
    ? "ready"
    : query.isError
      ? "error"
      : "loading";
  return { status, items, total: query.data?.total ?? 0, retry, add, replace, hide, restore };
}
