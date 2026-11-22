"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

export const LETTER_PARAM = "letter";
const CHANGED = "otto:letters-url";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

const read = () => new URL(window.location.href).searchParams.get(LETTER_PARAM);
const none = () => null;

function withParam(value: string | null): string {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(LETTER_PARAM);
  else url.searchParams.set(LETTER_PARAM, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

// The open letter lives in the address, so Back returns to the list and a link reopens it. Opening never writes anything.
export function useOpenLetter() {
  const key = useSyncExternalStore(subscribe, read, none);
  const pushed = useRef(false);

  // A letter written from the reader replaces the one on screen, so Back still leads to the list.
  const open = useCallback((next: string, { replace = false }: { replace?: boolean } = {}) => {
    if (read() === next) return;
    if (replace && read() !== null) {
      window.history.replaceState(null, "", withParam(next));
    } else {
      window.history.pushState(null, "", withParam(next));
      pushed.current = true;
    }
    window.dispatchEvent(new Event(CHANGED));
    window.scrollTo({ top: 0 });
  }, []);

  const close = useCallback(() => {
    if (read() === null) return;
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", withParam(null));
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  // A link to a letter that's gone drops the parameter quietly.
  const forget = useCallback(() => {
    if (read() === null) return;
    window.history.replaceState(null, "", withParam(null));
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return { key, open, close, forget };
}
