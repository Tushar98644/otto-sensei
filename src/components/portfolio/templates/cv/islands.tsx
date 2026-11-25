"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { intlLocale, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { WidthDimension } from "./dimension";
import type { Iso } from "./pixel";

// Ported from ncdai/chanhdai.com (MIT, see ./LICENSE.txt).

const THEME_KEY = "pf-cv-theme";

function stillOrCalm(node: Element | null): boolean {
  if (!node || node.closest("[inert], [data-pf-still]")) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Eases toward the pointer each frame, like the original's spring, and stops once settled.
function usePointer(
  ref: RefObject<Element | null>,
  read: (event: MouseEvent, box: Element) => [number, number] | null,
  apply: (x: number, y: number) => void,
  rest: [number, number],
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || stillOrCalm(node) || window.matchMedia("(hover: none)").matches) return;
    let target = rest;
    let at = rest;
    let frame = 0;
    let visible = true;
    const step = () => {
      at = [at[0] + (target[0] - at[0]) * 0.18, at[1] + (target[1] - at[1]) * 0.18];
      apply(at[0], at[1]);
      const done = Math.abs(target[0] - at[0]) < 0.5 && Math.abs(target[1] - at[1]) < 0.5;
      frame = done ? 0 : requestAnimationFrame(step);
    };
    const move = (event: MouseEvent) => {
      if (!visible) return;
      const next = read(event, node);
      if (!next) return;
      target = next;
      if (!frame) frame = requestAnimationFrame(step);
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
    });
    seen.observe(node);
    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      seen.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, read, apply, rest]);
}

const ANGLE_RADIUS = 88;
const ARROW = "M0 0 8-3v6Z";

function readWindow(width: number, height: number) {
  return (event: MouseEvent): [number, number] => [
    (event.clientX / window.innerWidth) * width,
    (event.clientY / window.innerHeight) * height,
  ];
}

export function IsoMark({ iso }: { iso: Iso }) {
  const id = useId().replace(/[^\w-]/g, "");
  const hatch = `${id}-hatch`;
  const glow = `${id}-glow`;
  const svg = useRef<SVGSVGElement>(null);
  const gradient = useRef<SVGRadialGradientElement>(null);
  const [read] = useState(() => readWindow(iso.width, iso.height));
  const [apply] = useState(() => (x: number, y: number) => {
    gradient.current?.setAttribute("cx", x.toFixed(1));
    gradient.current?.setAttribute("cy", y.toFixed(1));
  });
  const [rest] = useState<[number, number]>(() => [iso.width / 2, iso.height / 2]);
  usePointer(svg, read, apply, rest);

  const { x, y } = iso.vertex;
  const start = { x: x + ANGLE_RADIUS, y };
  const end = {
    x: x + ANGLE_RADIUS * Math.cos(Math.PI / 6),
    y: y + ANGLE_RADIUS * Math.sin(Math.PI / 6),
  };
  const label = {
    x: x + (ANGLE_RADIUS + 18) * Math.cos(Math.PI / 12),
    y: y + (ANGLE_RADIUS + 18) * Math.sin(Math.PI / 12),
  };

  return (
    <svg
      ref={svg}
      className="iso"
      viewBox={`0 0 ${iso.width} ${iso.height}`}
      fill="none"
      aria-hidden
    >
      <defs>
        <pattern id={hatch} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M-1 1l2 -2M0 10l10 -10M9 11l2 -2" className="hatch" />
        </pattern>
        <radialGradient
          ref={gradient}
          id={glow}
          cx={rest[0]}
          cy={rest[1]}
          r="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop className="glow-0" />
          <stop className="glow-1" offset="1" />
        </radialGradient>
      </defs>
      <path className="guides" d={iso.guides} />
      {iso.parts.map((part, index) => (
        <g key={index}>
          {part.faces.map((face, at) =>
            face.top ? (
              <g key={at}>
                <path className="face" d={face.d} />
                <path d={face.d} fill={`url(#${hatch})`} />
              </g>
            ) : (
              <path key={at} className="face" d={face.d} />
            ),
          )}
          <path className="edge" d={part.edges} />
          <path className="edge" d={part.edges} stroke={`url(#${glow})`} />
        </g>
      ))}
      <g className="angle">
        <path d={`M${x} ${y}H${start.x + 12}`} />
        <path
          d={`M${start.x} ${start.y}A${ANGLE_RADIUS} ${ANGLE_RADIUS} 0 0 1 ${end.x} ${end.y}`}
        />
        <path
          className="face"
          d={ARROW}
          transform={`translate(${start.x} ${start.y}) rotate(90)`}
        />
        <path className="face" d={ARROW} transform={`translate(${end.x} ${end.y}) rotate(-60)`} />
        <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central">
          30°
        </text>
      </g>
    </svg>
  );
}

