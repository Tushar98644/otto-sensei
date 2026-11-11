"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

// The command menu of BartoszJarocki/cv (MIT). A native <dialog> stands in for Radix Dialog and
// cmdk, so the page ships no extra libraries.

export type CommandLink = { label: string; href: string };

const noSubscribe = () => () => {};

export function CommandMenu({ links }: { links: readonly CommandLink[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  // "⌘" on a Mac, "Ctrl" elsewhere; the server can't know, so it writes "Ctrl".
  const mac = useSyncExternalStore(
    noSubscribe,
    () => window.navigator.userAgent.includes("Mac"),
    () => false,
  );

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key !== "j" || !(event.metaKey || event.ctrlKey)) return;
      const box = dialog.current;
      // A preview (the editor's inert column, a template thumbnail) never opens a modal over the app.
      if (!box || box.closest("[inert], [data-pf-still]")) return;
      event.preventDefault();
      if (box.open) box.close();
      else {
        setQuery("");
        box.showModal();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? links.filter((link) => link.label.toLowerCase().includes(needle)) : links;
  }, [links, query]);
  const showPrint = !query.trim() || "print".includes(query.trim().toLowerCase());

  const close = () => dialog.current?.close();

  return (
    <>
      <p className="hint">
        Press{" "}
        <kbd>
          <span>{mac ? "⌘" : "Ctrl"}</span>+J
        </kbd>{" "}
        to open the command menu
      </p>
      <dialog
        ref={dialog}
        className="cmd"
        aria-label="Command menu"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="cmd-search">
          <Search aria-hidden />
          <input
            placeholder="Type a command or search..."
            aria-label="Search commands and links"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div className="cmd-list">
          {!showPrint && shown.length === 0 ? <p className="cmd-empty">No results found.</p> : null}
          {showPrint ? (
            <div className="cmd-group">
              <p>Actions</p>
              <button
                type="button"
                className="cmd-item"
                onClick={() => {
                  flushSync(close);
                  window.print();
                }}
              >
                Print
              </button>
            </div>
          ) : null}
          {shown.length > 0 ? (
            <div className="cmd-group">
              <p>Links</p>
              {shown.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  className="cmd-item"
                  onClick={() => {
                    close();
                    window.open(link.href, "_blank", "noopener,noreferrer");
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className="cmd-close" onClick={close}>
          <X aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </dialog>
    </>
  );
}
