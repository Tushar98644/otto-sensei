"use client";

import {
  Archive,
  ArrowRight,
  Briefcase,
  Check,
  Columns2,
  Info,
  LayoutDashboard,
  LayoutGrid,
  Minus,
  Search,
  Square,
  SquareTerminal,
  X,
} from "lucide-react";
import {
  createContext,
  Fragment,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { intlLocale, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";

// Ported from mirkoschubert/retro-os (MIT, see ./LICENSE.txt): its window manager, dock and eras.

export type WinId = "welcome" | "sysinfo" | "projects" | "work" | "archive" | "console";
type WinState = "open" | "shaded" | "closed";
type Offset = { x: number; y: number };

export type DeskWords = {
  close: string;
  unroll: string;
  rollUp: string;
  zoom: string;
  windows: string;
  dock: string;
  about: string;
  welcome: string;
  theme: string;
  listView: string;
  gridView: string;
  searchPlaceholder: string;
  nothing: string;
};

type Desk = {
  words: DeskWords;
  focused: WinId | null;
  states: Partial<Record<WinId, WinState>>;
  zoomed: Partial<Record<WinId, boolean>>;
  stack: WinId[];
  opening: WinId | null;
  focus: (id: WinId, byHand?: boolean) => void;
  open: (id: WinId) => void;
  set: (id: WinId, state: WinState) => void;
  zoom: (id: WinId) => void;
};

const DeskContext = createContext<Desk | null>(null);

function useDesk(): Desk {
  const desk = use(DeskContext);
  if (!desk) throw new Error("Retro windows need a desk");
  return desk;
}

const ERA_KEY = "pf-retro-era";
const ERAS = [
  { id: "workbench", label: "Workbench" },
  { id: "atelier", label: "Atelier" },
  { id: "graphite", label: "Graphite" },
] as const;
type Era = (typeof ERAS)[number]["id"];

function still(node: Element | null): boolean {
  return Boolean(node?.closest("[inert], [data-pf-still]"));
}

function reduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

// One window is in front: the one you touched, or the one you've scrolled to.
export function DeskProvider({
  ids,
  words,
  children,
}: {
  ids: WinId[];
  words: DeskWords;
  children: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState<WinId | null>(ids[0] ?? null);
  const [states, setStates] = useState<Partial<Record<WinId, WinState>>>({});
  const [zoomed, setZoomed] = useState<Partial<Record<WinId, boolean>>>({});
  const [stack, setStack] = useState<WinId[]>(ids.slice(0, 1));
  const [opening, setOpening] = useState<WinId | null>(null);
  const touched = useRef(0);
  const current = useRef(states);

  useEffect(() => {
    current.current = states;
  }, [states]);

  const focus = useCallback((id: WinId, byHand = false) => {
    if (byHand) touched.current = Date.now();
    setFocused(id);
    setStack((all) => [...all.filter((item) => item !== id), id]);
  }, []);

  const open = useCallback(
    (id: WinId) => {
      const root = anchor.current?.closest(".pf-retro");
      if (current.current[id] === "closed") setOpening(id);
      setStates((all) => ({ ...all, [id]: "open" }));
      focus(id, true);
      const node = root?.querySelector<HTMLElement>(`[data-win="${id}"]`);
      requestAnimationFrame(() => {
        node?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
        node?.querySelector<HTMLElement>(".titlebar-title")?.focus({ preventScroll: true });
      });
    },
    [focus],
  );

  const set = useCallback((id: WinId, state: WinState) => {
    touched.current = Date.now();
    setStates((all) => ({ ...all, [id]: state }));
  }, []);

  const zoom = useCallback(
    (id: WinId) => {
      setZoomed((all) => ({ ...all, [id]: !all[id] }));
      focus(id, true);
    },
    [focus],
  );

  useEffect(() => {
    if (!opening) return;
    const timer = window.setTimeout(() => setOpening(null), 200);
    return () => window.clearTimeout(timer);
  }, [opening]);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".pf-retro");
    if (!root || still(root)) return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.win;
          if (!id) continue;
          if (entry.isIntersecting) seen.add(id);
          else seen.delete(id);
        }
        if (Date.now() - touched.current < 1500) return;
        const first = ids.find((id) => seen.has(id));
        if (first) focus(first);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const node of root.querySelectorAll<HTMLElement>("[data-win]")) observer.observe(node);

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      const at = Number(event.key);
      const id = Number.isInteger(at) && at > 0 ? ids[at - 1] : undefined;
      if (id) open(id);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [ids, focus, open]);

  const desk = useMemo(
    () => ({ words, focused, states, zoomed, stack, opening, focus, open, set, zoom }),
    [words, focused, states, zoomed, stack, opening, focus, open, set, zoom],
  );

  return (
    <DeskContext value={desk}>
      <span ref={anchor} hidden />
      {children}
    </DeskContext>
  );
}