export function Logotype({
  columns,
  fill,
  outline,
}: {
  columns: number;
  fill: string;
  outline: string;
}) {
  const id = useId().replace(/[^\w-]/g, "");
  const hatch = `${id}-hatch`;
  const sweep = `${id}-sweep`;
  const width = Math.max(columns, 1) * 32 + 2;
  const box = useRef<HTMLDivElement>(null);
  const gradient = useRef<SVGLinearGradientElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const [read] = useState(() => (event: MouseEvent, node: Element): [number, number] | null => {
    const rect = node.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return [((event.clientX - rect.left) / rect.width) * width, 0];
  });
  const [apply] = useState(() => (x: number) => {
    gradient.current?.setAttribute("x1", x.toFixed(1));
  });
  const [rest] = useState<[number, number]>(() => [width / 2, 0]);
  usePointer(box, read, apply, rest);

  useEffect(() => {
    const node = box.current?.querySelector("svg");
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setMeasured(Math.round(entry?.contentRect.width ?? 0));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="logo-wrap" style={{ "--cols": Math.max(columns, 1) } as CSSProperties}>
      <div ref={box} className="logotype" aria-hidden>
        <div className="logotype-crop">
          <svg viewBox={`-1 -1 ${width} ${5 * 32 + 2}`}>
            <defs>
              <pattern id={hatch} x="1" y="1" width="8" height="8" patternUnits="userSpaceOnUse">
                <path className="hatch" d="M-1 1l2-2M0 8l8-8M7 9l2-2" />
              </pattern>
              <linearGradient
                ref={gradient}
                id={sweep}
                x1={rest[0]}
                y1="0"
                x2={width / 2}
                y2="160"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.625" className="sweep-0" />
                <stop offset="1" className="sweep-1" />
              </linearGradient>
            </defs>
            <path d={fill} fill={`url(#${hatch})`} />
            <path className="logo-clear" d={outline} />
            <path d={fill} fill={`url(#${sweep})`} />
            <path className="logo-line" d={outline} />
          </svg>
        </div>
      </div>
      <WidthDimension value={String(measured ?? width - 2)} className="logo-dim" />
    </div>
  );
}

function clockHands(hour: number, minute: number): string {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const minuteAngle = (minute / 60) * 2 * Math.PI;
  const hourAngle = (((hour % 12) + minute / 60) / 12) * 2 * Math.PI;
  return `M12 12 L${round(12 + 3.6 * Math.sin(hourAngle))} ${round(12 - 3.6 * Math.cos(hourAngle))} M12 12 L${round(12 + 6 * Math.sin(minuteAngle))} ${round(12 - 6 * Math.cos(minuteAngle))}`;
}

type Clock = { hour: string; minute: string; period: string; diff: string; hands: string };
type ClockWords = { same: string; ahead: string; behind: string };

function readClock(timeZone: string, locale: Locale, words: ClockWords): Clock | null {
  try {
    const now = new Date();
    // English keeps its 12-hour clock; other languages read the time their own way.
    const parts = new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      ...(locale === "en" ? { hour12: true } : {}),
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? "";
    const viewer = -now.getTimezoneOffset();
    const target =
      (new Date(now.toLocaleString("en-US", { timeZone })).getTime() -
        new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) /
      60000;
    const hours = Math.abs(target - viewer) / 60;
    const diff =
      hours < 1
        ? ` // ${words.same}`
        : ` // ${fmt(target > viewer ? words.ahead : words.behind, { hours: Math.floor(hours) })}`;
    return {
      hour: part("hour"),
      minute: part("minute"),
      period: part("dayPeriod"),
      diff,
      hands: clockHands(Number.parseInt(part("hour"), 10), Number.parseInt(part("minute"), 10)),
    };
  } catch {
    return null;
  }
}

export function LocalTime({
  timeZone,
  locale,
  words,
}: {
  timeZone: string;
  locale: Locale;
  words: ClockWords;
}) {
  const [clock, setClock] = useState<Clock | null>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setClock(readClock(timeZone, locale, words));
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [timeZone, locale, words]);

  return (
    <div className="ov-item">
      <span className="tile" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d={clock?.hands ?? clockHands(12, 0)} />
        </svg>
      </span>
      <p className="clock">
        {clock ? (
          <>
            {clock.hour}
            <span className="blink">:</span>
            {clock.minute} {clock.period}
            <span className="muted" aria-hidden>
              {clock.diff}
            </span>
          </>
        ) : (
          "--:--"
        )}
      </p>
    </div>
  );
}

