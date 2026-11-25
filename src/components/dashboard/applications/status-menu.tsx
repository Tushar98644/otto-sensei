"use client";

import {
  ChevronDown,
  CircleCheck,
  CircleX,
  Hourglass,
  MailX,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import {
  APPLICATION_STATUSES,
  STATUS_HINTS,
  STATUS_NAMES,
  type ApplicationStatus,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

export const STATUS_ICONS: Record<ApplicationStatus, LucideIcon> = {
  applied: Hourglass,
  interview: UsersRound,
  offer: CircleCheck,
  rejected: CircleX,
  no_reply: MailX,
};

export function StatusIcon({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const Icon = STATUS_ICONS[status];
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", status === "offer" ? "text-pass" : "text-muted", className)}
    />
  );
}

export type StatusMenuCopy = {
  statuses: Record<ApplicationStatus, string>;
  hints: Record<ApplicationStatus, string>;
  label: string;
  trigger: string;
  thisApplication: string;
};

// The studio has no messages provider yet, so it reads these; the dashboard passes its own.
const englishCopy: StatusMenuCopy = {
  statuses: STATUS_NAMES,
  hints: STATUS_HINTS,
  label: "Status for {name}",
  trigger: "Status: {status}. Change the status for {name}",
  thisApplication: "this application",
};

export function StatusMenu({
  application,
  onChange,
  copy = englishCopy,
}: {
  application: Application;
  onChange: (status: ApplicationStatus) => void;
  copy?: StatusMenuCopy;
}) {
  const name = application.company || copy.thisApplication;
  const current = copy.statuses[application.status];
  return (
    <Menu
      label={fmt(copy.label, { name })}
      triggerLabel={fmt(copy.trigger, { status: current, name })}
      triggerClassName={buttonClasses({
        variant: "secondary",
        size: "sm",
        className: "min-w-32 justify-start",
      })}
      trigger={
        <>
          <StatusIcon status={application.status} />
          <span className="flex-1 text-left">{current}</span>
          <ChevronDown aria-hidden className="text-muted" />
        </>
      }
      items={APPLICATION_STATUSES.map((status) => ({
        label: copy.statuses[status],
        description: copy.hints[status],
        icon: STATUS_ICONS[status],
        checked: status === application.status,
        onSelect: () => {
          if (status !== application.status) onChange(status);
        },
      }))}
    />
  );
}
