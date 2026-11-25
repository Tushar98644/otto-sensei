"use client";

import {
  Ellipsis,
  ExternalLink,
  MessagesSquare,
  PanelsTopLeft,
  PenLine,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import { nextStep, type ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { FollowUpChip } from "./follow-up-chip";
import { StatusMenu } from "./status-menu";
import { formatDay } from "../i18n";
import { applicationAnchor, prepHref } from "./view";
import { useStatusMenuCopy } from "./use-status-copy";

export type ApplicationRowProps = {
  application: Application;
  sent: string;
  now: number;
  onStatus: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function ApplicationRow({
  application,
  sent,
  now,
  onStatus,
  onEdit,
  onDelete,
}: ApplicationRowProps) {
  const t = useMessages("applications");
  const format = useFormat();
  const statusCopy = useStatusMenuCopy();
  const titleId = useId();
  const router = useRouter();
  const next = nextStep(application.status);
  const name = application.company;

  return (
    <li
      id={applicationAnchor(application.id)}
      className="flex scroll-mt-24 flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <h3 id={titleId} className="truncate text-base/6 font-medium text-ink">
            <Link
              href={applicationHref(application.id)}
              className="underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          </h3>
          {application.jobUrl ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fmt(t.row.jobPost, { name })}
              className={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className: "-my-2 size-8 text-muted hover:text-ink",
              })}
            >
              <ExternalLink aria-hidden />
            </a>
          ) : null}
        </div>
        {application.role ? (
          <p className="truncate text-sm/5 text-muted">{application.role}</p>
        ) : null}
        <p className="mt-1 text-xs/5 text-subtle">
          {fmt(t.row.appliedSent, { day: formatDay(format, application.appliedAt, now), sent })}
        </p>
        {application.notes ? (
          <p className="mt-1.5 line-clamp-2 text-sm/6 whitespace-pre-line text-muted">
            {application.notes}
          </p>
        ) : null}
        <div className="mt-1">
          <FollowUpChip application={application} now={now} describedBy={titleId} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusMenu
          application={application}
          onChange={(status) => onStatus(application, status)}
          copy={statusCopy}
        />
        {next ? (
          <Button
            variant="ghost"
            size="sm"
            aria-describedby={titleId}
            onClick={() => onStatus(application, next.status)}
          >
            {application.status === "applied" || application.status === "interview"
              ? t.next[application.status]
              : next.label}
          </Button>
        ) : null}
        <Link
          href={prepHref(application.id)}
          aria-describedby={titleId}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          <MessagesSquare aria-hidden />
          {t.row.prepare}
        </Link>
        <Menu
          label={fmt(t.row.actionsFor, { name })}
          align="end"
          triggerLabel={fmt(t.row.moreActionsFor, { name })}
          triggerClassName={buttonClasses({
            variant: "ghost",
            size: "icon-sm",
            className: "ml-auto text-muted hover:text-ink",
          })}
          trigger={<Ellipsis aria-hidden />}
          items={[
            {
              label: t.row.open,
              icon: PanelsTopLeft,
              onSelect: () => router.push(applicationHref(application.id)),
            },
            { label: t.row.edit, icon: PenLine, onSelect: () => onEdit(application) },
            "separator",
            {
              label: t.row.delete,
              icon: Trash2,
              tone: "danger",
              onSelect: () => onDelete(application),
            },
          ]}
        />
      </div>
    </li>
  );
}
