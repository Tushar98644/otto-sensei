"use client";

import type { FocusEvent } from "react";

let pressed = false;
let tracking = false;

function trackPointer() {
  if (tracking) return;
  tracking = true;
  const release = () => {
    pressed = false;
  };
  const press = () => {
    pressed = true;
  };
  window.addEventListener("pointerdown", press, true);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  window.addEventListener("keydown", release, true);
}

// The timer runs after the click that ends this press has been dispatched.
function afterPress(run: () => void) {
  const done = new AbortController();
  const later = () => {
    done.abort();
    window.setTimeout(run, 0);
  };
  window.addEventListener("pointerup", later, { capture: true, signal: done.signal });
  window.addEventListener("pointercancel", later, { capture: true, signal: done.signal });
}

// Like :focus-within, as data-focused, except a press that takes focus away clears it only once its click
// has landed: tools that fold on mousedown would pull the pressed key out from under the pointer.
export const HOLD_FOCUS = {
  onFocus(event: FocusEvent<HTMLElement>) {
    trackPointer();
    event.currentTarget.dataset.focused = "";
  },
  onBlur(event: FocusEvent<HTMLElement>) {
    const group = event.currentTarget;
    const next = event.relatedTarget;
    if (next instanceof Node && group.contains(next)) return;
    const clear = () => {
      if (!group.contains(document.activeElement)) delete group.dataset.focused;
    };
    if (pressed) afterPress(clear);
    else clear();
  },
};