export function Win({
  id,
  title,
  children,
  className = "",
  plain = false,
}: {
  id: WinId;
  title: string;
  children: ReactNode;
  className?: string;
  plain?: boolean;
}) {
  const desk = useDesk();
  const ref = useRef<HTMLElement>(null);
  const bodyId = useId();
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; base: Offset; min: Offset; max: Offset } | null>(
    null,
  );
  const state = desk.states[id] ?? "open";
  const zoomed = Boolean(desk.zoomed[id]);
  const z = desk.stack.indexOf(id) + 2;

  function start(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    const area = node?.closest<HTMLElement>(".desktop");
    if (!node || !area || event.button !== 0 || event.pointerType === "touch" || zoomed) return;
    if ((event.target as Element).closest("button") || area.clientWidth < 960) return;
    const box = node.getBoundingClientRect();
    const room = area.getBoundingClientRect();
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      base: offset,
      min: {
        x: offset.x + room.left + 140 - box.right,
        y: offset.y + room.top - box.top,
      },
      max: {
        x: offset.x + room.right - 140 - box.left,
        y: offset.y + room.bottom - 80 - box.top,
      },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const at = drag.current;
    if (!at) return;
    const clamp = (value: number, low: number, high: number) =>
      Math.min(Math.max(value, low), high);
    setOffset({
      x: clamp(at.base.x + event.clientX - at.x, at.min.x, at.max.x),
      y: clamp(at.base.y + event.clientY - at.y, at.min.y, at.max.y),
    });
  }

  function stop() {
    drag.current = null;
    setDragging(false);
  }

  const style = {
    zIndex: z,
    "--dx": `${offset.x}px`,
    "--dy": `${offset.y}px`,
  } as CSSProperties;

  return (
    <section
      ref={ref}
      className={`window ${className}`.trim()}
      data-win={id}
      data-state={state}
      data-focused={desk.focused === id ? "" : undefined}
      data-zoom={zoomed ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      data-opening={desk.opening === id ? "" : undefined}
      aria-labelledby={`pf-retro-t-${id}`}
      hidden={state === "closed"}
      style={style}
      onPointerDown={() => desk.focus(id, true)}
    >
      <div
        className="titlebar"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onDoubleClick={(event) => {
          if (!(event.target as Element).closest("button")) desk.zoom(id);
        }}
      >
        <div className="win-controls">
          <button
            type="button"
            className="win-btn"
            aria-label={fmt(desk.words.close, { title })}
            onClick={() => desk.set(id, "closed")}
          >
            <X aria-hidden />
          </button>
          <button
            type="button"
            className="win-btn"
            aria-label={fmt(state === "shaded" ? desk.words.unroll : desk.words.rollUp, { title })}
            aria-expanded={state !== "shaded"}
            aria-controls={bodyId}
            onClick={() => desk.set(id, state === "shaded" ? "open" : "shaded")}
          >
            <Minus aria-hidden />
          </button>
          <button
            type="button"
            className="win-btn"
            aria-label={fmt(desk.words.zoom, { title })}
            aria-pressed={zoomed}
            onClick={() => desk.zoom(id)}
          >
            <Square aria-hidden />
          </button>
        </div>
        {plain ? (
          <p className="titlebar-title" id={`pf-retro-t-${id}`} tabIndex={-1}>
            {title}
          </p>
        ) : (
          <h2 className="titlebar-title" id={`pf-retro-t-${id}`} tabIndex={-1}>
            {title}
          </h2>
        )}
      </div>
      <div className="window-body" id={bodyId}>
        {children}
      </div>
      <span className="resize-handle" aria-hidden />
    </section>
  );
}

