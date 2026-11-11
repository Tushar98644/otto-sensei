"use client";

import { House, Moon, Sun } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import type { SocialKind } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";

// Dock's moving parts, after dillionverma/portfolio (MIT), without framer-motion.

// The theme's colours are oklch(); a 1px canvas turns any CSS colour into "rgba(r, g, b," so each
// square can add its own alpha (the same trick as the original's toRGBA).
function rgbaPrefix(color: string): string {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const ctx = probe.getContext("2d");
  if (!ctx) return "rgba(0, 0, 0,";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b},`;
}

export function FlickeringGrid({
  squareSize = 2,
  gridGap = 2,
  flickerChance = 0.3,
  maxOpacity = 0.3,
}: {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  maxOpacity?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = box.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx) return;
    // Reduced motion and template thumbnails get one still frame.
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      container.closest("[data-pf-still]") !== null;
    let cols = 0;
    let rows = 0;
    let squares = new Float32Array(0);
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let last = 0;
    let lastColor = "";
    let base = "rgba(0, 0, 0,";

    const setup = () => {
      dpr = window.devicePixelRatio || 1;
      const { clientWidth: width, clientHeight: height } = container;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      cols = Math.floor(width / (squareSize + gridGap));
      rows = Math.floor(height / (squareSize + gridGap));
      squares = new Float32Array(cols * rows).map(() => Math.random() * maxOpacity);
    };
    const draw = () => {
      const color = getComputedStyle(container).color;
      if (color !== lastColor) {
        lastColor = color;
        base = rgbaPrefix(color);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          ctx.fillStyle = `${base}${squares[i * rows + j]})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr,
          );
        }
      }
    };
    const tick = (time: number) => {
      const delta = (time - last) / 1000;
      last = time;
      for (let i = 0; i < squares.length; i += 1) {
        if (Math.random() < flickerChance * delta) squares[i] = Math.random() * maxOpacity;
      }
      draw();
      if (visible) frame = requestAnimationFrame(tick);
    };

    setup();
    draw();
    const resize = new ResizeObserver(() => {
      setup();
      draw();
    });
    resize.observe(container);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      cancelAnimationFrame(frame);
      if (visible && !still) frame = requestAnimationFrame(tick);
    });
    seen.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
    };
  }, [squareSize, gridGap, flickerChance, maxOpacity]);

  return (
    <div ref={box} className="flicker" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}

export type DockLink = { href: string; label: string; kind: SocialKind | "home" };

const BASE = 40;
const MAGNIFIED = 60;
const DISTANCE = 100;

export function Dock({ home, socials }: { home: DockLink; socials: DockLink[] }) {
  const bar = useRef<HTMLDivElement>(null);

  // Theme lives on the root's data-theme, remembered per browser; blocked storage starts light.
  useEffect(() => {
    const root = bar.current?.closest<HTMLElement>(".pf-dock");
    try {
      if (root && window.localStorage.getItem("pf-dock-theme") === "dark")
        root.dataset.theme = "dark";
    } catch {}
  }, []);

  const toggle = () => {
    const root = bar.current?.closest<HTMLElement>(".pf-dock");
    if (!root) return;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      window.localStorage.setItem("pf-dock-theme", next);
    } catch {}
  };

  const magnify = (event: MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const icon of bar.current?.querySelectorAll<HTMLElement>(".dock-icon") ?? []) {
      const rect = icon.getBoundingClientRect();
      const offset = Math.abs(event.clientX - (rect.left + rect.width / 2));
      const t = Math.max(0, 1 - offset / DISTANCE);
      const size = BASE + (MAGNIFIED - BASE) * t;
      icon.style.setProperty("--size", `${size}px`);
      icon.style.setProperty("--icon", `${size / 2}px`);
    }
  };
  const reset = () => {
    for (const icon of bar.current?.querySelectorAll<HTMLElement>(".dock-icon") ?? []) {
      icon.style.removeProperty("--size");
      icon.style.removeProperty("--icon");
    }
  };

  const item = (link: DockLink) => {
    const external = /^https?:/.test(link.href);
    return (
      <div className="dock-item" key={link.href}>
        <a
          href={link.href}
          className="dock-icon"
          aria-label={link.label}
          {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
        >
          {link.kind === "home" ? <House aria-hidden /> : <SocialIcon kind={link.kind} />}
        </a>
        <span className="tip" aria-hidden>
          {link.label}
        </span>
      </div>
    );
  };

  return (
    <div className="dock-bar">
      <div ref={bar} className="dock" onMouseMove={magnify} onMouseLeave={reset}>
        {item(home)}
        {socials.length > 0 ? <div className="dock-sep" /> : null}
        {socials.map(item)}
        <div className="dock-sep" />
        <div className="dock-item">
          <button
            type="button"
            className="dock-icon theme"
            aria-label="Toggle theme"
            onClick={toggle}
          >
            <Sun className="sun" aria-hidden />
            <Moon className="moon" aria-hidden />
          </button>
          <span className="tip" aria-hidden>
            Theme
          </span>
        </div>
      </div>
    </div>
  );
}
