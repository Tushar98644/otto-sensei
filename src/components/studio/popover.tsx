"use client";

import {
  createContext,
  Fragment,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ToggleEvent,
} from "react";
import { cn } from "@/lib/utils";

// A native popover: the browser handles outside clicks, Escape and handing focus back to the
// trigger, and the panel sits in the top layer above the sticky header. It's placed under its
// trigger each time it opens. Content inside calls usePopover().close() after an action.

type PopoverContextValue = { close: () => void };

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopover(): PopoverContextValue {
  const context = use(PopoverContext);
  if (!context) throw new Error("usePopover() must be used inside <Popover>");
  return context;
}

export type PopoverProps = {
  // Names the panel for screen readers, e.g. "Your resumes".
  label: string;
  trigger: ReactNode;
  // Accessible name of the trigger when its visible content isn't enough.
  triggerLabel?: string;
  triggerClassName?: string;
  // "end" lines the panel up with the trigger's right edge, for menus at the right of the page.
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
};

const GUTTER_PX = 16;
const OFFSET_PX = 8;
const MIN_HEIGHT_PX = 160;

export function Popover({
  label,
  trigger,
  triggerLabel,
  triggerClassName,
  align = "start",
  className,
  children,
}: PopoverProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Bumped on every open so the content remounts without a half-finished rename or confirm.
  const [session, setSession] = useState(0);

  const close = useCallback(() => panelRef.current?.hidePopover(), []);
  const context = useMemo(() => ({ close }), [close]);

  // The phone keyboard and window resizes move the trigger; follow it rather than close.
  useEffect(() => {
    if (!open) return;
    const follow = () => place(triggerRef.current, panelRef.current, align);
    window.addEventListener("resize", follow);
    return () => window.removeEventListener("resize", follow);
  }, [open, align]);

  function handleBeforeToggle(event: ToggleEvent<HTMLDivElement>) {
    const opening = event.newState === "open";
    if (opening) {
      place(triggerRef.current, event.currentTarget, align);
      setSession((count) => count + 1);
    }
    setOpen(opening);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={panelId}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerLabel}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {/* No display utility on this element: it would override the browser's hidden state. */}
      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="group"
        aria-label={label}
        onBeforeToggle={handleBeforeToggle}
        className={cn(
          "inset-auto m-0 w-80 animate-pop overflow-y-auto overscroll-contain rounded-xl bg-surface p-1.5 text-ink shadow-float ring-1 ring-ink/6",
          className,
        )}
      >
        <PopoverContext value={context}>
          <Fragment key={session}>{children}</Fragment>
        </PopoverContext>
      </div>
    </>
  );
}

function place(trigger: HTMLElement | null, panel: HTMLElement | null, align: "start" | "end") {
  if (!trigger || !panel) return;
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const top = rect.bottom + OFFSET_PX;
  panel.style.top = `${top}px`;
  panel.style.maxHeight = `${Math.max(MIN_HEIGHT_PX, window.innerHeight - top - GUTTER_PX)}px`;
  if (align === "end") {
    const right = Math.max(GUTTER_PX, viewportWidth - rect.right);
    panel.style.right = `${right}px`;
    panel.style.left = "auto";
    panel.style.maxWidth = `${viewportWidth - right - GUTTER_PX}px`;
  } else {
    const left = Math.max(GUTTER_PX, rect.left);
    panel.style.left = `${left}px`;
    panel.style.right = "auto";
    panel.style.maxWidth = `${viewportWidth - left - GUTTER_PX}px`;
  }
}
