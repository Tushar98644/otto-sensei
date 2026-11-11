"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type HowItWorksNavItem = { id: string; name: string };

export function HowItWorksNav({
  items,
  className,
}: {
  items: readonly HowItWorksNavItem[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const idsKey = items.map((item) => item.id).join(" ");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = idsKey.split(" ");
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => ids.indexOf(a.target.id) - ids.indexOf(b.target.id))[0];
        if (hit) setActiveId(hit.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [idsKey]);

  return (
    // role="list" keeps list semantics in Safari, which drops them from lists without bullets.
    <ol role="list" className={cn("flex flex-col gap-1", className)}>
      {items.map((item, index) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-4 rounded-lg text-base hover:text-ink",
                active ? "font-medium text-ink" : "text-muted",
              )}
            >
              <span className="w-4 text-sm font-normal text-subtle tabular-nums">{index + 1}</span>
              <span>{item.name}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
