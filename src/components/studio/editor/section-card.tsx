"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { DIMMED_CLASSES, HiddenChip } from "./hidden-chip";
import { removeWithUndo } from "./remove-with-undo";
import { SectionMenu, type SectionOptions } from "./section-menu";
import { SectionTitleForm } from "./section-title-form";

export type { SectionOptions } from "./section-menu";

export type SectionCardProps = {
  title: string;
  // Short summary beside the title, e.g. "3 jobs". Part of the toggle's name for screen readers.
  count?: string | null;
  // Beside the count, e.g. a "2 need work" badge. Also part of the toggle's name.
  status?: ReactNode;
  // At the right end of the header, outside the toggle, e.g. move up and down.
  actions?: ReactNode;
  // Rename, "Hide in this version" and remove, behind one menu next to the actions.
  options?: SectionOptions;
  // Lets focus land on this section's toggle after a neighbouring section is removed.
  toggleId?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

type Mode = "view" | "rename";

// One white sheet per section on the stone canvas. Collapsed content unmounts rather than hiding,
// so a closed section costs nothing per keystroke. The header's actions fade in on hover or
// focus; they keep their space while hidden, so nothing shifts when they appear.
export function SectionCard({
  title,
  count,
  status,
  actions,
  options,
  toggleId,
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

  function backToView(focus: "toggle" | "menu" | null) {
    flushSync(() => setMode("view"));
    if (focus === "toggle") toggleRef.current?.focus();
    if (focus === "menu") menuRef.current?.querySelector("button")?.focus();
  }

  function startRename() {
    flushSync(() => setMode("rename"));
  }

  function askToRemove() {
    const remove = options?.remove;
    if (!remove) return;
    if (remove.confirm) removeWithUndo(remove.resumeId, `the ${title} section`, remove.run);
    else remove.run();
  }

  return (
    <section aria-labelledby={titleId} className="group/section rounded-2xl bg-surface">
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
                    "text-base font-semibold wrap-break-word",
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
        {actions || options ? (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/section:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
            {actions}
            {options ? (
              <div ref={menuRef} className="flex">
                <SectionMenu
                  title={title}
                  options={options}
                  onRename={startRename}
                  onRemove={askToRemove}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {open ? (
        <div
          id={panelId}
          className={cn("px-4 pt-2 pb-6 sm:px-8 sm:pb-8", hidden && DIMMED_CLASSES)}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
