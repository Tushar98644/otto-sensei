import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Note = { title: string; text: ReactNode };

// A row list of short notes: the title on the left, the text on the right from sm up.
export function NoteRows({
  notes,
  numbered = false,
  className,
}: {
  notes: readonly Note[];
  numbered?: boolean;
  className?: string;
}) {
  const List = numbered ? "ol" : "ul";
  return (
    <List role="list" className={cn("divide-y divide-border border-y border-border", className)}>
      {notes.map(({ title, text }, index) => (
        <li key={title} className="grid gap-2 py-6 sm:grid-cols-2 sm:gap-8">
          <h3 className="flex gap-3 text-lg/7 font-medium tracking-tight text-ink">
            {numbered ? (
              <span aria-hidden className="text-subtle tabular-nums">
                {index + 1}
              </span>
            ) : null}
            {title}
          </h3>
          <p className="max-w-prose text-base/7 text-pretty text-muted">{text}</p>
        </li>
      ))}
    </List>
  );
}
