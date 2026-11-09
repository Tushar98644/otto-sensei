"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Writing } from "@/lib/writings/schema";

// The account's saved letters and answers for the Cover letters page: one load per visit, then
// changes made here are applied to the list as they happen.

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

export function useWritings(): WritingsState {
  const [status, setStatus] = useState<WritingsState["status"]>("loading");
  const [items, setItems] = useState<Writing[]>([]);
  const [total, setTotal] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api.writings().then(
      (res) => {
        if (!live) return;
        setItems(res.writings);
        setTotal(res.total);
        setStatus("ready");
      },
      () => {
        if (live) setStatus("error");
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((count) => count + 1);
  }, []);

  const add = useCallback((writing: Writing) => {
    setItems((list) => [writing, ...list.filter((item) => item.id !== writing.id)]);
    setTotal((count) => count + 1);
  }, []);

  const replace = useCallback((writing: Writing) => {
    setItems((list) => list.map((item) => (item.id === writing.id ? writing : item)));
  }, []);

  const hide = useCallback((id: string) => {
    setItems((list) => list.filter((item) => item.id !== id));
    setTotal((count) => Math.max(0, count - 1));
  }, []);

  const restore = useCallback((writing: Writing) => {
    setItems((list) =>
      [...list.filter((item) => item.id !== writing.id), writing].sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
    );
    setTotal((count) => count + 1);
  }, []);

  return { status, items, total, retry, add, replace, hide, restore };
}
