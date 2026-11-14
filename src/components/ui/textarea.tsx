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
import { fitToContent, insertsOneCharacter } from "./textarea-fit";

export type TextareaVariant = "box" | "line";

export type TextareaProps = ComponentProps<"textarea"> & {
  invalid?: boolean;
  autoResize?: boolean;
  variant?: TextareaVariant;
};

const LINE_CLASSES =
  "rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-2.5 focus-visible:border-ink focus-visible:shadow-[inset_0_-1px_0_var(--color-ink)] focus-visible:ring-0 disabled:bg-transparent";

export function Textarea({
  className,
  invalid,
  autoResize = false,
  variant = "box",
  rows,
  ref,
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

// Callers are controlled, so this runs once per change, after React commits it and before paint.
function useAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  enabled: boolean,
  value: ComponentProps<"textarea">["value"],
) {
  const fitted = useRef<string | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || supportsFieldSizing()) return;
    const typed = fitted.current !== null && insertsOneCharacter(fitted.current, element.value);
    fitted.current = element.value;
    fitToContent(element, typed);
  }, [ref, enabled, value]);

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

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}
