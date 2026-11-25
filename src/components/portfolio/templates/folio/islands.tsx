"use client";

import { ChevronLeft, Ellipsis, Search, SquarePen, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";

// Ported from alanagoyal/alanagoyal's Notes app (MIT, see ./LICENSE.txt).

export type NoteMeta = {
  id: string;
  emoji: string;
  title: string;
  pinned: boolean;
  preview: string;
  text: string;
};

function Lights() {
  return (
    <span className="lights" aria-hidden>
      <span className="light red" />
      <span className="light yellow" />
      <span className="light green" />
    </span>
  );
}

export type NotesWords = {
  notes: string;
  search: string;
  searchLabel: string;
  clear: string;
  empty: string;
  pinned: string;
  today: string;
  yesterday: string;
  week: string;
  month: string;
};

const DAY = 86_400_000;
const noSubscription = () => () => {};

function dayOf(time: number): number {
  const date = new Date(time);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthOf(locale: Locale, at: number, now?: number): string {
  const date = new Date(at);
  const month = formatFor(locale).date(date, { month: "long" });
  return now === undefined || date.getFullYear() === new Date(now).getFullYear()
    ? month
    : String(date.getFullYear());
}

// The original files notes under how long ago they changed, in the visitor's own calendar.
function groupNow(locale: Locale, words: NotesWords, at: number): string {
  const now = Date.now();
  const days = Math.round((dayOf(now) - dayOf(at)) / DAY);
  if (days <= 0) return words.today;
  if (days === 1) return words.yesterday;
  if (days <= 7) return words.week;
  if (days <= 30) return words.month;
  return monthOf(locale, at, now);
}

function matches(note: NoteMeta, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${note.title} ${note.text}`.toLowerCase().includes(needle);
}

export function NotesApp({
  notes,
  bodies,
  updatedAt,
  stamp,
  short,
  locale,
  words,
  footer,
}: {
  notes: NoteMeta[];
  bodies: ReactNode[];
  updatedAt: number | null;
  stamp: string;
  short: string;
  locale: Locale;
  words: NotesWords;
  footer?: ReactNode;
}) {
  const id = useId().replace(/[^\w-]/g, "");
  const group = useSyncExternalStore(
    noSubscription,
    () => (updatedAt === null ? words.notes : groupNow(locale, words, updatedAt)),
    () => (updatedAt === null ? words.notes : monthOf(locale, updatedAt)),
  );
  const [selected, setSelected] = useState(notes[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useRef<HTMLElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const still = useRef(true);

  // A still card or the editor's inert preview never takes key presses.
  useEffect(() => {
    still.current = Boolean(list.current?.closest("[inert], [data-pf-still]"));
  }, []);

  const searching = query.trim() !== "";
  const shown = notes.filter((note) => matches(note, query));
  const pinned = shown.filter((note) => note.pinned);
  const rest = shown.filter((note) => !note.pinned);

  const choose = (noteId: string) => {
    setSelected(noteId);
    setOpen(true);
    pane.current?.scrollTo({ top: 0 });
  };

  const onKey = (event: KeyboardEvent<HTMLUListElement>) => {
    if (still.current || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    const order = [...pinned, ...rest];
    const at = order.findIndex((note) => note.id === selected);
    const next = order[at + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    choose(next.id);
    list.current?.querySelector<HTMLElement>(`[data-note="${next.id}"]`)?.focus();
  };

  const item = (note: NoteMeta, index: number, all: NoteMeta[]) => {
    const active = note.id === selected;
    return (
      <li
        key={note.id}
        className={active ? "item active" : "item"}
        data-divider={index < all.length - 1 ? "" : undefined}
      >
        <button
          type="button"
          data-note={note.id}
          aria-current={active ? "true" : undefined}
          aria-controls={`${id}-${note.id}`}
          onClick={() => choose(note.id)}
        >
          <span className="item-title">
            {note.emoji} {note.title}
          </span>
          <span className="item-sub">
            {short ? <span className="item-date">{short}</span> : null}
            <span className="item-preview">{note.preview}</span>
          </span>
        </button>
      </li>
    );
  };

  const section = (label: string, items: NoteMeta[]) =>
    items.length > 0 ? (
      <section key={label}>
        <h3 className="group">{label}</h3>
        <ul onKeyDown={onKey}>{items.map((note, index) => item(note, index, items))}</ul>
      </section>
    ) : null;

  return (
    <div className="app" data-open={open ? "true" : "false"}>
      <aside className="sidebar">
        <div className="side-nav">
          <Lights />
          <span className="side-tools" aria-hidden>
            <Ellipsis />
            <SquarePen />
          </span>
        </div>
        <div className="side-scroll">
          <div className="search">
            <Search className="search-icon" aria-hidden />
            <input
              type="search"
              placeholder={words.search}
              aria-label={words.searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {searching ? (
              <button
                type="button"
                className="search-clear"
                aria-label={words.clear}
                onClick={() => setQuery("")}
              >
                <X aria-hidden />
              </button>
            ) : null}
          </div>
          <nav ref={list} className="list" aria-label={words.notes}>
            {shown.length === 0 ? (
              <p className="empty">{words.empty}</p>
            ) : searching ? (
              <ul onKeyDown={onKey}>{shown.map((note, index) => item(note, index, shown))}</ul>
            ) : (
              <>
                {section(words.pinned, pinned)}
                {section(group, rest)}
              </>
            )}
          </nav>
          {footer ? <div className="credit">{footer}</div> : null}
        </div>
      </aside>
      <div ref={pane} className="pane">
        <button type="button" className="back" onClick={() => setOpen(false)}>
          <ChevronLeft aria-hidden />
          <span>{words.notes}</span>
        </button>
        {notes.map((note, index) => (
          <article
            key={note.id}
            id={`${id}-${note.id}`}
            className="note"
            hidden={note.id !== selected}
            aria-labelledby={`${id}-${note.id}-title`}
          >
            {stamp ? <p className="stamp">{stamp}</p> : null}
            <h2 className="note-title" id={`${id}-${note.id}-title`}>
              <span className="note-emoji" aria-hidden>
                {note.emoji}
              </span>
              {note.title}
            </h2>
            <div className="body">{bodies[index]}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
