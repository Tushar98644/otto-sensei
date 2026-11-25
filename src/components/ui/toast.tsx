"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { OttoMark } from "@/components/site/otto-mark";
import { buttonClasses } from "./button";
import { getTopModalHost, subscribeModalHosts } from "./modal-stack";

export type ToastVariant = "default" | "success" | "error";

export type ToastCloseReason = "action" | "closed";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: { label: string; onAction: () => void };
  onClose?: (reason: ToastCloseReason) => void;
};

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
  actionLabel?: string;
};

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 4000;
const NO_TOASTS: ToastItem[] = [];

let toasts: ToastItem[] = NO_TOASTS;
let nextId = 0;
const listeners = new Set<() => void>();
const handlers = new Map<string, Pick<ToastOptions, "action" | "onClose">>();

function setToasts(next: ToastItem[]) {
  const kept = new Set(next.map((t) => t.id));
  const gone = toasts.filter((t) => !kept.has(t.id));
  toasts = next;
  for (const listener of listeners) listener();
  for (const item of gone) settle(item.id, "closed");
}

function settle(id: string, reason: ToastCloseReason) {
  const handler = handlers.get(id);
  if (!handler) return;
  handlers.delete(id);
  handler.onClose?.(reason);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => toasts;
const getServerSnapshot = () => NO_TOASTS;

export function toast({
  title,
  description,
  variant = "default",
  durationMs = DEFAULT_DURATION_MS,
  action,
  onClose,
}: ToastOptions): string {
  // Browser only: on the server this queue would be shared by every request.
  if (typeof window === "undefined") return "";
  const id = `toast-${++nextId}`;
  const item: ToastItem = {
    id,
    title,
    description,
    variant,
    durationMs: Math.min(Math.max(durationMs, 1000), 30_000),
    ...(action ? { actionLabel: action.label } : {}),
  };
  if (action || onClose) handlers.set(id, { action, onClose });
  const others = toasts.filter(
    (t) =>
      t.actionLabel !== undefined ||
      t.title !== title ||
      t.description !== description ||
      t.variant !== variant,
  );
  setToasts([...others, item].slice(-MAX_VISIBLE));
  return id;
}

export function dismissToast(id: string): void {
  if (toasts.some((t) => t.id === id)) setToasts(toasts.filter((t) => t.id !== id));
}

function runAction(id: string) {
  const handler = handlers.get(id);
  // Settled first, so closing the toast below reports "action" and never "closed".
  handlers.delete(id);
  dismissToast(id);
  handler?.action?.onAction();
  handler?.onClose?.("action");
}

// The root layout's words, in the page's language: no messages provider reaches this high.
export type ToasterWords = { region: string; dismiss: string };

const ENGLISH_WORDS: ToasterWords = { region: "Notifications", dismiss: "Dismiss" };

export function Toaster({ words = ENGLISH_WORDS }: { words?: ToasterWords }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const modalHost = useSyncExternalStore(subscribeModalHosts, getTopModalHost, () => null);

  // The live region is always in the page, so screen readers notice toasts added to it.
  const region = (
    <section
      aria-label={words.region}
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end sm:p-6"
    >
      <ol className="flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} dismiss={words.dismiss} />
        ))}
      </ol>
    </section>
  );

  return modalHost ? createPortal(region, modalHost) : region;
}

function ToastCard({ item, dismiss }: { item: ToastItem; dismiss: string }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remainingMs = useRef(item.durationMs);
  const paused = hovered || focused;

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => dismissToast(item.id), remainingMs.current);
    return () => {
      window.clearTimeout(timer);
      remainingMs.current = Math.max(0, remainingMs.current - (Date.now() - startedAt));
    };
  }, [item.id, paused]);

  return (
    <li
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      className="pointer-events-auto flex animate-pop items-start gap-3 rounded-2xl bg-surface p-4 text-sm shadow-float"
    >
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border"
      >
        <OttoMark className="size-5" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="flex items-start gap-1.5 font-medium text-ink">
          {item.variant === "success" ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-pass" />
          ) : null}
          {item.variant === "error" ? (
            <CircleX className="mt-0.5 size-4 shrink-0 text-fail" />
          ) : null}
          {item.title}
        </p>
        {item.description ? <p className="mt-1 text-muted">{item.description}</p> : null}
      </div>
      {item.actionLabel ? (
        <button
          type="button"
          onClick={() => runAction(item.id)}
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: "-my-1 shrink-0",
          })}
        >
          {item.actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={dismiss}
        onClick={() => dismissToast(item.id)}
        className={buttonClasses({
          variant: "ghost",
          size: "icon",
          className: "-mt-1.5 -mr-1.5 size-8 text-subtle hover:text-ink",
        })}
      >
        <X />
      </button>
    </li>
  );
}
