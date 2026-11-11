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
import type { Application } from "@/lib/applications/schema";
import {
  APPLICATION_STATUSES,
  STATUS_HINTS,
  STATUS_NAMES,
  type ApplicationStatus,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

// Each status has its own icon shape as well as its word, so it never rests on color.
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

export function StatusMenu({
  application,
  onChange,
}: {
  application: Application;
  onChange: (status: ApplicationStatus) => void;
}) {
  const name = application.company || "this application";
  return (
    <Menu
      label={`Status for ${name}`}
      triggerLabel={`Status: ${STATUS_NAMES[application.status]}. Change the status for ${name}`}
      triggerClassName={buttonClasses({
        variant: "secondary",
        size: "sm",
        className: "min-w-32 justify-start",
      })}
      trigger={
        <>
          <StatusIcon status={application.status} />
          <span className="flex-1 text-left">{STATUS_NAMES[application.status]}</span>
          <ChevronDown aria-hidden className="text-muted" />
        </>
      }
      items={APPLICATION_STATUSES.map((status) => ({
        label: STATUS_NAMES[status],
        description: STATUS_HINTS[status],
        icon: STATUS_ICONS[status],
        checked: status === application.status,
        onSelect: () => {
          if (status !== application.status) onChange(status);
        },
      }))}
    />
  );
}