type GreetingWords = { morning: string; afternoon: string; evening: string; hello: string };

function greetingNow(words: GreetingWords): string {
  const hour = new Date().getHours();
  if (hour < 12) return words.morning;
  if (hour < 17) return words.afternoon;
  return words.evening;
}

const noSubscription = () => () => {};

export function Greeting({ words }: { words: GreetingWords }) {
  const text = useSyncExternalStore(
    noSubscription,
    () => greetingNow(words),
    () => words.hello,
  );
  return (
    <div className="panel-title" aria-hidden>
      {text}
    </div>
  );
}

const SWAP_SECONDS = 3;

export function Taglines({ items }: { items: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const node = box.current;
    if (!node || items.length < 2 || stillOrCalm(node)) return;
    let visible = true;
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
    });
    seen.observe(node);
    const timer = window.setInterval(() => {
      if (visible && document.visibilityState === "visible")
        setIndex((at) => (at + 1) % items.length);
    }, SWAP_SECONDS * 1000);
    return () => {
      window.clearInterval(timer);
      seen.disconnect();
    };
  }, [items.length]);

  return (
    <div ref={box} className="taglines">
      <span className="sr-only">{items.join(", ")}</span>
      <span key={index} className="swap" aria-hidden>
        {items[index]}
      </span>
    </div>
  );
}

export function ShowMore({
  children,
  more,
  less,
}: {
  children: ReactNode;
  more: string;
  less: string;
}) {
  const [open, setOpen] = useState(false);
  const body = useId();
  return (
    <div className="more">
      <div id={body} hidden={!open}>
        {children}
      </div>
      <div className="more-bar">
        <button
          type="button"
          className="more-btn"
          aria-expanded={open}
          aria-controls={body}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? less : more}
          <ChevronDown aria-hidden className={open ? "up" : undefined} />
        </button>
      </div>
    </div>
  );
}

function darkNow(root: HTMLElement): boolean {
  const set = root.dataset.theme;
  if (set) return set === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle({ label }: { label: string }) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = button.current?.closest<HTMLElement>(".pf-cv");
    if (!root || root.closest("[data-pf-still]")) return;
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") root.dataset.theme = saved;
    } catch {}
  }, []);

  const toggle = () => {
    const root = button.current?.closest<HTMLElement>(".pf-cv");
    if (!root) return;
    const next = darkNow(root) ? "light" : "dark";
    root.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  return (
    <button ref={button} type="button" className="theme-btn" aria-label={label} onClick={toggle}>
      <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
        <path d="M16 .5C7.4.5.5 7.4.5 16S7.4 31.5 16 31.5 31.5 24.6 31.5 16 24.6.5 16 .5zm0 28.1V3.4C23 3.4 28.6 9 28.6 16S23 28.6 16 28.6z" />
      </svg>
    </button>
  );
}
