"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Lazy, lazyComponent } from "@/components/ui/lazy";

// The notes sit in a closed fold, so their table loads when idle or when it opens.
const hiringSystemsNotes = lazyComponent(() =>
  import("./hiring-systems-notes").then((m) => m.HiringSystemsNotes),
);

export function HiringSystemsPanel() {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="group rounded-2xl bg-surface"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-ink hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
          aria-hidden
        />
        How common hiring systems read files
      </summary>
      <div className="px-4 pb-4">
        <p className="text-sm/6 text-pretty text-muted">
          From each company&apos;s own help pages. Every employer sets its system up a little
          differently.
        </p>
        <Lazy loader={hiringSystemsNotes} wanted={opened} props={{}} />
      </div>
    </details>
  );
}