export function Launch({ id, label, keyHint }: { id: WinId; label: string; keyHint: string }) {
  const desk = useDesk();
  return (
    <button type="button" className="launch" onClick={() => desk.open(id)}>
      <span className="kbd" aria-hidden>
        {keyHint}
      </span>
      <span className="label">{label}</span>
      <ArrowRight aria-hidden />
    </button>
  );
}

export function MenuLinks({ items }: { items: { id: WinId; label: string }[] }) {
  const desk = useDesk();
  return (
    <nav className="menu-items" aria-label={desk.words.windows}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="menu-item"
          onClick={() => desk.open(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function FocusedTitle({ titles }: { titles: Partial<Record<WinId, string>> }) {
  const desk = useDesk();
  const title = desk.focused ? titles[desk.focused] : null;
  return title ? <span className="focused">{title}</span> : null;
}

// The app menu: about, welcome, and the three eras, remembered on this browser.
export function AppMenu({ name }: { name: string }) {
  const desk = useDesk();
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [era, setEra] = useState<Era>("workbench");

  useEffect(() => {
    const root = box.current?.closest<HTMLElement>(".pf-retro");
    if (!root || still(root)) return;
    try {
      const saved = window.localStorage.getItem(ERA_KEY);
      if (ERAS.some((item) => item.id === saved)) root.dataset.era = saved!;
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function pick(next: Era) {
    const root = box.current?.closest<HTMLElement>(".pf-retro");
    if (root) root.dataset.era = next;
    setEra(next);
    setOpen(false);
    try {
      window.localStorage.setItem(ERA_KEY, next);
    } catch {}
  }

  function go(id: WinId) {
    setOpen(false);
    desk.open(id);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      box.current?.querySelector<HTMLElement>(".is-app")?.focus();
      return;
    }
    if (!open || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    event.preventDefault();
    const rows = [...(box.current?.querySelectorAll<HTMLElement>(".menu-row") ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? at + 1 : at - 1;
    rows[(next + rows.length) % rows.length]?.focus();
  }

  return (
    <div ref={box} className="menu-app" onKeyDown={onKey}>
      <button
        type="button"
        className="menu-item is-app"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          const current = box.current?.closest<HTMLElement>(".pf-retro")?.dataset.era;
          if (ERAS.some((item) => item.id === current)) setEra(current as Era);
          setOpen((value) => !value);
        }}
      >
        {name}
      </button>
      {open ? (
        <div className="menu-dropdown" role="menu" id={menuId}>
          <button type="button" role="menuitem" className="menu-row" onClick={() => go("sysinfo")}>
            <span className="menu-check" />
            {fmt(desk.words.about, { name })}
          </button>
          <button type="button" role="menuitem" className="menu-row" onClick={() => go("welcome")}>
            <span className="menu-check" />
            {desk.words.welcome}
          </button>
          <div className="menu-divider" role="separator" />
          <div className="menu-label">{desk.words.theme}</div>
          {ERAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={era === item.id}
              className="menu-row"
              onClick={() => pick(item.id)}
            >
              <span className="menu-check" aria-hidden>
                {era === item.id ? <Check size={12} /> : null}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Clock({ timezone, locale }: { timezone: string; locale: Locale }) {
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    let format: Intl.DateTimeFormat;
    try {
      format = new Intl.DateTimeFormat(intlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      });
    } catch {
      return;
    }
    const tick = () => setTime(format.format(new Date()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [timezone, locale]);
  return <span suppressHydrationWarning>{time}</span>;
}

const GLYPHS = {
  projects: LayoutDashboard,
  work: Briefcase,
  archive: Archive,
  sysinfo: Info,
  console: SquareTerminal,
} as const;

export function Dock({ items }: { items: { id: keyof typeof GLYPHS; label: string }[] }) {
  const desk = useDesk();
  return (
    <div className="dock-bar">
      <nav className="dock" aria-label={desk.words.dock}>
        {items.map((item, index) => {
          const Glyph = GLYPHS[item.id];
          return (
            <Fragment key={item.id}>
              {index > 0 && item.id === "sysinfo" ? <span className="dock-divider" /> : null}
              <button
                type="button"
                className="dock-item"
                aria-label={item.label}
                data-open={desk.states[item.id] !== "closed" ? "" : undefined}
                onClick={() => desk.open(item.id)}
              >
                <Glyph aria-hidden />
                <span className="dock-tip" aria-hidden>
                  {item.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}

// A list beside one open item, as the original's browsers; a grid too when cards are given.
export function Picker({
  label,
  searchLabel,
  prefix,
  rowClass,
  items,
  rows,
  panes,
  cards,
  filters,
  search = false,
}: {
  label: string;
  searchLabel: string;
  prefix: string;
  rowClass: string;
  items: { id: string; text: string; tags: string[] }[];
  rows: ReactNode[];
  panes: ReactNode[];
  cards?: ReactNode[];
  filters?: { id: string; label: string }[];
  search?: boolean;
}) {
  const { words: desk } = useDesk();
  const [selected, setSelected] = useState(items[0]?.id ?? "");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [grid, setGrid] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const words = query.trim().toLowerCase();
  const shown = items.filter(
    (item) =>
      (filter === "all" || item.tags.includes(filter)) && (!words || item.text.includes(words)),
  );
  const tools = (filters && filters.length > 1) || search || cards;

  function choose(id: string) {
    setSelected(id);
    setGrid(false);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const at = shown.findIndex((item) => item.id === selected);
    const next = shown[(at + (event.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length];
    if (!next) return;
    setSelected(next.id);
    list.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(next.id)}"]`)?.focus();
  }

  return (
    <div className="browser">
      {tools ? (
        <div className="toolbar">
          {filters && filters.length > 1
            ? filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="tb-btn"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))
            : null}
          {cards ? (
            <>
              {filters && filters.length > 1 ? <span className="tb-sep" /> : null}
              <button
                type="button"
                className="tb-btn"
                aria-pressed={!grid}
                aria-label={desk.listView}
                onClick={() => setGrid(false)}
              >
                <Columns2 aria-hidden />
              </button>
              <button
                type="button"
                className="tb-btn"
                aria-pressed={grid}
                aria-label={desk.gridView}
                onClick={() => setGrid(true)}
              >
                <LayoutGrid aria-hidden />
              </button>
            </>
          ) : null}
          <span className="tb-grow" />
          {search ? (
            <label className="tb-search">
              <Search aria-hidden />
              <span className="sr-only">{searchLabel}</span>
              <input
                type="search"
                placeholder={desk.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}
          {search ? (
            <span>
              {shown.length} / {items.length}
            </span>
          ) : null}
        </div>
      ) : null}
      {grid && cards ? (
        <div className="grid-view">
          {items.map((item, index) =>
            shown.includes(item) ? (
              <button key={item.id} type="button" className="card" onClick={() => choose(item.id)}>
                {cards[index]}
              </button>
            ) : null,
          )}
        </div>
      ) : null}
      <div className="browser-main" hidden={grid && Boolean(cards)}>
        <div
          ref={list}
          className="browser-side"
          role="tablist"
          aria-label={label}
          aria-orientation="vertical"
          onKeyDown={onKey}
        >
          {shown.length === 0 ? <p className="empty">{desk.nothing}</p> : null}
          {items.map((item, index) =>
            shown.includes(item) ? (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={rowClass}
                data-id={item.id}
                id={`${prefix}-tab-${index}`}
                aria-selected={selected === item.id}
                aria-controls={`${prefix}-pane-${index}`}
                tabIndex={selected === item.id ? 0 : -1}
                onClick={() => choose(item.id)}
              >
                {rows[index]}
              </button>
            ) : null,
          )}
        </div>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="browser-pane"
            role="tabpanel"
            id={`${prefix}-pane-${index}`}
            aria-labelledby={`${prefix}-tab-${index}`}
            hidden={selected !== item.id}
          >
            {panes[index]}
          </div>
        ))}
      </div>
    </div>
  );
}

// The console prints its session once, when it's first scrolled to.
export function Typed({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || still(node) || reduced()) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    node.dataset.wait = "";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        delete node.dataset.wait;
        node.dataset.typing = "";
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      delete node.dataset.wait;
    };
  }, []);
  return (
    <div ref={ref} className="console">
      {children}
    </div>
  );
}
