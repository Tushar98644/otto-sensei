"use client";

import {
  ArrowRight,
  CalendarDays,
  Ellipsis,
  ExternalLink,
  PanelsTopLeft,
  PenLine,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import type { Application } from "@/lib/applications/schema";
import { nextStep, type ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { cn } from "@/lib/utils";
import { FollowUpChip } from "./follow-up-chip";
import { StatusMenu } from "./status-menu";
import {
  applicationAnchor,
  formatDay,
  interviewLabel,
  prepareHref,
  upcomingInterview,
} from "./view";

export type ApplicationRowProps = {
  application: Application;
  sent: string | null;
  now: number;
  pro: boolean | null;
  onStatus: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

const PREPARE_LINK = "group/prep inline-flex items-center gap-1 font-medium text-ink pointer-coarse:min-h-11";
const PREPARE_LABEL =
  "underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out group-hover/prep:decoration-ink";

export function ApplicationRow({
  application,
  sent,
  now,
  pro,
  onStatus,
  onEdit,
  onDelete,
}: ApplicationRowProps) {
  const titleId = useId();
  const router = useRouter();
  const next = nextStep(application.status);
  const name = application.company;
  const interviewing = application.status === "interview";

  return (
    <li
      id={applicationAnchor(application.id)}
      className="flex scroll-mt-24 flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <h3 id={titleId} className="min-w-0 text-base/6 font-medium break-words text-ink">
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
          <p className="text-sm/5 text-pretty break-words text-muted">{application.role}</p>
        ) : null}
        {interviewing ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm/5">
            {application.interviewAt !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 tabular-nums",
                  upcomingInterview(application, now) ? "font-medium text-ink" : "text-muted",
                )}
              >
                <CalendarDays aria-hidden className="size-4 text-muted" />
                {interviewLabel(application.interviewAt, now)}
              </span>
            ) : null}
            {pro === false ? (
              <button
                type="button"
                aria-describedby={titleId}
                onClick={() => openFeaturePrompt("letter")}
                className={PREPARE_LINK}
              >
                <span className={PREPARE_LABEL}>Prepare</span>
                <ProMark />
              </button>
            ) : (
              <Link href={prepareHref(application)} aria-describedby={titleId} className={PREPARE_LINK}>
                <span className={PREPARE_LABEL}>{application.hasPrep ? "Open prep" : "Prepare"}</span>
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted transition-transform duration-150 ease-out group-hover/prep:translate-x-0.5"
                />
              </Link>
            )}
          </p>
        ) : null}
        <p className="mt-1 text-xs/5 text-subtle">
          Applied {formatDay(application.appliedAt, now || application.appliedAt)}
          {sent ? ` · Sent ${sent}` : ""}
        </p>
        {application.notes ? (
          <p className="mt-1.5 line-clamp-2 text-sm/6 whitespace-pre-line text-muted">
            {application.notes}
          </p>
        ) : null}
        <div className="mt-1 empty:hidden">
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
