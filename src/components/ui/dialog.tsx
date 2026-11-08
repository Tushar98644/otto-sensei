"use client";

import { X } from "lucide-react";
import { useId, useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { registerModalHost } from "./modal-stack";

export type DialogSize = "sm" | "md" | "lg";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  // Buttons: side by side on the right on wide screens, stacked full width on phones.
  // Put the main action last so it ends up rightmost on desktop and on top on phones.
  footer?: ReactNode;
  // Shown under the title: an OttoNote, never a full-body Otto.
  illustration?: ReactNode;
  size?: DialogSize;
  // Styles the visible panel.
  className?: string;
};

// Roomier than the content needs on purpose: the panel's generous padding eats into the width.
const SIZES: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

// A native modal <dialog>: the browser traps focus and makes the page behind it inert. Opening
// focuses the element marked data-autofocus, else the first focusable one; closing returns focus
// to whatever opened it. Page scroll is locked by a rule in globals.css.
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  illustration,
  size = "md",
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (dialog.open) return;
      const opener = document.activeElement;
      openerRef.current = opener instanceof HTMLElement ? opener : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      return;
    }
    if (dialog.open) dialog.close();
    const opener = openerRef.current;
    openerRef.current = null;
    // Browsers that don't restore focus themselves leave it on <body>.
    const active = document.activeElement;
    if (opener?.isConnected && (!active || active === document.body)) opener.focus();
  }, [open]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!open || !host) return;
    return registerModalHost(host);
  }, [open]);

  // Unmounting while open (a route change, say) still closes it, which hands focus back.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  // Escape. The parent's state stays in charge, so stop the browser closing it on its own.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onOpenChange(false);
  }

  // The browser can still close it by itself (e.g. Escape pressed twice). The event arrives a task
  // later, so skip it if the dialog has been shown again in the meantime.
  function handleClose(event: SyntheticEvent<HTMLDialogElement>) {
    if (open && !event.currentTarget.open) onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleClose}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a press that starts and ends on the backdrop closes it, so dragging a text
        // selection out of the panel doesn't.
        const onBackdrop = pressStartedOnBackdrop.current && event.target === event.currentTarget;
        pressStartedOnBackdrop.current = false;
        if (onBackdrop) onOpenChange(false);
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] bg-transparent p-0 text-ink",
        SIZES[size],
      )}
    >
      {open ? (
        <div
          className={cn(
            "relative flex max-h-[calc(100dvh-2rem)] animate-pop flex-col gap-4 overflow-hidden rounded-3xl bg-surface p-6 shadow-float sm:p-8",
            className,
          )}
        >
          <div className="flex flex-col gap-1.5 pr-10">
            {/* font-sans: a dialog title is UI text, not a display line. */}
            <h2 id={titleId} className="font-sans text-lg/7 font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-sm/6 text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {illustration ? <div>{illustration}</div> : null}
          {children ? (
            // Inner padding keeps focus rings at the edges from being clipped by the scroll box.
            <div className="-mx-6 -my-1 min-h-0 flex-1 overflow-y-auto px-6 py-1 sm:-mx-8 sm:px-8">
              {children}
            </div>
          ) : null}
          {footer ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          ) : null}
          {/* Last in the DOM so opening focuses the first field, not the close button. */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 text-muted hover:text-ink sm:top-4 sm:right-4"
          >
            <X className="size-5" />
          </Button>
        </div>
      ) : null}
      <div ref={hostRef} />
    </dialog>
  );
}
