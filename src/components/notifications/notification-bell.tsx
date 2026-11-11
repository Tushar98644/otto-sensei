"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ToggleEvent } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isInAppPath, type Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { timeAgo } from "./time-ago";
import { forgetFresh, markAllSeen, useNotifications } from "./use-notifications";

export type NotificationBellProps = {
  align?: "start" | "end";
  size?: "sm" | "md";
  className?: string;
};

const GUTTER_PX = 16;
const OFFSET_PX = 8;
const MIN_HEIGHT_PX = 160;

export function NotificationBell({ align = "start", size = "sm", className }: NotificationBellProps) {
  const notifications = useNotifications();
  const panelId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);

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
          <div aria-busy="true" className="flex flex-col gap-3 px-2.5 pt-1 pb-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
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
        ) : (
          <ul className="flex flex-col">
            {notifications.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                isNew={item.readAt === null || notifications.fresh.has(item.id)}
                now={openedAt}
                onNavigate={close}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

const ROW = "flex gap-2.5 rounded-lg px-2.5 py-2.5 text-left -outline-offset-2";

function NotificationRow({
  item,
  isNew,
  now,
  onNavigate,
}: {
  item: Notification;
  isNew: boolean;
  now: number;
  onNavigate: () => void;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", isNew ? "bg-primary" : "bg-transparent")}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm/5 font-medium text-pretty text-ink">
          {isNew ? <span className="sr-only">New: </span> : null}
          {item.title}
        </span>
        {item.body ? (
          <span className="mt-0.5 block text-sm/5 text-pretty text-muted">{item.body}</span>
        ) : null}
        <time
          dateTime={new Date(item.createdAt).toISOString()}
          className="mt-1 block text-xs/4 text-subtle"
        >
          {now > 0 ? timeAgo(item.createdAt, now) : null}
        </time>
      </span>
    </>
  );
  const link = item.link !== null && isInAppPath(item.link) ? item.link : null;
  return (
    <li>
      {link ? (
        <Link href={link} onClick={onNavigate} className={cn(ROW, "transition-colors hover:bg-ink/5")}>
          {content}
        </Link>
      ) : (
        <div className={ROW}>{content}</div>
      )}
    </li>
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
