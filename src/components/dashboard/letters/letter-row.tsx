"use client";

import { Copy, Download, Ellipsis, ExternalLink, PanelsTopLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { copyText } from "@/components/studio/tailor/letter-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import type { Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { StatusIcon } from "../applications/status-menu";
import { formatDay } from "../applications/view";
import type { LetterEntry } from "./entries";

export type LetterRowProps = {
  entry: LetterEntry;
  // The resume it came from, by its title now (sourceTitle). "" when that isn't known.
  source: string;
  application: Application | null;
  now: number;
  // Only when there's a resume in this browser to open it with (studioTarget).
  canOpenInStudio: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onOpenInStudio: () => void;
  onDelete: () => void;
};

export function LetterRow({
  entry,
  source,
  application,
  now,
  canOpenInStudio,
  onOpen,
  onDownload,
  onOpenInStudio,
  onDelete,
}: LetterRowProps) {
  const titleId = useId();
  const letter = entry.kind === "letter";
  const name = entry.company || entry.role || (letter ? "Cover letter" : "Answer");
  const saved = entry.writingId !== null || entry.copyId !== null;
  const meta = [source ? `From “${source}”` : null, formatDay(entry.createdAt, now)]
    .filter(Boolean)
    .join(" · ");

  const items: MenuEntry[] = [
    ...(letter ? [{ label: "Download PDF", icon: Download, onSelect: onDownload }] : []),
    ...(canOpenInStudio
      ? [{ label: "Open in the studio", icon: PanelsTopLeft, onSelect: onOpenInStudio }]
      : []),
    ...(letter || canOpenInStudio ? ["separator" as const] : []),
    { label: "Delete", icon: Trash2, tone: "danger", onSelect: onDelete },
  ];

  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 id={titleId} className="truncate text-base/6 font-medium text-ink">
            {name}
          </h3>
          {entry.jobUrl ? (
            <a
              href={entry.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Job post for ${name} (opens in a new tab)`}
              className={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className: "-my-2 size-8 text-muted hover:text-ink",
              })}
            >
              <ExternalLink aria-hidden />
            </a>
          ) : null}
          <Badge className="shrink-0">{letter ? "Letter" : "Answer"}</Badge>
          {saved ? null : (
            <Badge variant="warn" className="shrink-0">
              Not saved
            </Badge>
          )}
          {application ? (
            <Link
              href={applicationHref(application.id)}
              aria-describedby={titleId}
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2 text-xs font-medium text-muted transition-colors hover:bg-surface-strong hover:text-ink"
            >
              <StatusIcon status={application.status} className="size-3.5" />
              {STATUS_NAMES[application.status]}
              <span className="sr-only">: open the application</span>
            </Link>
          ) : null}
        </div>
        {entry.company && entry.role ? (
          <p className="truncate text-sm/5 text-muted">{entry.role}</p>
        ) : null}
        {entry.question ? (
          <p className="mt-1 line-clamp-1 text-sm/6 text-muted">{entry.question}</p>
        ) : null}
        <p className="mt-1 text-xs/5 text-subtle">{meta}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" aria-describedby={titleId} onClick={onOpen}>
          Open
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={titleId}
          onClick={() => void copyText(entry.text, letter ? "letter" : "answer")}
        >
          <Copy aria-hidden />
          Copy
        </Button>
        <Menu
          label={`Actions for ${name}`}
          align="end"
          triggerLabel={`More actions for ${name}`}
          triggerClassName={buttonClasses({
            variant: "ghost",
            size: "icon-sm",
            className: "ml-auto text-muted hover:text-ink",
          })}
          trigger={<Ellipsis aria-hidden />}
          items={items}
        />
      </div>
    </li>
  );
}
