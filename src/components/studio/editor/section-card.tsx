"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { DIMMED_CLASSES, HiddenChip } from "./hidden-chip";
import { removeWithUndo } from "./remove-with-undo";
import { SectionMenu, type SectionOptions } from "./section-menu";
import { SectionTitleForm } from "./section-title-form";
import { useTouchLayout } from "./touch";

export type { SectionOptions } from "./section-menu";

export type SectionCardProps = {
  title: string;
  count?: string | null;
  status?: ReactNode;
  actions?: ReactNode;
  options?: SectionOptions;
  toggleId?: string;
  sectionId?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

type Mode = "view" | "rename";

export function SectionCard({
  title,
  count,
  status,
  actions,
  options,
  toggleId,
  sectionId,
  defaultOpen = true,
  children,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<Mode>("view");
  const id = useId();
  const titleId = `${id}-title`;
  const panelId = `${id}-panel`;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hidden = options?.hidden === true;
  // Touch screens get one ⋯ menu that also moves the section, instead of a row of keys.
  const touch = useTouchLayout() !== "fine" && options?.move !== undefined;
  const shownActions = touch ? null : actions;

  function backToView(focus: "toggle" | "menu" | null) {
    flushSync(() => setMode("view"));
    if (focus === "toggle") toggleRef.current?.focus();
    if (focus === "menu") menuRef.current?.querySelector("button")?.focus();
  }

  function startRename() {
    flushSync(() => setMode("rename"));
  }

  function moveBy(delta: -1 | 1) {
    // A moved section drops focus: render now, then hand it back to the menu's trigger.
    flushSync(() => options?.move?.onMove(delta));
    menuRef.current?.querySelector("button")?.focus();
  }

  function askToRemove() {
    const remove = options?.remove;
    if (!remove) return;
    if (remove.confirm) removeWithUndo(remove.resumeId, `the ${title} section`, remove.run);
    else remove.run();
  }

  return (
    <section
      id={sectionId}
      aria-labelledby={titleId}
      className="group/section scroll-mt-36 rounded-2xl bg-surface lg:scroll-mt-24 xl:scroll-mt-36"
    >
      <div className="flex items-center gap-1 px-2 py-2 sm:px-4 sm:py-3">
        {mode === "rename" && options?.rename ? (
          <div className="min-w-0 flex-1">
            <span id={titleId} className="sr-only">
              {title}
            </span>
            <SectionTitleForm
              initial={options.rename.value}
              placeholder={options.rename.placeholder}
              maxLength={options.rename.maxLength}
              onSave={(next, focus) => {
                options.rename?.onSave(next);
                backToView(focus ? "toggle" : null);
              }}
              onCancel={() => backToView("toggle")}
            />
          </div>
        ) : (
          <h3 className="min-w-0 flex-1">
            <button
              ref={toggleRef}
              id={toggleId}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((value) => !value)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
            >
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted transition-transform",
                  !open && "-rotate-90",
                )}
              />
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  id={titleId}
                  className={cn(
                    "text-lg/7 font-semibold wrap-break-word",
                    hidden ? "text-muted" : "text-ink",
                  )}
                >
                  {title}
                </span>
                {count ? <span className="text-sm text-subtle">{count}</span> : null}
                {hidden ? <HiddenChip /> : null}
                {status}
              </span>
            </button>
          </h3>
        )}
        {shownActions || options ? (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/section:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
            {shownActions}
            {options ? (
              <div ref={menuRef} className="flex">
                <SectionMenu
                  title={title}
                  options={options}
                  onRename={startRename}
                  onRemove={askToRemove}
                  onMove={touch ? moveBy : undefined}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {open ? (
        <div
          id={panelId}
          className={cn("px-3 pt-1 pb-3 sm:px-6 sm:pb-6", hidden && DIMMED_CLASSES)}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
