"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  cardColumn,
  cardName,
  COLUMN_NAMES,
  stepColumn,
  type BoardCard,
  type DropTarget,
} from "./board";

// No library. Touch and pen drag from the avatar (the handle), so the page still scrolls under a
// finger; a mouse drags from anywhere that isn't a control.

export type DragMode = "pointer" | "keyboard";

export type Held = { card: BoardCard; mode: DragMode; target: DropTarget | null };

// Where the card was let go, so the move's question opens beside it. Null for the keyboard.
export type DropPoint = { x: number; y: number } | null;

type Pending = {
  card: BoardCard;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  // Where the pointer sits inside the card, so the floating copy doesn't jump.
  offsetX: number;
  offsetY: number;
  width: number;
  started: boolean;
};

const DRAG_START_PX = 5;
// Near an edge of the board's own scroller, it scrolls toward that edge, faster the closer.
const EDGE_PX = 64;
const EDGE_MAX_STEP_PX = 18;

const INTERACTIVE =
  "a, button, input, select, textarea, [role=menu], [role=menuitem], [contenteditable]";

function targetAt(x: number, y: number): DropTarget | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-target]");
  return (element?.dataset.dropTarget as DropTarget | undefined) ?? null;
}

export type BoardDrag = {
  held: Held | null;
  // The floating copy under the pointer: its width, and a ref the hook moves without re-rendering.
  ghost: { width: number } | null;
  ghostRef: RefObject<HTMLDivElement | null>;
  announcement: string;
  announce: (message: string) => void;
  onCardPointerDown: (event: PointerEvent<HTMLElement>, card: BoardCard) => void;
  onHandleKeyDown: (event: KeyboardEvent<HTMLElement>, card: BoardCard) => void;
  // The handle lost focus while holding a card: put it back.
  onHandleBlur: (card: BoardCard) => void;
};

