"use client";

import { ArrowRight, MessageSquareText, PenLine, Send, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { BRAND } from "@/config/brand";
import { FolderCard } from "@/components/ui/folder-card";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { WritingKind } from "@/lib/writings/schema";
import { LettersArt } from "./letters-art";

// Otto's scene beside his words, the way Home's Up next and Jobs' matches sit.
export function LettersFolder({
  tab,
  tabEnd,
  meta,
  title,
  detail,
  children,
}: {
  tab: string;
  tabEnd?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <FolderCard
      tab={tab}
      tabEnd={tabEnd}
      bodyClassName="p-2"
      className="motion-safe:animate-fade-in"
    >
      <div className="group/otto grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col items-start gap-4 px-3 pt-4 pb-3 sm:justify-center sm:px-5 sm:py-6 lg:px-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm/5 text-subtle">
              <span className="font-medium text-ink">{BRAND.mascotName}</span>
              {meta ? <> · {meta}</> : null}
            </p>
            <h2 className="font-display text-2xl/8 tracking-tight text-pretty text-ink sm:text-3xl/9">
              {title}
            </h2>
            {detail ? (
              <p className="max-w-prose text-sm/6 text-pretty text-muted">{detail}</p>
            ) : null}
          </div>
          {children ? (
            <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:flex-1">{children}</div>
          ) : null}
        </div>
        <LettersArt className="max-sm:order-first sm:h-full sm:min-h-44" />
      </div>
    </FolderCard>
  );
}

type Path = { kind: WritingKind; fresh: boolean; icon: LucideIcon };

const PATHS: readonly Path[] = [
  { kind: "letter", fresh: true, icon: PenLine },
  { kind: "answer", fresh: false, icon: MessageSquareText },
  { kind: "outreach", fresh: false, icon: Send },
];

const TILE =
  "group/tile grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl bg-surface p-3 text-left shadow-card ring-1 ring-ink/6 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-page-lift active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 md:grid-cols-[minmax(0,1fr)_auto] md:content-start md:gap-y-4 md:p-4";

// Every other way in, each opening the writer with what the app knows already filled in.
export function OtherPaths({
  headingId,
  disabled,
  onPick,
}: {
  headingId: string;
  disabled: boolean;
  onPick: (kind: WritingKind, fresh: boolean) => void;
}) {
  const { paths } = useMessages("letters");
  const words = {
    letter: { title: paths.letterTitle, detail: paths.letterDetail },
    answer: { title: paths.answerTitle, detail: paths.answerDetail },
    outreach: { title: paths.outreachTitle, detail: paths.outreachDetail },
  };
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="px-1 font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
      >
        {paths.heading}
      </h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {PATHS.map((path, index) => (
          <li
            key={path.kind}
            className="motion-safe:animate-fade-in"
            style={{ animationDelay: `${120 + index * 60}ms` } as CSSProperties}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(path.kind, path.fresh)}
              className={TILE}
            >
              <span
                aria-hidden
                className="flex size-10 items-center justify-center self-start rounded-lg bg-surface-muted text-ink md:col-start-1 md:row-start-1"
              >
                <path.icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 md:col-span-2 md:row-start-2">
                <span className="text-sm/6 font-medium text-pretty text-ink">
                  {words[path.kind].title}
                </span>
                <span className="text-sm/5 text-pretty text-muted">{words[path.kind].detail}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-muted transition duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:bg-surface-muted group-hover/tile:text-ink",
                  "md:col-start-2 md:row-start-1 md:self-center",
                )}
              >
                <ArrowRight className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
