"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Reel's moving parts, after HamishMW/portfolio (MIT): the displacement sphere (loaded on demand
// from ./sphere-gl.ts), the decoder text (components/decoder-text), the rotating disciplines
// (routes/home/intro.jsx), the theme toggle and the mobile menu (layouts/navbar).

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The WebGL sphere over a static gradient stand-in, which shows until the sphere has drawn. */
export function Sphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    // Template thumbnails keep the static stand-in: no WebGL context per small picture.
    if (!canvas || canvas.closest("[data-pf-still]")) return;
    const root = canvas.closest<HTMLElement>(".pf-reel");
    let stop: (() => void) | null = null;
    let cancelled = false;
    void import("./sphere-gl").then(({ startSphere }) => {
      if (cancelled) return;
      stop = startSphere(canvas, {
        light: () => root?.dataset.theme === "light",
        still: reduced(),
      });
      if (stop) canvas.dataset.visible = "true";
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return <canvas ref={ref} className="sphere" aria-hidden data-visible="false" />;
}

const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨーラリルレロワヰヱヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ";

/**
 * Text that settles out of random katakana, left to right. The server draws the real text, so
 * nothing is lost without JavaScript; the scramble only plays for readers without reduced motion.
 */
export function DecoderText({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || reduced()) return;
    const chars = [...text];
    let frame = 0;
    let started = 0;
    const render = (position: number) => {
      node.replaceChildren(
        ...chars.map((char, index) => {
          const span = document.createElement("span");
          if (index < position) {
            span.className = "value";
            span.textContent = char;
          } else {
            span.className = "glyph";
            span.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "";
          }
          return span;
        }),
      );
    };
    // Eases like the original's spring (stiffness 8, damping 5) over about two seconds.
    const step = (time: number) => {
      if (!started) started = time;
      const t = Math.min(1, (time - started) / 2000);
      const eased = 1 - Math.pow(1 - t, 3);
      render(eased * chars.length);
      if (t < 1) frame = requestAnimationFrame(step);
      else node.textContent = text;
    };
    render(0);
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      node.textContent = text;
    };
  }, [text, delay]);
  return (
    <span className="decoder">
      <span className="visually-hidden">{text}</span>
      <span aria-hidden ref={ref}>
        {text}
      </span>
    </span>
  );
}

/** "+ Developer", then the next discipline every five seconds, each wiping in. */
export function Disciplines({ words }: { words: string[] }) {
  const [{ index, previous }, setState] = useState<{ index: number; previous: number | null }>({
    index: 0,
    previous: null,
  });

  useEffect(() => {
    if (words.length < 2) return;
    const timer = window.setInterval(() => {
      setState((state) => ({ index: (state.index + 1) % words.length, previous: state.index }));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [words.length]);

  return (
    <span className="row" aria-hidden>
      {previous !== null ? (
        <span
          key={`out-${previous}-${index}`}
          className="word"
          data-plus="true"
          data-status="exiting"
        >
          {words[previous]}
        </span>
      ) : null}
      <span
        key={`in-${index}`}
        className="word"
        data-plus="true"
        data-status="entering"
        style={{ "--delay": previous === null ? "600ms" : "0ms" } as CSSProperties}
      >
        {words[index]}
      </span>
    </span>
  );
}

/** Dark by default, like the original; the choice is remembered per browser. */
export function ThemeToggle() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pf-reel");
    try {
      if (root && window.localStorage.getItem("pf-reel-theme") === "light")
        root.dataset.theme = "light";
    } catch {}
  }, []);
  const toggle = () => {
    const root = ref.current?.closest<HTMLElement>(".pf-reel");
    if (!root) return;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      window.localStorage.setItem("pf-reel-theme", next);
    } catch {}
  };
  return (
    <button
      ref={ref}
      type="button"
      className="theme-toggle"
      aria-label="Toggle theme"
      onClick={toggle}
    >
      <svg viewBox="0 0 38 38" aria-hidden>
        <defs>
          <mask id="pf-reel-moon">
            <rect width="100%" height="100%" fill="white" />
            <circle className="cut" cx="25" cy="10" r="8" fill="black" />
          </mask>
        </defs>
        <circle className="circle" cx="19" cy="19" r="8" mask="url(#pf-reel-moon)" />
        <path
          className="rays"
          d="M19 3v7M19 35v-7M32.856 11l-6.062 3.5M5.144 27l6.062-3.5M5.144 11l6.062 3.5M32.856 27l-6.062-3.5"
        />
      </svg>
    </button>
  );
}

export type ReelNavLink = { href: string; label: string };

/** The hamburger and full-screen menu shown at 696px and below. */
export function MobileNav({ links }: { links: ReelNavLink[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="nav-toggle-inner" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
      <nav className="mobile-nav" data-visible={open} aria-hidden={!open}>
        {links.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            className="mobile-nav-link"
            data-visible={open}
            tabIndex={open ? 0 : -1}
            style={{ "--transition-delay": `${index * 50 + 250}ms` } as CSSProperties}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </>
  );
}
