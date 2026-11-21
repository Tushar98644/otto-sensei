"use client";

import { Check, type LucideIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type ToggleEvent,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";
import { ProMark } from "./pro-mark";

export type MenuAction = {
  label: string;
  icon?: LucideIcon;
  description?: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  checked?: boolean;
  disabled?: boolean;
  pro?: boolean;
  shortcut?: string;
};

export type MenuEntry = MenuAction | "separator";

export type MenuProps = {
  label: string;
  trigger: ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerId?: string;
  items: readonly MenuEntry[];
  align?: "start" | "end";
  className?: string;
};

const GUTTER_PX = 12;
const OFFSET_PX = 6;
const MIN_BELOW_PX = 260;

const noChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

const ITEM =
  "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors -outline-offset-2 hover:bg-ink/5 disabled:pointer-events-none disabled:text-subtle pointer-coarse:min-h-11";

export function Menu({
  label,
  trigger,
  triggerLabel,
  triggerClassName,
  triggerId,
  items,
  align = "start",
  className,
}: MenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startAt = useRef<"first" | "last">("first");
  const [open, setOpen] = useState(false);
  // Server HTML has no items or listeners yet, so the trigger opens nothing before hydration.
  const hydrated = useSyncExternalStore(noChanges, onClient, onServer);

  useEffect(() => {
    if (!open) return;
    const follow = () => place(triggerRef.current, panelRef.current, align);
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, { capture: true });
    };
  }, [open, align]);

  function itemsInPanel(): HTMLButtonElement[] {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-menu-item]:not(:disabled)"));
  }

  function handleBeforeToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open") return;
    place(triggerRef.current, event.currentTarget, align);
    // A closed menu has no items: commit them before the panel shows and handleToggle focuses one.
    flushSync(() => setOpen(true));
  }

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    const opened = event.newState === "open";
    // Closing waits for this event: focus has already moved out of the panel, so the items can go.
    setOpen(opened);
    if (!opened) return;
    const list = itemsInPanel();
    (startAt.current === "last" ? list.at(-1) : list[0])?.focus();
    startAt.current = "first";
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    startAt.current = event.key === "ArrowUp" ? "last" : "first";
    panelRef.current?.showPopover();
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      panelRef.current?.hidePopover();
      return;
    }
    const list = itemsInPanel();
    if (list.length === 0) return;
    const index = list.findIndex((item) => item === document.activeElement);
    const last = list.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown") next = index >= last ? 0 : index + 1;
    else if (event.key === "ArrowUp") next = index <= 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    list[next]?.focus();
  }

  function select(action: MenuAction) {
    // Close first so focus is back on the trigger before the action opens a dialog.
    panelRef.current?.hidePopover();
    action.onSelect();
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        popoverTarget={hydrated ? menuId : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={triggerLabel}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {/* No display utility on this element: it would override the browser's hidden state. */}
      <div
        ref={panelRef}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label={label}
        onBeforeToggle={handleBeforeToggle}
        onToggle={handleToggle}
        onKeyDown={handlePanelKeyDown}
        className={cn(
          "inset-auto m-0 min-w-56 animate-pop overflow-y-auto overscroll-contain rounded-xl bg-surface p-1.5 text-ink shadow-float ring-1 ring-ink/6",
          className,
        )}
      >
        {open
          ? items.map((entry, index) =>
              entry === "separator" ? (
                <div
                  key={`separator-${index}`}
                  role="separator"
                  className="-mx-1.5 my-1.5 h-px bg-border"
                />
              ) : (
                <MenuItemButton key={entry.label} action={entry} onSelect={() => select(entry)} />
              ),
            )
          : null}
      </div>
    </>
  );
}

function MenuItemButton({ action, onSelect }: { action: MenuAction; onSelect: () => void }) {
  const radio = action.checked !== undefined;
  const danger = action.tone === "danger";
  const Icon = action.icon;
  return (
    <button
      type="button"
      role={radio ? "menuitemradio" : "menuitem"}
      aria-checked={radio ? action.checked : undefined}
      tabIndex={-1}
      data-menu-item=""
      disabled={action.disabled}
      onClick={onSelect}
      className={cn(
        ITEM,
        action.description && "items-start",
        danger && "text-fail-ink hover:bg-fail-soft",
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            action.description && "mt-0.5",
            danger ? "text-fail" : "text-muted",
          )}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{action.label}</span>
        {action.description ? (
          <span className={cn("block text-xs/5", danger ? "text-fail-ink" : "text-muted")}>
            {action.description}
          </span>
        ) : null}
      </span>
      {action.pro ? <ProMark className={cn(action.description && "mt-0.5")} /> : null}
      {action.shortcut ? (
        <Kbd aria-hidden className="pointer-coarse:hidden">
          {action.shortcut}
        </Kbd>
      ) : null}
      {radio ? (
        <Check
          aria-hidden
          className={cn("size-4 shrink-0 text-ink", action.checked ? "visible" : "invisible")}
        />
      ) : null}
    </button>
  );
}

function place(trigger: HTMLElement | null, panel: HTMLElement | null, align: "start" | "end") {
  if (!trigger || !panel) return;
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const below = viewportHeight - rect.bottom - OFFSET_PX - GUTTER_PX;
  const above = rect.top - OFFSET_PX - GUTTER_PX;
  if (below < MIN_BELOW_PX && above > below) {
    panel.style.top = "auto";
    panel.style.bottom = `${viewportHeight - rect.top + OFFSET_PX}px`;
    panel.style.maxHeight = `${above}px`;
  } else {
    panel.style.bottom = "auto";
    panel.style.top = `${rect.bottom + OFFSET_PX}px`;
    panel.style.maxHeight = `${below}px`;
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
