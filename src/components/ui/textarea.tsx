"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type Ref,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

export type TextareaVariant = "box" | "line";

export type TextareaProps = ComponentProps<"textarea"> & {
  invalid?: boolean;
  // Grows with its content instead of scrolling. Add a max-h-* class to cap it.
  autoResize?: boolean;
  // "line" is a ruled row with no box, for resume lines in the editor.
  variant?: TextareaVariant;
};

// The inset shadow thickens the rule to 2px on focus without moving the text, which a thicker
// border would do.
const LINE_CLASSES =
  "rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-2.5 focus-visible:border-ink focus-visible:shadow-[inset_0_-1px_0_var(--color-ink)] focus-visible:ring-0 disabled:bg-transparent";

export function Textarea({
  className,
  invalid,
  autoResize = false,
  variant = "box",
  rows,
  ref,
  onInput,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const mergedRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  useAutoResize(innerRef, autoResize, props.value);

  return (
    <textarea
      {...props}
      ref={mergedRef}
      rows={rows ?? (autoResize ? 1 : 4)}
      aria-invalid={invalid || ariaInvalid || undefined}
      onInput={(event) => {
        onInput?.(event);
        if (autoResize && !supportsFieldSizing()) fitToContent(event.currentTarget);
      }}
      className={cn(
        controlClasses,
        "block px-3.5 py-2.5",
        autoResize ? "field-sizing-content min-h-11 resize-none" : "min-h-24 resize-y",
        variant === "line" && LINE_CLASSES,
        className,
      )}
    />
  );
}

// Browsers with `field-sizing: content` resize in CSS alone; the rest get measured here.
function useAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  enabled: boolean,
  value: ComponentProps<"textarea">["value"],
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (enabled && element && !supportsFieldSizing()) fitToContent(element);
  }, [ref, enabled, value]);

  // A narrower box wraps to more lines, so refit when the width changes.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || supportsFieldSizing() || typeof ResizeObserver === "undefined") {
      return;
    }
    let width = element.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === width) return;
      width = element.offsetWidth;
      fitToContent(element);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);
}

let fieldSizingSupported: boolean | undefined;

function supportsFieldSizing(): boolean {
  fieldSizingSupported ??= typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");
  return fieldSizingSupported;
}

function fitToContent(element: HTMLTextAreaElement) {
  const scrollY = window.scrollY;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  // Collapsing to "auto" for a moment can shorten the page and clamp the scroll position.
  if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY });
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}
