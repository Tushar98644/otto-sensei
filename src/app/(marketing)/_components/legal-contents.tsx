"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export type ContentsEntry = { id: string; title: string };

// A little below where a heading lands after a jump (scroll-mt-24), so the jumped-to section counts as read.
const READ_LINE_PX = 128;
// A short last section may never reach the read line, so the pick holds while the jump's own scroll lands.
const JUMP_HOLD_MS = 600;

export function pickReading(
  tops: readonly { id: string; top: number }[],
  { atEnd }: { atEnd: boolean },
): string | null {
  if (atEnd) return tops.at(-1)?.id ?? null;
  let reading: string | null = null;
  for (const { id, top } of tops) if (top <= READ_LINE_PX) reading = id;
  return reading;
}

function useReadingSection(ids: readonly string[]) {
  const [reading, setReading] = useState<string | null>(null);
  const heldUntil = useRef(0);
  const key = ids.join(" ");

  useEffect(() => {
    const order = key.split(" ");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (performance.now() < heldUntil.current) return;
      const tops = order.flatMap((id) => {
        const heading = document.getElementById(id);
        return heading ? [{ id, top: heading.getBoundingClientRect().top }] : [];
      });
      const root = document.documentElement;
      const atEnd =
        window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2;
      setReading(pickReading(tops, { atEnd }));
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  function hold(id: string) {
    setReading(id);
    heldUntil.current = performance.now() + JUMP_HOLD_MS;
  }

  return { reading, hold };
}

export function LegalContents({ entries }: { entries: readonly ContentsEntry[] }) {
  const { reading, hold } = useReadingSection(entries.map((entry) => entry.id));

  function follow(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    // Folding the phone list before the jump keeps the heading where the browser scrolls it.
    event.currentTarget.closest("details")?.removeAttribute("open");
    hold(id);
  }

  return (
    <ol role="list" className="flex flex-col gap-0.5">
      {entries.map((entry) => {
        const current = entry.id === reading;
        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(event) => follow(event, entry.id)}
              aria-current={current ? "location" : undefined}
              className={cn(
                "flex min-h-9 items-center rounded-lg px-2.5 py-1.5 text-sm/5 transition-colors hover:bg-surface-muted hover:text-ink pointer-coarse:min-h-11",
                current ? "bg-surface-muted text-ink" : "text-muted",
              )}
            >
              {entry.title}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