export function useBoardDrag({
  onDrop,
  onKeyboardTarget,
  scrollerRef,
}: {
  onDrop: (card: BoardCard, target: DropTarget, mode: DragMode, point: DropPoint) => void;
  // The keyboard moved over a column, so a phone can show it.
  onKeyboardTarget?: (target: DropTarget) => void;
  scrollerRef: RefObject<HTMLElement | null>;
}): BoardDrag {
  const [held, setHeld] = useState<Held | null>(null);
  const [ghost, setGhost] = useState<{ width: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pending = useRef<Pending | null>(null);
  const heldRef = useRef<Held | null>(null);
  const frame = useRef<number | null>(null);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  const hold = useCallback((next: Held | null) => {
    heldRef.current = next;
    setHeld(next);
  }, []);

  const moveGhost = useCallback(() => {
    const drag = pending.current;
    const node = ghostRef.current;
    if (!drag || !node) return;
    node.style.transform = `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)`;
  }, []);

  const endPointer = useCallback(() => {
    pending.current = null;
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
    setGhost(null);
    document.body.style.removeProperty("user-select");
  }, []);

  const cancel = useCallback(() => {
    const current = heldRef.current;
    if (current) setAnnouncement(`${cardName(current.card)} put back.`);
    endPointer();
    hold(null);
  }, [endPointer, hold]);

  // Window listeners for the pointer, so a fast drag that leaves the card is still followed.
  useEffect(() => {
    // Re-checks every frame, so holding still at the edge keeps scrolling.
    function edgeScroll() {
      frame.current = null;
      const drag = pending.current;
      const scroller = scrollerRef.current;
      if (!drag?.started || !scroller) return;
      const box = scroller.getBoundingClientRect();
      if (drag.y < box.top || drag.y > box.bottom) return;
      const left = drag.x - box.left;
      const right = box.right - drag.x;
      let step = 0;
      if (left < EDGE_PX) step = -Math.ceil(((EDGE_PX - left) / EDGE_PX) * EDGE_MAX_STEP_PX);
      else if (right < EDGE_PX) step = Math.ceil(((EDGE_PX - right) / EDGE_PX) * EDGE_MAX_STEP_PX);
      if (step === 0) return;
      const before = scroller.scrollLeft;
      scroller.scrollLeft = before + step;
      if (scroller.scrollLeft === before) return;
      const target = targetAt(drag.x, drag.y);
      const current = heldRef.current;
      if (current && current.target !== target) hold({ ...current, target });
      frame.current = window.requestAnimationFrame(edgeScroll);
    }

    function onMove(event: globalThis.PointerEvent) {
      const drag = pending.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (!drag.started) {
        const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (moved < DRAG_START_PX) return;
        drag.started = true;
        document.body.style.setProperty("user-select", "none");
        setGhost({ width: drag.width });
        hold({ card: drag.card, mode: "pointer", target: cardColumn(drag.card) });
        setAnnouncement(`Picked up ${cardName(drag.card)}.`);
      }
      event.preventDefault();
      moveGhost();
      const target = targetAt(event.clientX, event.clientY);
      const current = heldRef.current;
      if (current && current.target !== target) hold({ ...current, target });
      if (frame.current === null) frame.current = window.requestAnimationFrame(edgeScroll);
    }

    function onUp(event: globalThis.PointerEvent) {
      const drag = pending.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const current = heldRef.current;
      endPointer();
      if (!drag.started || !current) return;
      hold(null);
      const target = targetAt(event.clientX, event.clientY);
      if (target && target !== cardColumn(current.card)) {
        dropRef.current(current.card, target, "pointer", { x: event.clientX, y: event.clientY });
      } else {
        setAnnouncement(`${cardName(current.card)} put back.`);
      }
    }

    function onCancel(event: globalThis.PointerEvent) {
      if (pending.current?.pointerId === event.pointerId) cancel();
    }

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && heldRef.current?.mode === "pointer") cancel();
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, [cancel, endPointer, hold, moveGhost, scrollerRef]);

  // The ghost mounts after the drag starts; place it under the pointer on its first frame.
  useEffect(() => {
    if (ghost) moveGhost();
  }, [ghost, moveGhost]);

  const onCardPointerDown = useCallback((event: PointerEvent<HTMLElement>, card: BoardCard) => {
    if (event.button !== 0 || heldRef.current) return;
    const element = event.target as HTMLElement;
    const fromHandle = element.closest("[data-drag-handle]") !== null;
    if (!fromHandle && element.closest(INTERACTIVE)) return;
    if (event.pointerType !== "mouse" && !fromHandle) return;
    const box = event.currentTarget.getBoundingClientRect();
    pending.current = {
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      width: box.width,
      started: false,
    };
  }, []);

  const onHandleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, card: BoardCard) => {
      const current = heldRef.current;
      const holding = current?.mode === "keyboard" && current.card.key === card.key;
      const own = cardColumn(card);
      if (!holding) {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        hold({ card, mode: "keyboard", target: own });
        setAnnouncement(
          `Picked up ${cardName(card)}, in ${COLUMN_NAMES[own]}. Use the arrow keys to choose a column, Space to drop it, Escape to put it back.`,
        );
        return;
      }
      const here = current.target && current.target !== "delete" ? current.target : own;
      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const next = stepColumn(card, here, step);
        hold({ ...current, target: next });
        onKeyboardTarget?.(next);
        setAnnouncement(`Over ${COLUMN_NAMES[next]}.`);
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        hold(null);
        if (here !== own) dropRef.current(card, here, "keyboard", null);
        else setAnnouncement(`${cardName(card)} put back.`);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    },
    [cancel, hold, onKeyboardTarget],
  );

  const onHandleBlur = useCallback(
    (card: BoardCard) => {
      const current = heldRef.current;
      if (current?.mode === "keyboard" && current.card.key === card.key) cancel();
    },
    [cancel],
  );

  return {
    held,
    ghost,
    ghostRef,
    announcement,
    announce: setAnnouncement,
    onCardPointerDown,
    onHandleKeyDown,
    onHandleBlur,
  };
}
