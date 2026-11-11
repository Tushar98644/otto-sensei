"use client";

import { ArrowRight } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FixFirstEntry = {
  key: string;
  title: string;
  reason: string;
  action?: { label: string; onClick: () => void };
};

export type FixFirstProps = {
  items: readonly FixFirstEntry[];
  title?: string;
  description?: string;
  // Shown instead of the list when there is nothing to do first.
  empty?: ReactNode;
  id?: string;
  className?: string;
};

// The short "do these first" list at the top of the Recruiter view and Tailor: at most three
// numbered items, each one plain reason and one way to act on it. Everything else stays further
// down, grouped, so the first screen answers "what now?" without scrolling.
export function FixFirst({
  items,
  title = "Fix these first",
  description,
  empty,
  id,
  className,
}: FixFirstProps) {
  const headingId = useId();
  return (
    <Card id={id} className={cn("scroll-mt-24", className)}>
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        <CardHeader>
          <CardTitle as="h2" id={headingId} className="text-base/6 font-semibold">
            {title}
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        {items.length === 0 ? (
          empty
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {items.map((item, index) => (
              <li
                key={item.key}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-ink tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm/6 font-medium text-pretty text-ink">{item.title}</p>
                    <p className="text-sm/6 text-pretty text-muted">{item.reason}</p>
                  </div>
                </div>
                {item.action ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={item.action.onClick}
                    className="shrink-0 self-start max-sm:ml-9"
                  >
                    {item.action.label}
                    <ArrowRight />
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Card>
  );
}
