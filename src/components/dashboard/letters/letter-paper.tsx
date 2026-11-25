"use client";

import { useId, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { intlTagOf, type ContentLang } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

const LONG_DAY: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

// The letter's date in the letter's own language; English keeps the US form.
export function longDay(at: number, lang: ContentLang = "en"): string {
  const tag = lang === "en" ? "en-US" : intlTagOf(lang);
  return new Intl.DateTimeFormat(tag, LONG_DAY).format(at);
}

// Set like the page it prints as: serif, generous margins, a second sheet resting under it.
export function Paper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute inset-x-3 top-2 -bottom-2 rotate-[0.8deg] rounded-xs bg-surface shadow-page sm:inset-x-6"
      />
      <div className="relative rounded-xs bg-surface px-5 py-7 shadow-page-lift has-focus-visible:ring-2 has-focus-visible:ring-ink/10 sm:px-12 sm:py-12 lg:px-14 lg:py-14">
        {children}
      </div>
    </div>
  );
}

export function PaperHead({ name, contact, day }: { name: string; contact: string; day?: string }) {
  return (
    <div className="flex flex-col">
      {name ? (
        <p className="font-display text-[1.75rem]/9 tracking-tight text-ink sm:text-3xl/10">
          {name}
        </p>
      ) : null}
      {contact ? (
        <p className="mt-1 text-xs/5 tracking-wide text-pretty text-muted">{contact}</p>
      ) : null}
      {name || contact ? <span aria-hidden className="mt-5 block h-px bg-border" /> : null}
      {day ? <p className="mt-5 text-sm/6 text-muted tabular-nums">{day}</p> : null}
    </div>
  );
}

const BODY =
  "rounded-none border-0 bg-transparent p-0 font-display text-[1.1875rem]/8 text-pretty text-ink focus-visible:ring-0 sm:text-[1.1875rem]/8";

// The page itself is the editor: what's typed is what gets copied and downloaded.
export function PaperBody({
  label,
  value,
  maxLength,
  onChange,
  onSettle,
  className,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  onSettle: () => void;
  className?: string;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Textarea
        id={id}
        autoResize
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSettle}
        className={cn(BODY, className)}
      />
    </>
  );
}

export function PaperLine({
  label,
  value,
  maxLength,
  onChange,
  onSettle,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  onSettle: () => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSettle}
        className="w-full border-0 bg-transparent p-0 text-base/7 font-semibold text-ink outline-hidden"
      />
    </div>
  );
}
