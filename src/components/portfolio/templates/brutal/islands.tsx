"use client";

import { useEffect, useRef, useState } from "react";

// Ported from ElianCodes/brutal's back-to-top button (MIT, see ./LICENSE.txt).

const SHOW_AFTER = 250;

export function ToTop() {
  const [shown, setShown] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (button.current?.closest("[inert], [data-pf-still]")) return;
    const onScroll = () => setShown(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      ref={button}
      type="button"
      className="to-top"
      data-shown={shown}
      tabIndex={shown ? 0 : -1}
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
