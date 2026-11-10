"use client";

import { Ellipsis, ExternalLink, MessagesSquare, PanelsTopLeft, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import type { Application } from "@/lib/applications/schema";
import { nextStep, type ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { FollowUpChip } from "./follow-up-chip";
import { StatusMenu } from "./status-menu";
import { applicationAnchor, formatDay, prepHref } from "./view";

export type ApplicationRowProps = {
  application: Application;
  // "“PM at Stripe”", "“Old title” (deleted)" or "a resume not in Otto".
  sent: string;
  now: number;
  onStatus: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

// One job: who and what on the left; the status, the likely next step and the rest on the right.
export function ApplicationRow({
  application,
  sent,
  now,
  onStatus,
  onEdit,
  onDelete,
}: ApplicationRowProps) {
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
            <Link href={applicationHref(application.id)} className="underline-offset-4 hover:underline">
              {name}
            </Link>
          </h3>
          {application.jobUrl ? (
            <a
              href={application.jobUrl}
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
        </div>
        {application.role ? (
          <p className="truncate text-sm/5 text-muted">{application.role}</p>
        ) : null}
        <p className="mt-1 text-xs/5 text-subtle">
          Applied {formatDay(application.appliedAt, now)} · Sent {sent}
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
        />
        {next ? (
          <Button
            variant="ghost"
            size="sm"
            aria-describedby={titleId}
            onClick={() => onStatus(application, next.status)}
          >
            {next.label}
          </Button>
        ) : null}
        <Link
          href={prepHref(application.id)}
          aria-describedby={titleId}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          <MessagesSquare aria-hidden />
          Prepare
        </Link>
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
          items={[
            {
              label: "Open application",
              icon: PanelsTopLeft,
              onSelect: () => router.push(applicationHref(application.id)),
            },
            { label: "Edit details", icon: PenLine, onSelect: () => onEdit(application) },
            "separator",
            {
              label: "Delete",
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
