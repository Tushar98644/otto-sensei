"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

// Ported from codewithsadee/vcard-personal-portfolio (MIT, see ./LICENSE.txt): the page
// navigation, the sidebar's "Show contacts" and the portfolio filter.

export type CardPanel = { id: string; label: string; body: ReactNode };

export function Pages({ panels, label }: { panels: CardPanel[]; label: string }) {
  const [active, setActive] = useState(panels[0]?.id ?? "");
  const box = useRef<HTMLDivElement>(null);

  const open = (id: string) => {
    setActive(id);
    const top = box.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) box.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="main-content" ref={box}>
      <nav className="navbar" aria-label={label}>
        <ul className="navbar-list">
          {panels.map((panel) => (
            <li key={panel.id}>
              <button
                type="button"
                className="navbar-link"
                data-active={panel.id === active}
                aria-controls={`pf-card-${panel.id}`}
                aria-current={panel.id === active ? "page" : undefined}
                onClick={() => open(panel.id)}
              >
                {panel.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {panels.map((panel) => (
        <article
          key={panel.id}
          id={`pf-card-${panel.id}`}
          className="page"
          hidden={panel.id !== active}
          aria-label={panel.label}
        >
          {panel.body}
        </article>
      ))}
    </div>
  );
}

export function MoreInfo({
  children,
  show,
  hide,
}: {
  children: ReactNode;
  show: string;
  hide: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="info-more-btn"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{open ? hide : show}</span>
        <ChevronDown aria-hidden className="chev" />
      </button>
      <div className="sidebar-more" data-open={open}>
        <div>{children}</div>
      </div>
    </>
  );
}

export type FilterItem = { id: string; category: string; body: ReactNode };

export function Filtered({
  items,
  categories,
  all,
}: {
  items: FilterItem[];
  categories: string[];
  all: string;
}) {
  // null is "All", so a category spelled like the word never clashes with it.
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <>
      {categories.length > 1 ? (
        <ul className="filter-list">
          {[null, ...categories].map((category) => (
            <li key={category ?? ""}>
              <button
                type="button"
                data-active={category === chosen}
                aria-pressed={category === chosen}
                onClick={() => setChosen(category)}
              >
                {category ?? all}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="project-list">
        {items.map((item) => (
          <li
            key={item.id}
            className="project-item"
            hidden={chosen !== null && item.category !== chosen}
          >
            {item.body}
          </li>
        ))}
      </ul>
    </>
  );
}
