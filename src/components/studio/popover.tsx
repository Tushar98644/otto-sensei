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

type PopoverContextValue = { close: () => void };

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopover(): PopoverContextValue {
  const context = use(PopoverContext);
  if (!context) throw new Error("usePopover() must be used inside <Popover>");
  return context;
}

export type PopoverProps = {
  label: string;
  trigger: ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  align?: Align;
  className?: string;
  children: ReactNode;
};

type Align = "start" | "end" | "auto";

const GUTTER_PX = 16;
// Must match w-80: the panel isn't laid out yet when it's placed on opening.
const PANEL_WIDTH_PX = 320;
const OFFSET_PX = 8;
const MIN_HEIGHT_PX = 160;
const FLIP_BELOW_PX = 280;

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
  // Unmounted on toggle, not beforetoggle, so the browser can still hand focus back to the trigger.
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState(0);

  const close = useCallback(() => panelRef.current?.hidePopover(), []);
  const context = useMemo(() => ({ close }), [close]);

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
      setMounted(true);
    }
    setOpen(opening);
  }

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState === "closed") setMounted(false);
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
        onToggle={handleToggle}
        className={cn(
          "inset-auto m-0 w-80 animate-pop overflow-y-auto overscroll-contain rounded-xl bg-surface p-1.5 text-ink shadow-float ring-1 ring-ink/6",
          className,
        )}
      >
        <PopoverContext value={context}>
          {mounted ? <Fragment key={session}>{children}</Fragment> : null}
        </PopoverContext>
      </div>
    </>
  );
}

function place(trigger: HTMLElement | null, panel: HTMLElement | null, wanted: Align) {
  if (!trigger || !panel) return;
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const fitsStart = rect.left + PANEL_WIDTH_PX + GUTTER_PX <= viewportWidth;
  const fitsEnd = rect.right - PANEL_WIDTH_PX >= GUTTER_PX;
  const rightHalf = rect.left + rect.width / 2 > viewportWidth / 2;
  const auto = (rightHalf && fitsEnd) || !fitsStart ? "end" : "start";
  const align = wanted === "auto" ? auto : wanted;
  const top = rect.bottom + OFFSET_PX;
  const below = window.innerHeight - top - GUTTER_PX;
  const above = rect.top - OFFSET_PX - GUTTER_PX;
  if (below < FLIP_BELOW_PX && above > below) {
    panel.style.top = "auto";
    panel.style.bottom = `${window.innerHeight - rect.top + OFFSET_PX}px`;
    panel.style.maxHeight = `${above}px`;
  } else {
    panel.style.top = `${top}px`;
    panel.style.bottom = "auto";
    panel.style.maxHeight = `${Math.max(MIN_HEIGHT_PX, below)}px`;
  }
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
