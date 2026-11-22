"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ToggleEvent } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { lazyModule, useLazy } from "@/components/ui/lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { forgetFresh, markAllSeen, useNotifications } from "./use-notifications";

export type NotificationBellProps = {
  align?: "start" | "end";
  size?: "sm" | "md";
  className?: string;
};

// The list sits in a closed popover, so its rows load when idle or when it opens.
const notificationList = lazyModule(() => import("./notification-list"));

const GUTTER_PX = 16;
const OFFSET_PX = 8;
const MIN_HEIGHT_PX = 160;

export function NotificationBell({
  align = "start",
  size = "sm",
  className,
}: NotificationBellProps) {
  const notifications = useNotifications();
  const panelId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const list = useLazy(notificationList, open);

  const ready = notifications.status === "ready" ? notifications : null;
  const userId = ready?.userId ?? null;
  const unread = ready?.unread ?? 0;

  useEffect(() => {
    if (open && userId && unread > 0) markAllSeen(userId);
  }, [open, userId, unread]);

  useEffect(() => {
    if (!open) return;
    const follow = () => place(triggerRef.current, panelRef.current, align);
    window.addEventListener("resize", follow);
    return () => window.removeEventListener("resize", follow);
  }, [open, align]);

  if (notifications.status === "signed_out") return null;

  function handleBeforeToggle(event: ToggleEvent<HTMLDivElement>) {
    const opening = event.newState === "open";
    if (opening) {
      place(triggerRef.current, event.currentTarget, align);
      setOpenedAt(Date.now());
    } else {
      forgetFresh();
    }
    setOpen(opening);
  }

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState === "open") event.currentTarget.focus();
  }

  const close = () => panelRef.current?.hidePopover();
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={panelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        className={buttonClasses({
          variant: "ghost",
          size: size === "sm" ? "icon-sm" : "icon",
          className: cn("text-muted hover:text-ink aria-expanded:text-ink", className),
        })}
      >
        <span className="relative flex">
          <Bell aria-hidden className={size === "sm" ? "size-4" : "size-5"} />
          {unread > 0 ? (
            <span
              aria-hidden
              className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem]/4 font-semibold text-white tabular-nums ring-2 ring-surface-muted"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
      </button>
      {/* No display utility on this element: it would override the browser's hidden state. */}
      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onBeforeToggle={handleBeforeToggle}
        onToggle={handleToggle}
        className="inset-auto m-0 w-80 animate-pop overflow-y-auto overscroll-contain rounded-xl bg-surface p-1.5 text-ink shadow-float ring-1 ring-ink/6 focus-visible:outline-none"
      >
        <h2 id={titleId} className="px-2.5 pt-1.5 pb-2 font-sans text-sm/5 font-semibold text-ink">
          Notifications
        </h2>
        {notifications.status === "loading" ? (
          <PanelSkeleton />
        ) : notifications.status === "error" ? (
          <div className="flex flex-col items-start gap-2 px-2.5 pb-2.5">
            <p className="text-sm/6 text-muted">Couldn&apos;t load your notifications.</p>
            <Button size="sm" variant="secondary" onClick={notifications.retry}>
              Try again
            </Button>
          </div>
        ) : notifications.items.length === 0 ? (
          <OttoNote
            size="sm"
            live={false}
            className="px-2.5 pb-2.5"
            message="Nothing yet. Mark a job applied and I'll remind you here to follow up."
          >
            <Link
              href={ROUTES.dashboardApplications}
              onClick={close}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Open applications
            </Link>
          </OttoNote>
        ) : list ? (
          <list.NotificationList
            items={notifications.items}
            fresh={notifications.fresh}
            now={openedAt}
            onNavigate={close}
          />
        ) : (
          <PanelSkeleton />
        )}
      </div>
    </>
  );
}

function PanelSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-2.5 pt-1 pb-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
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
