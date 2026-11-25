"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { seeded, seedOf } from "../parts";

// Ported from umutxyp/Personal-Website (MIT, see ./LICENSE.txt).

const MODE_KEY = "pf-paper-mode";

function calm(node: Element): boolean {
  return (
    node.closest("[inert], [data-pf-still]") !== null ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type Point = [number, number];

// A smooth path through the points (Catmull-Rom as cubic Béziers).
function smooth(points: Point[]): string {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))]!;
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0]![0])} ${f(points[0]![1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// A rounded box drawn in one go, the way a pen does it: nearly straight, closing a little past its start.
export function handBox(w: number, h: number, r: number, seed: number): string {
  const random = seeded(seed);
  const jit = (amount: number) => (random() * 2 - 1) * amount;
  const wobble = 1.5;
  const pts: Point[] = [];
  const side = (ax: number, ay: number, bx: number, by: number) => {
    const length = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(length / 70));
    const bow = jit(wobble * 1.3);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const off = jit(wobble) + bow * Math.sin(Math.PI * t);
      pts.push([
        ax + (bx - ax) * t - ((by - ay) / length) * off,
        ay + (by - ay) * t + ((bx - ax) / length) * off,
      ]);
    }
  };
  const corner = (cx: number, cy: number, from: number) => {
    const a = ((from + 45) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * r + jit(0.8), cy + Math.sin(a) * r + jit(0.8)]);
  };
  const x = 1.5;
  const y = 1.5;
  const W = w - 3;
  const H = h - 3;
  pts.push([x + r + 14, y + jit(1)], [x + r + 40, y + jit(1)]);
  side(x + r + 40, y, x + W - r, y);
  pts.push([x + W - r, y + jit(1)]);
  corner(x + W - r, y + r, -90);
  pts.push([x + W + jit(1), y + r]);
  side(x + W, y + r, x + W, y + H - r);
  pts.push([x + W + jit(1), y + H - r]);
  corner(x + W - r, y + H - r, 0);
  pts.push([x + W - r, y + H + jit(1)]);
  side(x + W - r, y + H, x + r, y + H);
  pts.push([x + r, y + H + jit(1)]);
  corner(x + r, y + H - r, 90);
  pts.push([x + jit(1), y + H - r]);
  side(x, y + H - r, x, y + r);
  pts.push([x + jit(1), y + r]);
  corner(x + r, y + r, 180);
  pts.push(
    [x + r, y + jit(0.5)],
    [x + r + 16, y - 0.2 + jit(0.5)],
    [x + r + 30, y - 1.2 + jit(0.4)],
  );
  return smooth(pts);
}

// The ink frame of a .sketch box: measured from the box, drawn a little differently for each, then drawn in.
export function Frame({ radius = 20 }: { radius?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => setSize({ w: parent.offsetWidth, h: parent.offsetHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    parent.dataset.framed = "";
    return () => observer.disconnect();
  }, []);

  return (
    <svg ref={ref} className="frame-ink" width={size?.w ?? 0} height={size?.h ?? 0} aria-hidden>
      {size && size.w > 60 && size.h > 40 ? (
        <path
          pathLength={1}
          d={handBox(size.w, size.h, Math.min(radius, size.h / 3), seedOf(id))}
        />
      ) : null}
    </svg>
  );
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Bubbles rise off the writing, as they do by the sea in the fox world.
function bubble(host: HTMLElement) {
  if (host.childElementCount > 40) return;
  const p = document.createElement("i");
  p.className = "fx-p fx-bubble";
  p.setAttribute("aria-hidden", "true");
  p.style.cssText = `--x:${rand(2, 98)}%;--y:${rand(45, 95)}%;--dx:${rand(-24, 24)}px;--dy:${-rand(50, 130)}px;--s:${rand(6, 15).toFixed(1)}px;--r:${rand(-320, 320).toFixed(0)}deg;--t:${rand(2.4, 4.8).toFixed(2)}s`;
  p.addEventListener("animationend", () => p.remove());
  host.appendChild(p);
}

// Steady keeps bubbles coming while the writing is on screen; otherwise a few on arrival and on pointing.
export function Fx({
  children,
  steady = false,
  className = "",
}: {
  children: ReactNode;
  steady?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = layer.current;
    const box = ref.current;
    if (!host || !box || calm(box)) return;
    let timer: number | undefined;
    const timers: number[] = [];
    const burst = (n: number) => {
      for (let i = 0; i < n; i++) timers.push(window.setTimeout(() => bubble(host), i * 70));
    };
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      timer = undefined;
      if (!entry?.isIntersecting) return;
      if (steady) timer = window.setInterval(() => !document.hidden && bubble(host), 380);
      else burst(6);
    });
    observer.observe(box);
    const point = () => burst(10);
    box.addEventListener("pointerenter", point);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      timers.forEach((t) => window.clearTimeout(t));
      box.removeEventListener("pointerenter", point);
    };
  }, [steady]);

  return (
    <div ref={ref} className={`fx ${className}`}>
      <span ref={layer} className="fx-layer" aria-hidden />
      {children}
    </div>
  );
}

// Sections come into view as the page is scrolled to them; at once where nothing moves.
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (calm(element) || element.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    element.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.dataset.reveal = "in";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}

function darkNow(root: HTMLElement): boolean {
  const mode = root.dataset.mode;
  if (mode) return mode === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Day or night: the header's button flips it, the footer's pair picks one, and the choice is remembered.
export type ModeWords = { day: string; night: string; toDay: string; toNight: string };

export function ModeButtons({ header = false, words }: { header?: boolean; words: ModeWords }) {
  const box = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const root = box.current?.closest<HTMLElement>(".pf-paper");
    if (!root) return;
    const sync = () => setDark(darkNow(root));
    if (!root.closest("[data-pf-still]")) {
      try {
        const saved = window.localStorage.getItem(MODE_KEY);
        if (saved === "dark" || saved === "light") root.dataset.mode = saved;
      } catch {}
    }
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
    return () => watch.disconnect();
  }, []);

  const pick = (mode: "light" | "dark") => {
    const root = box.current?.closest<HTMLElement>(".pf-paper");
    if (!root) return;
    root.dataset.mode = mode;
    try {
      window.localStorage.setItem(MODE_KEY, mode);
    } catch {}
  };

  if (header)
    return (
      <div ref={box} className="picker">
        <button
          type="button"
          className="tag picker-button"
          aria-label={dark ? words.toDay : words.toNight}
          onClick={() => pick(dark ? "light" : "dark")}
        >
          <i className="dot" />
          {dark ? words.night : words.day}
        </button>
      </div>
    );

  return (
    <div ref={box} className="theme-row">
      <button
        type="button"
        className="tag small"
        aria-pressed={dark === false}
        onClick={() => pick("light")}
      >
        {words.day}
      </button>
      <button
        type="button"
        className="tag small"
        aria-pressed={dark === true}
        onClick={() => pick("dark")}
      >
        {words.night}
      </button>
    </div>
  );
}
