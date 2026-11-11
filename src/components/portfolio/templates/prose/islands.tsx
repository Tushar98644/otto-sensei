"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Ported from antfu/antfu.me (code MIT, see ./LICENSE.txt).

const R180 = Math.PI;
const R90 = Math.PI / 2;
const R15 = Math.PI / 12;
const MIN_BRANCH = 30;
const LENGTH = 6;
const FRAME_MS = 1000 / 40;

export function ArtPlum() {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = box.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;
    if (wrap.closest("[data-pf-still]")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = wrap.parentElement ?? wrap;
    const width = Math.max(1, Math.round(root.clientWidth));
    const height = Math.max(
      1,
      Math.round(Math.min(window.innerHeight, wrap.clientHeight || window.innerHeight)),
    );
    const dpi = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = dpi * width;
    canvas.height = dpi * height;
    ctx.scale(dpi, dpi);
    ctx.lineWidth = 1;
    ctx.strokeStyle = getComputedStyle(root).getPropertyValue("--plum").trim() || "#88888825";

    type Step = () => void;
    let steps: Step[] = [];
    let frame = 0;
    let last = performance.now();
    const { random } = Math;

    const step = (x: number, y: number, rad: number, counter = { value: 0 }) => {
      const length = random() * LENGTH;
      counter.value += 1;
      const nx = x + length * Math.cos(rad);
      const ny = y + length * Math.sin(rad);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      const rad1 = rad + random() * R15;
      const rad2 = rad - random() * R15;
      if (nx < -100 || nx > width + 100 || ny < -100 || ny > height + 100) return;
      const rate = counter.value <= MIN_BRANCH ? 0.8 : 0.5;
      if (random() < rate) steps.push(() => step(nx, ny, rad1, counter));
      if (random() < rate) steps.push(() => step(nx, ny, rad2, counter));
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (performance.now() - last < FRAME_MS) return;
      const previous = steps;
      steps = [];
      last = performance.now();
      if (previous.length === 0) {
        cancelAnimationFrame(frame);
        return;
      }
      for (const run of previous) {
        if (random() < 0.5) steps.push(run);
        else run();
      }
    };

    const middle = () => random() * 0.6 + 0.2;
    steps = [
      () => step(middle() * width, -5, R90),
      () => step(middle() * width, height + 5, -R90),
      () => step(-5, middle() * height, 0),
      () => step(width + 5, middle() * height, R180),
    ];
    if (width < 500) steps = steps.slice(0, 2);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={box} className="plum" aria-hidden>
      <canvas ref={canvasRef} width={400} height={400} />
    </div>
  );
}

export function ToTop() {
  const button = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let scroller: HTMLElement | Window = window;
    for (let el = button.current?.parentElement ?? null; el; el = el.parentElement) {
      const overflow = getComputedStyle(el).overflowY;
      if (overflow === "auto" || overflow === "scroll") {
        scroller = el;
        break;
      }
    }
    const read = () =>
      setShown((scroller instanceof Window ? scroller.scrollY : scroller.scrollTop) > 300);
    read();
    scroller.addEventListener("scroll", read, { passive: true });
    return () => scroller.removeEventListener("scroll", read);
  }, []);

  return (
    <button
      ref={button}
      type="button"
      title="Scroll to top"
      className="to-top"
      data-shown={shown}
      onClick={() => {
        let el: HTMLElement | null = button.current?.parentElement ?? null;
        while (el && !["auto", "scroll"].includes(getComputedStyle(el).overflowY))
          el = el.parentElement;
        (el ?? window).scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <ArrowUp aria-hidden />
      <span className="sr-only">Scroll to top</span>
    </button>
  );
}
