"use client";

import {
  ChevronRight,
  Copy,
  Download,
  Ellipsis,
  MessageSquareText,
  PanelsTopLeft,
  PenLine,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { copyText } from "@/components/ui/copy-text";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import { applicationHref } from "@/lib/applications/thread";
import { cn } from "@/lib/utils";
import type { WritingKind } from "@/lib/writings/schema";
import { StatusIcon } from "../applications/status-menu";
import { formatDay } from "../i18n";
import { KIND_NAMES, type LetterEntry } from "./entries";
import { QuickActions, type QuickState } from "./quick-actions";
import { asEmail, type LetterGroup } from "./ready";

const BAR = "block h-0.75 rounded-full bg-surface-strong";
const PANEL = "rounded-2xl bg-surface shadow-[0_1px_2px_rgb(18_36_29/0.04)] ring-1 ring-ink/4";

// A tiny page for a letter or an answer, an envelope for a message.
function Sheet({ kind }: { kind: WritingKind }) {
  if (kind === "outreach") {
    return (
      <span
        aria-hidden
        className="relative mt-1 block h-9 w-12 shrink-0 overflow-hidden rounded-[3px] bg-surface shadow-page"
      >
        <svg viewBox="0 0 48 36" className="absolute inset-0 size-full text-border-strong/55">
          <path d="M2 3 L24 20 L46 3" fill="none" stroke="currentColor" strokeWidth={1.25} />
        </svg>
        <span className="absolute top-1 right-1 size-2.5 rounded-[2px] border border-dashed border-otter/50 bg-otter-light" />
      </span>
    );
  }
  const Icon = kind === "answer" ? MessageSquareText : PenLine;
  return (
    <span
      aria-hidden
      className="relative block h-14 w-11 shrink-0 rounded-[3px] bg-surface px-1.5 pt-2 shadow-page"
    >
      <span className={cn(BAR, "w-1/2 bg-ink/20")} />
      <span className={cn(BAR, "mt-1.5 w-full")} />
      <span className={cn(BAR, "mt-1 w-11/12")} />
      <span className={cn(BAR, "mt-1 w-4/5")} />
      <span className={cn(BAR, "mt-1 w-full")} />
      <span className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full bg-surface text-muted shadow-control ring-1 ring-ink/8">
        <Icon className="size-3" />
      </span>
    </span>
  );
}

// The opening words after the greeting, so each piece is recognisable at a glance.
export function excerpt(entry: Pick<LetterEntry, "kind" | "text" | "outreach">): string {
  if (entry.kind === "outreach" && entry.outreach?.subject.trim())
    return entry.outreach.subject.trim();
  const blocks = entry.text
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const first = blocks[0] ?? "";
  const greeting =
    blocks.length > 1 && first.length < 60 && /^(dear|hi|hello|to)\b|,$/i.test(first);
  return (greeting ? blocks[1] : first) ?? "";
}

export type LetterGroupCardProps = {
  group: LetterGroup;
  application: Application | null;
  now: number;
  index: number;
  sourceFor: (entry: LetterEntry) => string;
  canOpenInStudio: (entry: LetterEntry) => boolean;
  subjectFor: (entry: LetterEntry) => string;
  quick: { state: QuickState; letter: boolean; outreachKey: string | null } | null;
  onOpen: (key: string) => void;
  onPdf: (entry: LetterEntry) => void;
  onOpenInStudio: (entry: LetterEntry) => void;
  onDelete: (entry: LetterEntry) => void;
  onWrite: (kind: WritingKind, extra?: { question?: string; post?: string }) => void;
  onDismiss: () => void;
};

export function LetterGroupCard({
  group,
  application,
  now,
  index,
  sourceFor,
  canOpenInStudio,
  subjectFor,
  quick,
  onOpen,
  onPdf,
  onOpenInStudio,
  onDelete,
  onWrite,
  onDismiss,
}: LetterGroupCardProps) {
  const { group: words } = useMessages("letters");
  const { statuses } = useMessages("applications");
  const titleId = useId();
  const company = group.company;
  const heading = company || group.role || words.other;

  return (
    <li
      className="motion-safe:animate-fade-in"
      style={index < 6 ? ({ animationDelay: `${index * 50}ms` } as CSSProperties) : undefined}
    >
      <section aria-labelledby={titleId} className={cn(PANEL, "flex flex-col gap-3 p-4 sm:p-5")}>
        <header className="flex gap-3 sm:gap-4">
          <CompanyMark name={company} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            {company && group.role ? (
              <p className="pt-0.5 text-sm/5 font-medium text-pretty text-muted">{company}</p>
            ) : null}
            <h3
              id={titleId}
              className="mt-0.5 text-lg/6 font-semibold tracking-tight text-pretty text-ink"
            >
              {company && group.role ? group.role : heading}
            </h3>
            {application ? (
              <div className="mt-2 flex">
                <Link
                  href={applicationHref(application.id)}
                  aria-describedby={titleId}
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-muted px-2 text-xs font-medium text-muted transition-colors hover:bg-surface-strong hover:text-ink"
                >
                  <StatusIcon status={application.status} className="size-3.5" />
                  {statuses[application.status]}
                  <span className="sr-only">{words.openApplication}</span>
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <ul className="flex flex-col gap-1.5">
          {group.entries.map((entry) => (
            <GroupItem
              key={entry.key}
              entry={entry}
              now={now}
              source={sourceFor(entry)}
              studio={canOpenInStudio(entry)}
              subject={subjectFor(entry)}
              onOpen={() => onOpen(entry.key)}
              onPdf={() => onPdf(entry)}
              onOpenInStudio={() => onOpenInStudio(entry)}
              onDelete={() => onDelete(entry)}
            />
          ))}
        </ul>

        {quick ? (
          <div className="border-t border-border pt-4">
            <QuickActions
              name={heading}
              describedBy={titleId}
              state={quick.state}
              letter={quick.letter}
              outreachKey={quick.outreachKey}
              primary={false}
              onWrite={onWrite}
              onOpen={onOpen}
              onDismiss={onDismiss}
            />
          </div>
        ) : null}
      </section>
    </li>
  );
}

function GroupItem({
  entry,
  now,
  source,
  studio,
  subject,
  onOpen,
  onPdf,
  onOpenInStudio,
  onDelete,
}: {
  entry: LetterEntry;
  now: number;
  source: string;
  studio: boolean;
  subject: string;
  onOpen: () => void;
  onPdf: () => void;
  onOpenInStudio: () => void;
  onDelete: () => void;
}) {
  const t = useMessages("letters");
  const words = t.group;
  const format = useFormat();
  const titleId = useId();
  const kind = KIND_NAMES[entry.kind];
  const letter = entry.kind === "letter";
  const saved = entry.writingId !== null || entry.copyId !== null;
  const line = excerpt(entry);
  const title = entry.kind === "answer" && entry.question ? entry.question : t.kinds[entry.kind];
  const meta = [
    formatDay(format, entry.createdAt, now),
    source ? fmt(words.from, { source }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const copyMain = () =>
    entry.kind === "outreach"
      ? void copyText(asEmail(entry.outreach?.subject ?? "", entry.text), "email")
      : void copyText(entry.text, kind.copy);

  const items: MenuEntry[] = [
    ...(letter
      ? [
          {
            label: words.copyAsEmail,
            icon: Send,
            onSelect: () => void copyText(asEmail(subject, entry.text), "email"),
          },
          { label: words.download, icon: Download, onSelect: onPdf },
        ]
      : []),
    ...(entry.kind === "outreach" && entry.outreach?.note
      ? [
          {
            label: words.copyNote,
            icon: Copy,
            onSelect: () => void copyText(entry.outreach?.note ?? "", "note"),
          },
        ]
      : []),
    ...(studio ? [{ label: words.openStudio, icon: PanelsTopLeft, onSelect: onOpenInStudio }] : []),
    "separator",
    { label: words.delete, icon: Trash2, tone: "danger", onSelect: onDelete },
  ];

  return (
    <li className="group/item relative flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-hover has-focus-visible:bg-surface-hover sm:gap-4 sm:p-3">
      <Sheet kind={entry.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            <button
              type="button"
              id={titleId}
              onClick={onOpen}
              className="text-left text-sm/6 font-medium text-pretty text-ink outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ink"
            >
              {title}
            </button>
            {saved ? null : (
              <Badge variant="warn" className="shrink-0">
                {words.notSaved}
              </Badge>
            )}
          </p>
          <div className="relative z-10 -mr-1 flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-describedby={titleId}
              aria-label={entry.kind === "outreach" ? words.copyEmail : t.copyKind[entry.kind]}
              onClick={copyMain}
              className={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted hover:text-ink",
              })}
            >
              <Copy aria-hidden />
            </button>
            <Menu
              label={fmt(words.actionsFor, { title })}
              align="end"
              triggerLabel={fmt(words.moreActionsFor, { title })}
              triggerClassName={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted hover:text-ink",
              })}
              trigger={<Ellipsis aria-hidden />}
              items={items}
            />
            <ChevronRight
              aria-hidden
              className="size-4 text-subtle transition-transform duration-200 group-hover/item:translate-x-0.5 max-sm:hidden"
            />
          </div>
        </div>
        {line ? (
          <p className="mt-0.5 line-clamp-3 max-w-[62ch] font-display text-base/6 text-pretty text-muted sm:line-clamp-2">
            {line}
          </p>
        ) : null}
        <p className="mt-1 text-xs/5 text-subtle">{meta}</p>
      </div>
    </li>
  );
}
