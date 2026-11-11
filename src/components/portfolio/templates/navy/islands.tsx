"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type CSSProperties } from "react";

// Navy's interactive parts, after bchiang7/v4 (MIT). Each renders the same markup on the server,
// so the page reads fine before it hydrates.

/** Sets data-top and data-direction on the header it sits in, for the hide-on-scroll styles. */
export function NavScroll() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const header = ref.current?.closest("header");
    if (!header) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      header.dataset.top = String(y < 50);
      // A few pixels of wobble shouldn't flip the header.
      if (Math.abs(y - last) < 5) return;
      header.dataset.direction = y > last ? "down" : "up";
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <span ref={ref} hidden />;
}

export type NavLink = { href: string; label: string };

export function NavMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = button.current?.closest<HTMLElement>(".pf-navy");
    if (!root) return;
    if (open) root.dataset.menu = "open";
    else delete root.dataset.menu;
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="menu">
      <button
        ref={button}
        type="button"
        className="ham"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ham-box">
          <span className="ham-box-inner" />
        </span>
      </button>
      <aside className="sidebar" data-open={open} aria-hidden={!open}>
        <nav>
          <ol>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </div>
  );
}

export type NavyJob = {
  id: string;
  tab: string;
  title: string;
  company: string;
  href: string | null;
  range: string;
  lines: string[];
};

export function JobTabs({ jobs }: { jobs: NavyJob[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);

  // v4 slides the highlight by a fixed tab size; long company names make tabs taller (wrapped)
  // or wider (the phone strip), so it follows the active tab's real box instead.
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => {
      const tab = tabs.current[active];
      if (!tab) return;
      const inset = Number.parseFloat(getComputedStyle(element).paddingLeft) || 0;
      element.style.setProperty("--hl-x", `${tab.offsetLeft - inset}px`);
      element.style.setProperty("--hl-y", `${tab.offsetTop}px`);
      element.style.setProperty("--hl-w", `${tab.offsetWidth}px`);
      element.style.setProperty("--hl-h", `${tab.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);

  const focusTab = (index: number) => {
    const next = (index + jobs.length) % jobs.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(active - 1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(active + 1);
    }
  };

  return (
    <div className="inner">
      <div
        ref={list}
        className="tablist"
        role="tablist"
        aria-label="Job tabs"
        onKeyDown={onKeyDown}
        style={{ "--active": active } as CSSProperties}
      >
        {jobs.map((job, index) => (
          <button
            key={job.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            className="tab"
            id={`pf-navy-tab-${index}`}
            role="tab"
            tabIndex={active === index ? 0 : -1}
            aria-selected={active === index}
            aria-controls={`pf-navy-panel-${index}`}
            onClick={() => setActive(index)}
          >
            <span>{job.tab}</span>
          </button>
        ))}
        <div className="highlight" />
      </div>
      <div className="panels">
        {jobs.map((job, index) => (
          <div
            key={job.id}
            id={`pf-navy-panel-${index}`}
            className="panel"
            role="tabpanel"
            tabIndex={active === index ? 0 : -1}
            aria-labelledby={`pf-navy-tab-${index}`}
            hidden={active !== index}
          >
            <h3>
              <span>{job.title}</span>
              {job.company && job.title ? (
                <span className="company">
                  &nbsp;@&nbsp;
                  {job.href ? (
                    <a
                      href={job.href}
                      className="inline-link"
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                    >
                      {job.company}
                    </a>
                  ) : (
                    job.company
                  )}
                </span>
              ) : null}
            </h3>
            {job.range ? <p className="range">{job.range}</p> : null}
            {job.lines.length > 0 ? (
              <ul className="fancy-list">
                {job.lines.map((line, lineIndex) => (
                  <li key={lineIndex}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShowMore() {
  const [more, setMore] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const grid = ref.current?.previousElementSibling;
    if (grid instanceof HTMLElement) grid.dataset.more = String(more);
  }, [more]);
  return (
    <button
      ref={ref}
      type="button"
      className="btn more-button"
      aria-expanded={more}
      onClick={() => setMore((value) => !value)}
    >
      Show {more ? "Less" : "More"}
    </button>
  );
}
