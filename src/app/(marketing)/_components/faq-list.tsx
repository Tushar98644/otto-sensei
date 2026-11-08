import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FaqItem = { question: string; answer: ReactNode };

// Native <details>: keyboard, screen reader and find-in-page support with zero JavaScript. Plain
// rows split by hairlines, no box around them.
export function FaqList({ items, className }: { items: readonly FaqItem[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-5 font-display text-2xl/8 text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <Plus
              aria-hidden
              className="size-5 shrink-0 text-muted transition-transform group-open:rotate-45"
            />
          </summary>
          <div className="max-w-prose pb-6 text-base/7 text-muted">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
