"use client";

import { useEffect } from "react";

// Otto's endless idle loops; the ones that play twice and stop are left alone.
const LOOP_NAMES = ["blink", "page", "nod", "point", "chin", "tilt"].map(
  (name) => `[class*="animate-otto-${name}"]`,
);
const LOOPS = `:is(${[...LOOP_NAMES, '[class*="animate-scene-"]'].join(",")}):not([class*="iteration-count"])`;

// A loop pauses with its whole drawing, so parts that move together stay in step.
function unitOf(loop: Element): Element {
  return loop.closest("svg") ?? loop.parentElement ?? loop;
}

function loopsIn(node: Node): Element[] {
  if (!(node instanceof Element)) return [];
  const found = [...node.querySelectorAll(LOOPS)];
  return node.matches(LOOPS) ? [node, ...found] : found;
}

// Marks drawings scrolled out of view with data-offscreen; globals.css pauses their loops there.
export function PauseOffscreenLoops() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
      }
    });
    const units = new Map<Element, number>();
    const unitOfLoop = new WeakMap<Element, Element>();

    function add(loop: Element) {
      if (unitOfLoop.has(loop)) return;
      const unit = unitOf(loop);
      unitOfLoop.set(loop, unit);
      const count = units.get(unit) ?? 0;
      units.set(unit, count + 1);
      if (count === 0) io.observe(unit);
    }

    function remove(loop: Element) {
      const unit = unitOfLoop.get(loop);
      if (!unit) return;
      unitOfLoop.delete(loop);
      const count = (units.get(unit) ?? 1) - 1;
      if (count > 0) {
        units.set(unit, count);
        return;
      }
      units.delete(unit);
      io.unobserve(unit);
      unit.removeAttribute("data-offscreen");
    }

    loopsIn(document.body).forEach(add);
    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.removedNodes.forEach((node) => loopsIn(node).forEach(remove));
        record.addedNodes.forEach((node) => {
          if (node.isConnected) loopsIn(node).forEach(add);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
      for (const unit of units.keys()) unit.removeAttribute("data-offscreen");
    };
  }, []);

  return null;
}
