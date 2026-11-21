"use client";

import { FileText, House, Moon, Sun } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import type { SocialKind } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import { flickerGrid, flickerStill } from "./flicker";

// Ported from dillionverma/portfolio (MIT, see ./LICENSE.txt).

function solidColor(color: string): string {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const ctx = probe.getContext("2d");
  if (!ctx) return "rgb(0, 0, 0)";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
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
    const still = flickerStill(
      container,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const grid = flickerGrid(ctx, { squareSize, gridGap, flickerChance, maxOpacity });
    let frame = 0;
    let visible = true;
    let size = "";
    let lastColor = "";
    let fill = "rgb(0, 0, 0)";

    const color = () => {
      const next = getComputedStyle(container).color;
      if (next !== lastColor) {
        lastColor = next;
        fill = solidColor(next);
      }
      return fill;
    };
    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: width, clientHeight: height } = container;
      const next = `${width}x${height}@${dpr}`;
      if (next !== size) {
        size = next;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        grid.resize(width, height, dpr);
      }
      // The first notification comes after the dock has applied a saved theme, which a still grid needs.
      grid.recolor(color());
    };
    // A restored context comes back blank with default state, and frames only redraw what flickered.
    const restore = () => grid.paint(color());
    const tick = (time: number) => {
      grid.tick(time, color());
      if (visible) frame = requestAnimationFrame(tick);
    };

    setup();
    const resize = new ResizeObserver(setup);
    resize.observe(container);
    canvas.addEventListener("contextrestored", restore);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      cancelAnimationFrame(frame);
      grid.pause();
      if (visible && !still) frame = requestAnimationFrame(tick);
    });
    seen.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
      canvas.removeEventListener("contextrestored", restore);
    };
  }, [squareSize, gridGap, flickerChance, maxOpacity]);

  return (
    <div ref={box} className="flicker" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}

export type DockLink = { href: string; label: string; kind: SocialKind | "home" | "resume" };

const BASE = 40;
const MAGNIFIED = 60;
const DISTANCE = 100;

export function Dock({
  home,
  resume,
  socials,
}: {
  home: DockLink;
  resume: DockLink | null;
  socials: DockLink[];
}) {
  const bar = useRef<HTMLDivElement>(null);

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
          {link.kind === "home" ? (
            <House aria-hidden />
          ) : link.kind === "resume" ? (
            <FileText aria-hidden />
          ) : (
            <SocialIcon kind={link.kind} />
          )}
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
        {resume ? item(resume) : null}
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
